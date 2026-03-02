/**
 * ui-interface.ts - USER INTERFACE MANAGER
 *
 * Module dedicated to DOM manipulation and visual feedback.
 * Provides helpers for selecting elements, showing status banners,
 * updating result panels, and handling real-time search.
 *
 * COMMUNICATION:
 * - Exports utility functions used by 'main.ts', 'tx-engine.ts', 'doc-manager.ts',
 *   and 'utils-manager.ts' to ensure a consistent user experience.
 */

/** Typed helper to select elements by ID */
export const $ = <T extends HTMLElement>(id: string): T =>
  document.getElementById(id) as T;

/** Helper to select lists of elements */
export const $all = (sel: string): NodeListOf<Element> =>
  document.querySelectorAll(sel);

/**
 * Shows a notification banner at the top of the page.
 */
export function showBanner(
  message: string,
  type: "success" | "error" | "info",
): void {
  const banner = $("status-banner");
  const msg = $("banner-message");
  banner.className = `banner ${type}`;
  msg.innerHTML = message;
  banner.classList.remove("hidden");
}

/**
 * Updates the results pane.
 */
export function showResult(
  fnName: string,
  result: string,
  iotascanUrl: string,
  digest?: string,
): void {
  const output = $("result-output");
  let digestHtml = "";
  if (digest) {
    digestHtml = `<div style="margin-top:10px;"><a href="${iotascanUrl}/tx/${digest}" target="_blank">View on IOTAscan ↗</a></div>`;
  }
  output.innerHTML = `
        <div class="result-func">Function: <code>${fnName}</code></div>
        <div class="result-value">${result}</div>
        ${digestHtml}
    `;
}

/**
 * Displays technical details from the JSON response.
 */
export function showTxDetails(response: any): void {
  const content = JSON.stringify(response, null, 2);
  $("tx-details").textContent = content;

  if (response.transaction?.data?.transaction?.inputs) {
    console.log("[TX] Inputs:", response.transaction.data.transaction.inputs);
    const inputs = response.transaction.data.transaction.inputs;
    const inputsInfo = `\n\n=== TRANSACTION INPUTS ===\n${JSON.stringify(inputs, null, 2)}`;
    $("tx-details").textContent += inputsInfo;
  }

  $<HTMLInputElement>("tx-search").value = "";
  $("search-info").textContent = "";
  (window as any).__txContent = $("tx-details").textContent;
}

/** Clipboard helper with visual feedback */
export async function copyToClipboard(
  text: string,
  buttonId: string,
): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    const btn = $<HTMLButtonElement>(buttonId);
    const originalText = btn.textContent;
    btn.textContent = "✓ Copied!";
    btn.classList.add("copy-success");
    setTimeout(() => {
      btn.textContent = originalText;
      btn.classList.remove("copy-success");
    }, 1500);
  } catch (e) {
    showBanner("Failed to copy to clipboard", "error");
  }
}

/** HTML sanitization to prevent XSS */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
