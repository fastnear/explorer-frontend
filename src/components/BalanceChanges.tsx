import { useMemo, useState } from "react";
import { Image } from "lucide-react";
import type { ParsedTx, TransferInfo } from "../utils/parseTransaction";
import { netFlows } from "../utils/summarizeTx";
import AccountId from "./AccountId";
import { TransferAmount } from "./TransferSummary";

const VISIBLE_ACCOUNTS = 6;

interface Change {
  key: string;
  positive: boolean;
  asset?: TransferInfo;
  nft?: { contractId: string; tokenId: string };
}

function buildChanges(tx: ParsedTx): { account: string; changes: Change[] }[] {
  const byAccount = new Map<string, Change[]>();
  const push = (account: string, change: Change) => {
    const list = byAccount.get(account);
    if (list) list.push(change);
    else byAccount.set(account, [change]);
  };

  for (const [account, flows] of netFlows(tx.transfers)) {
    for (const flow of flows.values()) {
      if (flow.amount === 0n) continue;
      const positive = flow.amount > 0n;
      push(account, {
        key: flow.key,
        positive,
        asset: { ...flow.asset, amount: (positive ? flow.amount : -flow.amount).toString() },
      });
    }
  }
  for (const n of tx.nftTransfers) {
    const nft = { contractId: n.contractId, tokenId: n.tokenId };
    if (n.from === n.to) continue;
    if (n.from) push(n.from, { key: `nft:${n.contractId}:${n.tokenId}`, positive: false, nft });
    if (n.to) push(n.to, { key: `nft:${n.contractId}:${n.tokenId}`, positive: true, nft });
  }

  // The people involved first, then everyone else by how much changed for them
  const rank = (account: string) =>
    account === tx.signer_id ? 0 : account === tx.receiver_id ? 1 : 2;
  return [...byAccount.entries()]
    .map(([account, changes]) => ({ account, changes }))
    .sort(
      (a, b) =>
        rank(a.account) - rank(b.account) || b.changes.length - a.changes.length
    );
}

function ChangeChip({ change }: { change: Change }) {
  const cls = change.positive ? "text-green-700" : "text-red-700";
  return (
    <span className={`inline-flex items-center gap-0.5 whitespace-nowrap font-medium ${cls}`}>
      <span aria-hidden>{change.positive ? "+" : "−"}</span>
      <span className="sr-only">{change.positive ? "received" : "sent"}</span>
      {change.asset ? (
        <TransferAmount transfer={change.asset} />
      ) : (
        <span className="inline-flex items-center gap-1" title={change.nft!.tokenId}>
          <Image className="size-3.5" aria-hidden />
          NFT #
          {change.nft!.tokenId.length > 18
            ? change.nft!.tokenId.slice(0, 16) + "…"
            : change.nft!.tokenId}
        </span>
      )}
    </span>
  );
}

/** Net effect of a transaction on each account's balances */
export default function BalanceChanges({ tx }: { tx: ParsedTx }) {
  const rows = useMemo(() => buildChanges(tx), [tx]);
  const [showAll, setShowAll] = useState(false);
  if (rows.length === 0) {
    return (
      <p className="py-2 text-gray-500">
        No net change: everything that moved was returned.
      </p>
    );
  }
  const visible = showAll ? rows : rows.slice(0, VISIBLE_ACCOUNTS);

  return (
    <div>
      <ul className="divide-y divide-gray-100">
        {visible.map(({ account, changes }) => (
          <li
            key={account}
            className="flex flex-col gap-1 py-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
          >
            <span className="min-w-0 font-medium">
              <AccountId accountId={account} />
            </span>
            <span className="flex flex-wrap gap-x-4 gap-y-1 sm:justify-end">
              {changes.slice(0, 8).map((c, i) => (
                <ChangeChip key={`${c.key}-${i}`} change={c} />
              ))}
              {changes.length > 8 && (
                <span className="text-gray-500">and {changes.length - 8} more</span>
              )}
            </span>
          </li>
        ))}
      </ul>
      {!showAll && rows.length > VISIBLE_ACCOUNTS && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-1 cursor-pointer text-sm text-blue-600 hover:underline"
        >
          Show all {rows.length} accounts
        </button>
      )}
    </div>
  );
}
