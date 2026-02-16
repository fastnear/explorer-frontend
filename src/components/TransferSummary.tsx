import { useState } from "react";
import type { TransferInfo } from "../utils/parseTransaction";
import useTokenMetadata, { type TokenMetadata } from "../hooks/useTokenMetadata";
import AccountId from "./AccountId";
import NearAmount from "./NearAmount";
import { ArrowLeftRight, Cog, Loader2 } from "lucide-react";

function formatTokenAmount(amount: string, decimals: number): string {
  if (amount === "0") return "0";
  const padded = amount.padStart(decimals + 1, "0");
  const whole =
    padded.slice(0, padded.length - decimals).replace(/^0+/, "") || "0";
  const frac = padded.slice(padded.length - decimals).replace(/0+$/, "");
  if (!frac) return whole;
  return `${whole}.${frac.slice(0, 5)}`;
}

function TokenIcon({ icon, symbol }: { icon: string; symbol: string }) {
  return (
    <img
      src={icon}
      alt={symbol}
      className="inline-block size-3.5 rounded-full object-cover align-text-bottom"
    />
  );
}

const MAX_SYMBOL_LEN = 15;

function truncateSymbol(symbol: string): string {
  return symbol.length > MAX_SYMBOL_LEN
    ? symbol.slice(0, MAX_SYMBOL_LEN) + "\u2026"
    : symbol;
}

function TokenAmount({ amount, meta }: { amount: string; meta: TokenMetadata }) {
  const [showRaw, setShowRaw] = useState(false);
  const symbol = truncateSymbol(meta.symbol);
  return (
    <span
      className="cursor-pointer whitespace-nowrap font-mono hover:underline decoration-dotted inline-flex items-center gap-0.5"
      onClick={() => setShowRaw(!showRaw)}
      title={showRaw ? `Click to show in ${meta.symbol}` : "Click to show raw units"}
    >
      {showRaw
        ? `${amount} units ${symbol}`
        : `${formatTokenAmount(amount, meta.decimals)} ${symbol}`}
      {meta.icon && <TokenIcon icon={meta.icon} symbol={meta.symbol} />}
    </span>
  );
}

function SystemBadge({ label }: { label: string }) {
  return (
    <span
      className="inline-flex items-center gap-0.5 whitespace-nowrap font-mono text-xs text-gray-400"
      title={label}
    >
      <Cog className="size-3" />
      <span>{label}</span>
    </span>
  );
}

export default function TransferSummary({
  transfer,
}: {
  transfer: TransferInfo;
}) {
  const { metadata, loading } = useTokenMetadata(transfer.tokenContractId);

  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {transfer.from !== null && transfer.to !== null && (
        <span className="inline-flex items-center gap-0.5 whitespace-nowrap font-mono text-xs text-gray-400">
          <ArrowLeftRight className="size-3" />
          <span>Transfer</span>
        </span>
      )}
      {transfer.from === null && <SystemBadge label="Mint" />}
      {transfer.to === null && <SystemBadge label="Burn" />}
      {transfer.from !== null && <AccountId accountId={transfer.from} />}
      <span className="text-gray-400">&rarr;</span>
      {transfer.to !== null && <AccountId accountId={transfer.to} />}
      {transfer.tokenContractId === null ? (
        <NearAmount yoctoNear={transfer.amount} />
      ) : loading ? (
        <Loader2 className="size-3 animate-spin text-gray-400" />
      ) : metadata ? (
        <TokenAmount amount={transfer.amount} meta={metadata} />
      ) : (
        <span className="font-mono">
          {transfer.amount}{" "}
          <AccountId accountId={transfer.tokenContractId} />
        </span>
      )}
    </span>
  );
}
