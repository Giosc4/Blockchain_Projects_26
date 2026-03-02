/**
 * utils-manager.ts - UTILITY FUNCTIONS MANAGER
 *
 * This file implements the 'Function Builders' registry. Each builder
 * is responsible for retrieving inputs from the form, validating them, and adding
 * the correct 'moveCall' to the transaction block.
 *
 * COMMUNICATION:
 * - Provides the 'functionBuilders' registry to 'main.ts'.
 * - Uses 'ui-interface.ts' for validation and error reporting.
 */
import { Transaction } from "@iota/iota-sdk/transactions";
import { $, showBanner } from "./ui-interface";

export function getInputValue(id: string): string {
  return $<HTMLInputElement>(id).value.trim();
}

/**
 * Validates that a string field is not empty.
 */
export function validateRequired(value: string, name: string): string | null {
  if (!value) {
    showBanner(`${name} is required`, "error");
    return null;
  }
  return value;
}

/**
 * Parses a string into a 64-bit integer (BigInt).
 */
export function parseU64(value: string): bigint | null {
  if (!value) {
    showBanner("Number is required", "error");
    return null;
  }
  try {
    const n = BigInt(value);
    if (n < 0n) throw new Error("Must be positive");
    return n;
  } catch (e) {
    showBanner(`Invalid number: ${(e as Error).message}`, "error");
    return null;
  }
}

/**
 * Parses a comma-separated string of numbers into a byte array (u8).
 */
export function parseVectorU8(value: string): number[] | null {
  if (!value) {
    showBanner("Vector is required", "error");
    return null;
  }
  try {
    return value.split(",").map((s) => {
      const n = parseInt(s.trim(), 10);
      if (isNaN(n) || n < 0 || n > 255) throw new Error(`Invalid byte: ${s}`);
      return n;
    });
  } catch (e) {
    showBanner(`Invalid vector: ${(e as Error).message}`, "error");
    return null;
  }
}

export type FnBuilder = (tx: Transaction, utilsPkg: string) => boolean;

export const functionBuilders: Record<string, FnBuilder> = {
  split: (tx, utilsPkg) => {
    const str = validateRequired(getInputValue("split-str"), "String");
    const sep = parseInt(getInputValue("split-sep"), 10);
    if (!str || isNaN(sep)) return false;

    tx.moveCall({
      target: `${utilsPkg}::myutils::split`,
      arguments: [tx.pure.string(str), tx.pure.u8(sep)],
    });
    return true;
  },

  check_lowercase: (tx, utilsPkg) => {
    const str = validateRequired(
      getInputValue("check_lowercase-str"),
      "String",
    );
    if (!str) return false;

    tx.moveCall({
      target: `${utilsPkg}::myutils::check_lowercase`,
      arguments: [tx.pure.string(str)],
    });
    return true;
  },

  check_is_hex: (tx, utilsPkg) => {
    const str = validateRequired(getInputValue("check_is_hex-str"), "String");
    if (!str) return false;

    tx.moveCall({
      target: `${utilsPkg}::myutils::check_is_hex`,
      arguments: [tx.pure.string(str)],
    });
    return true;
  },

  count_digits: (tx, utilsPkg) => {
    const num = parseU64(getInputValue("count_digits-num"));
    if (num === null) return false;

    tx.moveCall({
      target: `${utilsPkg}::myutils::count_digits`,
      arguments: [tx.pure.u64(num)],
    });
    return true;
  },

  sum_bytes_u8: (tx, utilsPkg) => {
    const vec = parseVectorU8(getInputValue("sum_bytes_u8-vec"));
    if (!vec) return false;

    tx.moveCall({
      target: `${utilsPkg}::myutils::sum_bytes_u8`,
      arguments: [tx.pure.vector("u8", vec)],
    });
    return true;
  },

  sum_bytes_u32: (tx, utilsPkg) => {
    const vec = parseVectorU8(getInputValue("sum_bytes_u32-vec"));
    if (!vec) return false;

    tx.moveCall({
      target: `${utilsPkg}::myutils::sum_bytes_u32`,
      arguments: [tx.pure.vector("u8", vec)],
    });
    return true;
  },

  string_to_u64: (tx, utilsPkg) => {
    const str = validateRequired(getInputValue("string_to_u64-str"), "String");
    if (!str) return false;

    tx.moveCall({
      target: `${utilsPkg}::myutils::string_to_u64`,
      arguments: [tx.pure.string(str)],
    });
    return true;
  },

  boolean_from_str: (tx, utilsPkg) => {
    const str = validateRequired(
      getInputValue("boolean_from_str-str"),
      "String",
    );
    if (!str) return false;

    tx.moveCall({
      target: `${utilsPkg}::myutils::boolean_from_str`,
      arguments: [tx.pure.string(str)],
    });
    return true;
  },

  remove_white_spaces: (tx, utilsPkg) => {
    const str = validateRequired(
      getInputValue("remove_white_spaces-str"),
      "String",
    );
    if (!str) return false;

    tx.moveCall({
      target: `${utilsPkg}::myutils::remove_white_spaces`,
      arguments: [tx.pure.string(str)],
    });
    return true;
  },

  equals: (tx, utilsPkg) => {
    const str1 = validateRequired(getInputValue("equals-str1"), "First string");
    const str2 = validateRequired(
      getInputValue("equals-str2"),
      "Second string",
    );
    if (!str1 || !str2) return false;

    tx.moveCall({
      target: `${utilsPkg}::myutils::equals`,
      arguments: [tx.pure.string(str1), tx.pure.string(str2)],
    });
    return true;
  },

  ms_to_string: (tx, utilsPkg) => {
    const ts = parseU64(getInputValue("ms_to_string-ts"));
    if (ts === null) return false;

    tx.moveCall({
      target: `${utilsPkg}::date_time::ms_to_string`,
      arguments: [tx.pure.u64(ts)],
    });
    return true;
  },
};
