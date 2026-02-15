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
