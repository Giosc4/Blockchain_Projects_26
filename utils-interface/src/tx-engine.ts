/**
 * tx-engine.ts - TRANSACTION EXECUTION ENGINE
 *
 * This module manages direct interaction with the IOTA blockchain via the SDK.
 * It builds transaction bytes, signs them (if necessary), and executes calls
 * (real or simulated). It also includes BCS decoding logic to interpret
 * Move function return values.
 *
 * COMMUNICATION:
 * - Called by 'main.ts' and 'doc-manager.ts' for sending transactions.
 * - Uses 'ui-interface.ts' to update the technical details panel (JSON).
 */
import { Transaction } from "@iota/iota-sdk/transactions";
import { IotaClient } from "@iota/iota-sdk/client";
import { Ed25519Keypair } from "@iota/iota-sdk/keypairs/ed25519";
import { showTxDetails } from "./ui-interface";

export interface TxResult {
  success: boolean;
  result?: string;
  error?: string;
  digest?: string;
}

/**
 * Executes a transaction in SIMULATION mode (devInspect).
 * Does not require a signature, consumes no gas, and does not modify the blockchain state.
 * Useful for testing Move function logic and retrieving return values.
 *
 * @param tx The Transaction object to simulate.
 * @param client The IotaClient for RPC connection.
 * @param walletAddress The sender's address (used for object ownership resolution).
 * @returns A TxResult object containing the outcome and decoded values.
 */
export async function executeSimulated(
  tx: Transaction,
  client: IotaClient,
  walletAddress: string,
): Promise<TxResult> {
  try {
    tx.setSender(walletAddress);
    // Builds transaction bytes (onlyTransactionKind for simulation)
    const bytes = await tx.build({ client, onlyTransactionKind: true });

    // Sends the transaction to the node for inspection
    const res = await client.devInspectTransactionBlock({
      transactionBlock: bytes,
      sender: walletAddress,
    });

    // Displays technical details in the technical panel (JSON)
    showTxDetails(res);

    // Checks if the simulation failed at the Move level
    if (res.effects.status.status === "failure") {
      return { success: false, error: res.effects.status.error || "Failed" };
    }

    const returnValues = res.results?.[0]?.returnValues;
    if (!returnValues || returnValues.length === 0) {
      return { success: true, result: "Success (no return value)" };
    }

    const decodedValues: string[] = [];
    for (const [rawBytes, typeTag] of returnValues) {
      const decoded = decodeReturnValue(rawBytes, typeTag);
      decodedValues.push(decoded);
    }

    return { success: true, result: decodedValues.join("\n") };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

/**
 * Executes a REAL transaction on the blockchain.
 * Requires the sender's signature, consumes gas, and modifies on-chain state.
 *
 * @param tx The Transaction object to execute.
 * @param client The IotaClient.
 * @param keypair The keypair to sign the transaction.
 * @param walletAddress The sender's address.
 * @returns A TxResult object with outcome and transaction digest (hash).
 */
export async function executeReal(
  tx: Transaction,
  client: IotaClient,
  keypair: Ed25519Keypair,
  walletAddress: string,
): Promise<TxResult> {
  try {
    tx.setSender(walletAddress);
    // Builds the full block with gas and sender data
    const bytes = await tx.build({ client });
    // Signs the transaction bytes with the private key
    const sig = await keypair.signTransaction(bytes);

    // Sends the signed transaction for execution
    const res = await client.executeTransactionBlock({
      transactionBlock: bytes,
      signature: sig.signature,
      options: {
        showEffects: true,
        showEvents: true,
        showInput: true,
        showObjectChanges: true,
      },
    });

    // Displays technical details in the JSON panel
    showTxDetails(res);

    if (res.effects?.status?.status === "failure") {
      return {
        success: false,
        error: res.effects.status.error,
        digest: res.digest,
      };
    }
    return {
      success: true,
      result: "Transaction confirmed!",
      digest: res.digest,
    };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

/**
 * Decodes BCS return values returned by Move functions.
 * Converts raw bytes into readable formats based on the typeTag.
 *
 * @param rawBytes Byte array returned by the node.
 * @param typeTag String describing the data type (e.g., 'u64', 'bool').
 * @returns Textual representation of the decoded value.
 */
export function decodeReturnValue(rawBytes: number[], typeTag: string): string {
  console.log("[DECODE] Type:", typeTag, "Bytes:", rawBytes);

  try {
    if (typeTag === "bool") {
      return rawBytes[0] === 1 ? "true" : "false";
    }
    if (typeTag === "u8") {
      return rawBytes[0].toString();
    }
    if (typeTag === "u32") {
      const view = new DataView(new Uint8Array(rawBytes).buffer);
      return view.getUint32(0, true).toString();
    }
    if (typeTag === "u64") {
      const view = new DataView(new Uint8Array(rawBytes).buffer);
      const low = view.getUint32(0, true);
      const high = view.getUint32(4, true);
      return (BigInt(high) * BigInt(0x100000000) + BigInt(low)).toString();
    }
    if (typeTag === "0x1::string::String") {
      const { value: len, bytesRead } = readULEB128(rawBytes, 0);
      const strBytes = rawBytes.slice(bytesRead, bytesRead + len);
      return `"${String.fromCharCode(...strBytes)}"`;
    }
    if (typeTag === "vector<0x1::string::String>") {
      let pos = 0;
      const { value: vecLen, bytesRead } = readULEB128(rawBytes, pos);
      pos += bytesRead;

      const strings: string[] = [];
      for (let i = 0; i < vecLen; i++) {
        const { value: strLen, bytesRead: strOffset } = readULEB128(
          rawBytes,
          pos,
        );
        pos += strOffset;
        const strBytes = rawBytes.slice(pos, pos + strLen);
        strings.push(String.fromCharCode(...strBytes));
        pos += strLen;
      }
      return `[${strings.map((s) => `"${s}"`).join(", ")}]`;
    }
    if (typeTag.startsWith("0x1::option::Option<")) {
      if (rawBytes[0] === 0) return "None";
      const innerType = typeTag.slice(20, -1);
      return `Some(${decodeReturnValue(rawBytes.slice(1), innerType)})`;
    }

    return `0x${rawBytes.map((b) => b.toString(16).padStart(2, "0")).join("")}`;
  } catch (e) {
    console.error("[DECODE ERROR]:", e);
    return `[${rawBytes.join(", ")}]`;
  }
}

/**
 * Utility: Reads a variable-length integer encoded in ULEB128.
 * Used by BCS to indicate the length of strings and vectors.
 *
 * @param bytes The byte array to read.
 * @param start The starting position in the array.
 * @returns An object with the decoded value and the number of bytes read.
 */
export function readULEB128(
  bytes: number[],
  start: number,
): { value: number; bytesRead: number } {
  let value = 0;
  let shift = 0;
  let bytesRead = 0;
  while (true) {
    const byte = bytes[start + bytesRead];
    bytesRead++;
    value |= (byte & 0x7f) << shift;
    if ((byte & 0x80) === 0) break;
    shift += 7;
  }
  return { value, bytesRead };
}
