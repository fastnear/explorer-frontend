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
