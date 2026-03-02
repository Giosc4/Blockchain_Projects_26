/**
 * doc-manager.ts - DOCUMENT CREATION MANAGER
 *
 * This module specializes in managing the complex flow of on-chain
 * document creation. It handles dynamic rows for multiple authors,
 * address validation, and PTB (Programmable Transaction Block) construction
 * using maps and vectors.
 *
 * COMMUNICATION:
 * - Called by 'main.ts' to handle the 'Create Document' tab.
 * - Uses 'tx-engine.ts' for sending transactions.
 * - Uses 'ui-interface.ts' to update the UI and show results.
 * - Imports validation helpers from 'utils-manager.ts'.
 */
import { Transaction } from "@iota/iota-sdk/transactions";
import { IotaClient } from "@iota/iota-sdk/client";
import { Ed25519Keypair } from "@iota/iota-sdk/keypairs/ed25519";
import { $, showBanner, showResult } from "./ui-interface";
import { getInputValue, validateRequired } from "./utils-manager";
import { executeSimulated, executeReal } from "./tx-engine";

/**
 * Builds a Move `VecMap` within the transaction.
 */
export function buildVecMap(
  tx: Transaction,
  entries: { key: string; value: string }[],
) {
  const vecMap = tx.moveCall({
    target: "0x2::vec_map::empty",
    typeArguments: ["0x1::string::String", "0x1::string::String"],
  });
  for (const e of entries) {
    tx.moveCall({
      target: "0x2::vec_map::insert",
      typeArguments: ["0x1::string::String", "0x1::string::String"],
      arguments: [vecMap, tx.pure.string(e.key), tx.pure.string(e.value)],
    });
  }
  return vecMap;
}

/**
 * Retrieves the list of additional editor addresses from the form.
 */
export function getEditorEntries(): string[] {
  const rows = $("editor-entries").querySelectorAll(".entry-row");
  const entries: string[] = [];
  rows.forEach((row) => {
    const input = row.querySelector("input");
    const val = input?.value.trim();
    if (val) entries.push(val);
  });
  return entries;
}

/**
 * Main function for creating a document.
 */
export async function createDocument(
  mode: "SIMULATE" | "REAL",
  client: IotaClient,
  keypair: Ed25519Keypair,
  walletAddress: string,
  docsPkg: string,
  iotascanUrl: string,
): Promise<void> {
  const title = validateRequired(getInputValue("doc-title"), "Title");
  const content = validateRequired(getInputValue("doc-content"), "Content");
  const author = getInputValue("doc-author");
  const version = getInputValue("doc-version") || "1";

  if (!title || !content || !author) return;

  const additionalEditors = getEditorEntries();
  const allAuthors = Array.from(new Set([author, ...additionalEditors]));

  for (const a of allAuthors) {
    if (!/^0x[0-9a-fA-F]+$/.test(a)) {
      showBanner(`Invalid address: ${a}`, "error");
      return;
    }
  }

  const tx = new Transaction();
  const metadata = buildVecMap(tx, []);

  tx.moveCall({
    target: `${docsPkg}::manage_documents::create_document`,
    arguments: [
      tx.pure.string(title),
      tx.pure.vector("address", allAuthors),
      tx.pure.string(content),
      tx.pure.string(getInputValue("doc-category") || "General"),
      tx.pure.string(version),
      tx.object("0x6"),
      tx.pure.bool(false),
      metadata,
    ],
  });

  const res =
    mode === "SIMULATE"
      ? await executeSimulated(tx, client, walletAddress)
      : await executeReal(tx, client, keypair, walletAddress);

  const authorsListHtml = allAuthors
    .map((a, i) => `${i + 1}. ${a}`)
    .join("<br>");

  if (res.success) {
    if (mode === "SIMULATE") {
      showBanner(
        `Document simulation OK! Click EXECUTE to create.<br><b>Owners (${allAuthors.length}):</b><br>${authorsListHtml}`,
        "success",
      );
      showResult("create_document", `Ready to create`, iotascanUrl);
      $<HTMLButtonElement>("btn-doc-execute").disabled = false;
    } else {
      showBanner(
        `Document created! <a href="${iotascanUrl}/tx/${res.digest}" target="_blank">View</a><br><b>Owners (${allAuthors.length}):</b><br>${authorsListHtml}`,
        "success",
      );
      showResult(
        "create_document",
        `Created\n\nOwners sent (${allAuthors.length}):\n${allAuthors.map((a, i) => `${i + 1}. ${a}`).join("\n")}`,
        iotascanUrl,
        res.digest,
      );
    }
  } else {
    showBanner(`Error: ${res.error}`, "error");
  }
}
