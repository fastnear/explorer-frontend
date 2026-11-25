const YOCTO = 24; // 10^24 yoctoNEAR per NEAR

export function formatNear(yoctoNear: string | undefined): string {
  if (!yoctoNear || yoctoNear === "0") return "0 NEAR";
  if (yoctoNear === "1") return "1 yocto";
  const s = yoctoNear.padStart(YOCTO + 1, "0");
  const whole = s.slice(0, s.length - YOCTO).replace(/^0+/, "") || "0";
  const frac = s.slice(s.length - YOCTO).replace(/0+$/, "");
  if (!frac) return `${whole} NEAR`;
  return `${whole}.${frac.slice(0, 5)} NEAR`;
}

export function formatGas(gas: number): string {
  return `${(gas / 1e12).toFixed(2)} Tgas`;
}

const BASE58_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

const BASE58_MAP = new Map(
  [...BASE58_ALPHABET].map((c, i) => [c, i])
);

export function decodeBase58(str: string): Uint8Array | null {
  const bytes: number[] = [];
  for (const c of str) {
    const val = BASE58_MAP.get(c);
    if (val === undefined) return null;
    let carry = val;
    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j] * 58;
      bytes[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  // Leading '1's in base58 are leading zero bytes
  for (const c of str) {
    if (c !== "1") break;
    bytes.push(0);
  }
  return new Uint8Array(bytes.reverse());
}

export function encodeBase58(bytes: Uint8Array): string {
  // Count leading zeros
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) zeros++;

  // Convert to base58
  const digits: number[] = [];
  for (let i = zeros; i < bytes.length; i++) {
    let carry = bytes[i];
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }

  return (
    BASE58_ALPHABET[0].repeat(zeros) +
    digits
      .reverse()
      .map((d) => BASE58_ALPHABET[d])
      .join("")
  );
}

function groupThousands(whole: string): string {
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Format an integer token amount for reading: thousands separators, and only
 * as many decimals as are useful for the size of the number (truncated, not rounded).
 */
export function formatUnits(amount: string, decimals: number): string {
  if (!/^\d+$/.test(amount)) return amount;
  const digits = amount.replace(/^0+/, "");
  if (!digits) return "0";
  const padded = digits.padStart(decimals + 1, "0");
  const whole = padded.slice(0, padded.length - decimals);
  const frac = decimals > 0 ? padded.slice(padded.length - decimals) : "";

  let keep: number;
  if (whole.length >= 4) keep = 2;
  else if (whole !== "0") keep = 4;
  else {
    // Below 1: keep three significant digits, up to 8 decimal places
    const lead = frac.search(/[1-9]/);
    if (lead < 0) return "0";
    if (lead >= 8) return "<0.00000001";
    keep = Math.min(8, lead + 3);
  }
  const shown = frac.slice(0, keep).replace(/0+$/, "");
  return shown ? `${groupThousands(whole)}.${shown}` : groupThousands(whole);
}

export const NEAR_DECIMALS = 24;

/** Shorten a long identifier in the middle: "abcdef…wxyz" */
export function shortenMiddle(text: string, head = 8, tail = 6): string {
  return text.length <= head + tail + 1
    ? text
    : `${text.slice(0, head)}…${text.slice(-tail)}`;
}

/** 64-hex implicit accounts and other long IDs read better shortened */
export function displayAccountId(accountId: string, max = 28): string {
  if (accountId.length <= max) return accountId;
  if (/^[0-9a-f]{64}$/.test(accountId)) return shortenMiddle(accountId, 6, 6);
  const dot = accountId.indexOf(".");
  // Keep the parent account readable: "verylongname….parent.near"
  if (dot > 0 && accountId.length - dot <= max - 8) {
    const room = max - (accountId.length - dot) - 1;
    return `${accountId.slice(0, Math.max(4, room))}…${accountId.slice(dot)}`;
  }
  return shortenMiddle(accountId, Math.floor(max / 2), Math.floor(max / 2) - 2);
}

const INTEGER = new Intl.NumberFormat();

/** A count with thousands separators in the reader's locale */
export function formatCount(n: number): string {
  return INTEGER.format(n);
}
