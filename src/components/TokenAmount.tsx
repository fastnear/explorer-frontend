import { useState } from "react";
import type { FtMetadata } from "../tokens/types";

function formatTokenAmount(raw: string, decimals: number): string {
  if (raw === "0") return "0";
  const s = raw.padStart(decimals + 1, "0");
  const whole = s.slice(0, s.length - decimals).replace(/^0+/, "") || "0";
  const frac = s.slice(s.length - decimals).replace(/0+$/, "");
  if (!frac) return whole;
  return `${whole}.${frac.slice(0, 6)}`;
}

export default function TokenAmount({
  amount,
  metadata,
}: {
  amount: string;
  metadata: FtMetadata;
}) {
  const [showRaw, setShowRaw] = useState(false);

  return (
    <span
      className="inline-flex items-center gap-1 cursor-pointer hover:underline decoration-dotted"
      onClick={() => setShowRaw(!showRaw)}
      title={showRaw ? "Click to show formatted" : "Click to show raw amount"}
    >
      {metadata.icon && (
        <img
          src={metadata.icon}
          alt={metadata.symbol}
          className="inline size-4 rounded-full"
        />
      )}
      {showRaw ? (
        <>{amount} units</>
      ) : (
        <>
          {formatTokenAmount(amount, metadata.decimals)} {metadata.symbol}
        </>
      )}
    </span>
  );
}
