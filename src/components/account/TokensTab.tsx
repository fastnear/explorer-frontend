import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { AccountFtToken } from "../../api/fastnearApi";
import useTokenMetadata from "../../hooks/useTokenMetadata";
import { computeUsdValue, formatUsd, type TokenPrice } from "../../hooks/useTokenPrices";
import { formatUnits } from "../../utils/format";
import AccountId from "../AccountId";

function TokenRow({
  token,
  price,
  dimmed,
}: {
  token: AccountFtToken;
  price?: TokenPrice;
  dimmed?: boolean;
}) {
  const { metadata, loading } = useTokenMetadata(token.contract_id);
  const value = price ? computeUsdValue(token.balance, price.decimals, price.price) : 0;

  return (
    <tr className={`border-b border-gray-100 last:border-b-0 ${dimmed ? "opacity-60" : ""}`}>
      <td className="px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          {metadata?.icon ? (
            <img
              src={metadata.icon}
              alt=""
              loading="lazy"
              className="size-7 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-500">
              {loading ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                (metadata?.symbol ?? "?").slice(0, 1).toUpperCase()
              )}
            </span>
          )}
          <div className="min-w-0">
            <div className="truncate font-medium text-gray-900">
              {metadata ? metadata.symbol.slice(0, 20) : loading ? "…" : "Unknown token"}
              {metadata && metadata.name !== metadata.symbol && (
                <span className="ml-1.5 font-normal text-gray-500">
                  {metadata.name.slice(0, 32)}
                </span>
              )}
            </div>
            <div className="truncate text-xs">
              <AccountId accountId={token.contract_id} maxLength={36} />
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-2.5 text-right tabular-nums">
        {metadata ? (
          formatUnits(token.balance || "0", metadata.decimals)
        ) : (
          <span className="text-gray-500" title="Raw units: the token's decimals are unknown">
            {token.balance} units
          </span>
        )}
      </td>
      <td className="hidden px-4 py-2.5 text-right tabular-nums text-gray-500 sm:table-cell">
        {price && price.price > 0 ? formatUsd(price.price) : "—"}
      </td>
      <td className="px-4 py-2.5 text-right font-medium tabular-nums">
        {value > 0 ? formatUsd(value) : <span className="font-normal text-gray-400">—</span>}
      </td>
    </tr>
  );
}

export default function TokensTab({
  tokens,
  spamTokens,
  zeroTokens,
  prices,
}: {
  tokens: AccountFtToken[];
  spamTokens: AccountFtToken[];
  zeroTokens: AccountFtToken[];
  prices: Map<string, TokenPrice> | null;
}) {
  const [showSpam, setShowSpam] = useState(false);
  const [showZero, setShowZero] = useState(false);
  const rows = [
    ...tokens.map((t) => ({ token: t, dimmed: false })),
    ...(showSpam ? spamTokens.map((t) => ({ token: t, dimmed: true })) : []),
    ...(showZero ? zeroTokens.map((t) => ({ token: t, dimmed: true })) : []),
  ];

  return (
    <div className="rounded-xl border border-gray-200 bg-surface">
      {rows.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-gray-500">
          This account holds no tokens besides NEAR.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs font-medium text-gray-500">
                <th className="px-4 py-2.5 font-medium">Token</th>
                <th className="px-4 py-2.5 text-right font-medium">Balance</th>
                <th className="hidden px-4 py-2.5 text-right font-medium sm:table-cell">Price</th>
                <th className="px-4 py-2.5 text-right font-medium">Value</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ token, dimmed }) => (
                <TokenRow
                  key={token.contract_id}
                  token={token}
                  price={prices?.get(token.contract_id)}
                  dimmed={dimmed}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
      {(spamTokens.length > 0 || zeroTokens.length > 0) && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-gray-100 px-4 py-2.5 text-xs text-gray-500">
          {spamTokens.length > 0 && (
            <label className="inline-flex cursor-pointer items-center gap-1.5">
              <input
                type="checkbox"
                checked={showSpam}
                onChange={(e) => setShowSpam(e.target.checked)}
              />
              Show {spamTokens.length} flagged as spam
            </label>
          )}
          {zeroTokens.length > 0 && (
            <label className="inline-flex cursor-pointer items-center gap-1.5">
              <input
                type="checkbox"
                checked={showZero}
                onChange={(e) => setShowZero(e.target.checked)}
              />
              Show {zeroTokens.length} with zero balance
            </label>
          )}
          <span className="ml-auto">Values use current prices</span>
        </div>
      )}
    </div>
  );
}
