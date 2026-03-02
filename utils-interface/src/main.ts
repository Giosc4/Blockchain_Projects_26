/**
 * main.ts - APPLICATION ENTRY POINT
 *
 * This file coordinates the entire application. It initializes the IOTA client,
 * handles wallet loading, and dispatches UI events to the respective
 * execution engines.
 *
 * COMMUNICATION:
 * - Imports UI Utilities from './ui-interface.ts'
 * - Imports Transaction Engine from './tx-engine.ts'
 * - Imports Utils Function Manager from './utils-manager.ts'
 * - Imports Document Manager from './doc-manager.ts'
 */

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PRIVATE_KEY_HEX: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

import { getFullnodeUrl, IotaClient } from "@iota/iota-sdk/client";
import { getFaucetHost, requestIotaFromFaucetV0 } from "@iota/iota-sdk/faucet";
import { Transaction } from "@iota/iota-sdk/transactions";
import { Ed25519Keypair } from "@iota/iota-sdk/keypairs/ed25519";

// Imports from separate modules
import {
  $,
  $all,
  showBanner,
  showResult,
  copyToClipboard,
  escapeHtml,
} from "./ui-interface";
import { executeSimulated, executeReal } from "./tx-engine";
import { functionBuilders } from "./utils-manager";
import { createDocument } from "./doc-manager";

// =============================================================================
// 1. CONFIGURATION AND CONSTANTS
// =============================================================================

const CONFIG = {
  UTILS_PKG:
    "0x578e0e09c462484af4a67ebe78a9149b308ac1cc294c60e2728155e91f30e4f8",
  DOCS_PKG:
    "0xefb57b389f64f773ae348315a05fb3f0090128fb0859d834dd1948a1775f636b",
  IOTASCAN_URL: "https://iotascan.com/testnet",
};

const client = new IotaClient({ url: getFullnodeUrl("testnet") });

// =============================================================================
// 2. WALLET CONFIGURATION
// =============================================================================

function fromHex(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error("Invalid hex string");
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

const PRIVATE_KEY_HEX = import.meta.env.VITE_PRIVATE_KEY_HEX || "";
let keypair: Ed25519Keypair;
let walletAddress: string;

try {
  if (PRIVATE_KEY_HEX) {
    keypair = Ed25519Keypair.fromSecretKey(fromHex(PRIVATE_KEY_HEX));
    walletAddress = keypair.getPublicKey().toIotaAddress();
    console.log("[WALLET] Loaded:", walletAddress);
  } else {
    throw new Error("VITE_PRIVATE_KEY_HEX not found in .env!");
  }
} catch (e) {
  console.error("[WALLET] Failed:", e);
  alert("ERROR: Wallet not found!");
  throw e;
}

/**
 * Handles the start of a simulation (devInspect) for a Move function.
 * @param fnName Name of the function to be mapped in the builder registry.
 * @param btn HTML Button that triggered the event (for visual feedback).
 */
async function handleSimulate(
  fnName: string,
  btn: HTMLButtonElement,
): Promise<void> {
  const builder = functionBuilders[fnName];
  if (!builder) {
    showBanner(`Unknown function: ${fnName}`, "error");
    return;
  }

  btn.textContent = "Simulating...";
  btn.disabled = true;

  try {
    const tx = new Transaction();
    // The builder populates the transaction block with the specific moveCall
    if (!builder(tx, CONFIG.UTILS_PKG)) return;

    const res = await executeSimulated(tx, client, walletAddress);

    if (res.success) {
      showBanner("Simulation OK! Click EXECUTE to submit.", "success");
      showResult(fnName, res.result || "Success", CONFIG.IOTASCAN_URL);
      // Enable the real execution button only after a valid simulation
      const execBtn = btn.parentElement?.querySelector(
        ".btn-execute",
      ) as HTMLButtonElement;
      if (execBtn) execBtn.disabled = false;
    } else {
      showBanner(`Error: ${res.error}`, "error");
      showResult(fnName, `Error: ${res.error}`, CONFIG.IOTASCAN_URL);
    }
  } finally {
    btn.textContent = "SIMULATE";
    btn.disabled = false;
  }
}

/**
 * Handles the REAL execution of a signed transaction.
 * @param fnName Function name.
 * @param btn HTML Button.
 */
async function handleExecute(
  fnName: string,
  btn: HTMLButtonElement,
): Promise<void> {
  const builder = functionBuilders[fnName];
  if (!builder) return;

  // Security warning before spending gas
  if (!confirm("Submit REAL transaction? This will consume gas.")) return;

  btn.textContent = "Executing...";
  btn.disabled = true;

  try {
    const tx = new Transaction();
    if (!builder(tx, CONFIG.UTILS_PKG)) return;

    const res = await executeReal(tx, client, keypair, walletAddress);

    if (res.success) {
      showBanner(
        `Confirmed! <a href="${CONFIG.IOTASCAN_URL}/tx/${res.digest}" target="_blank">View on IOTAscan</a>`,
        "success",
      );
      showResult(
        fnName,
        "Transaction confirmed!",
        CONFIG.IOTASCAN_URL,
        res.digest,
      );
    } else {
      showBanner(`Error: ${res.error}`, "error");
    }
  } finally {
    btn.textContent = "EXECUTE";
  }
}

/**
 * Initializes the application by hooking UI events to handlers.
 * Configures tabs, simulation/execution buttons, faucet, and JSON search.
 */
function init(): void {
  console.log("[INIT] Starting application...");

  $("wallet-address").textContent =
    `Wallet: ${walletAddress.slice(0, 10)}...${walletAddress.slice(-6)}`;

  $("tab-utils").addEventListener("click", () => {
    $("tab-utils").classList.add("active");
    $("tab-docs").classList.remove("active");
    $("view-utils").classList.remove("hidden");
    $("view-docs").classList.add("hidden");
  });
  $("tab-docs").addEventListener("click", () => {
    $("tab-docs").classList.add("active");
    $("tab-utils").classList.remove("active");
    $("view-docs").classList.remove("hidden");
    $("view-utils").classList.add("hidden");
  });

  $all(".btn-simulate").forEach((btn) => {
    btn.addEventListener("click", () => {
      const fnName = (btn as HTMLElement).dataset.fn!;
      handleSimulate(fnName, btn as HTMLButtonElement);
    });
  });

  $all(".btn-execute").forEach((btn) => {
    btn.addEventListener("click", () => {
      const fnName = (btn as HTMLElement).dataset.fn!;
      handleExecute(fnName, btn as HTMLButtonElement);
    });
  });

  $("btn-doc-simulate").addEventListener("click", () =>
    createDocument(
      "SIMULATE",
      client,
      keypair,
      walletAddress,
      CONFIG.DOCS_PKG,
      CONFIG.IOTASCAN_URL,
    ),
  );
  $("btn-doc-execute").addEventListener("click", () =>
    createDocument(
      "REAL",
      client,
      keypair,
      walletAddress,
      CONFIG.DOCS_PKG,
      CONFIG.IOTASCAN_URL,
    ),
  );

  $("btn-fill-author").addEventListener("click", () => {
    $<HTMLInputElement>("doc-author").value = walletAddress;
  });

  $("btn-add-editor").addEventListener("click", () => {
    const row = document.createElement("div");
    row.className = "entry-row";
    row.innerHTML = `<input type="text" placeholder="Address (0x...)"><button type="button" class="entry-remove">&times;</button>`;
    row
      .querySelector(".entry-remove")
      ?.addEventListener("click", () => row.remove());
    $("editor-entries").appendChild(row);
  });

  $("btn-faucet").addEventListener("click", async () => {
    const btn = $<HTMLButtonElement>("btn-faucet");
    btn.textContent = "Requesting...";
    btn.disabled = true;
    try {
      await requestIotaFromFaucetV0({
        host: getFaucetHost("testnet"),
        recipient: walletAddress,
      });
      showBanner("Faucet tokens requested!", "success");
    } catch {
      showBanner("Faucet failed, try later", "error");
    } finally {
      btn.textContent = "💧 Request Faucet";
      btn.disabled = false;
    }
  });

  $("btn-clear").addEventListener("click", () => {
    document
      .querySelectorAll("input[type='text'], input[type='number'], textarea")
      .forEach((el) => {
        (el as HTMLInputElement).value = "";
      });
    $("result-output").innerHTML =
      '<span class="placeholder">Select a function and click SIMULATE</span>';
    $("tx-details").textContent = "// No transaction executed yet";
    $("search-info").textContent = "";
    $all(".btn-execute").forEach(
      (btn) => ((btn as HTMLButtonElement).disabled = true),
    );
    $("status-banner").classList.add("hidden");
  });

  $("btn-copy-result").addEventListener("click", () => {
    const resultText = $("result-output").innerText;
    copyToClipboard(resultText, "btn-copy-result");
  });
  $("btn-copy-tx").addEventListener("click", () => {
    const txText = $("tx-details").textContent || "";
    copyToClipboard(txText, "btn-copy-tx");
  });

  $<HTMLInputElement>("tx-search").addEventListener("input", (e) => {
    const query = (e.target as HTMLInputElement).value.trim().toLowerCase();
    const txDetails = $("tx-details");
    const searchInfo = $("search-info");
    const originalContent =
      (window as any).__txContent || txDetails.textContent || "";

    if (!query) {
      txDetails.textContent = originalContent;
      searchInfo.textContent = "";
      return;
    }

    const content = originalContent;
    const lowerContent = content.toLowerCase();
    let count = 0;
    let lastIndex = 0;
    let highlighted = "";

    while (true) {
      const index = lowerContent.indexOf(query, lastIndex);
      if (index === -1) break;
      highlighted += escapeHtml(content.slice(lastIndex, index));
      highlighted += `<span class="highlight">${escapeHtml(content.slice(index, index + query.length))}</span>`;
      lastIndex = index + query.length;
      count++;
    }
    highlighted += escapeHtml(content.slice(lastIndex));

    txDetails.innerHTML = highlighted;
    searchInfo.textContent =
      count > 0
        ? `Found ${count} match${count > 1 ? "es" : ""}`
        : "No matches found";
  });

  console.log("[INIT] Ready!");
}

document.addEventListener("DOMContentLoaded", init);
