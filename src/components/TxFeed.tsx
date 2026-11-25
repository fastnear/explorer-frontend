import { useMemo, useState, useCallback, Fragment, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import type { ParsedTx } from "../utils/parseTransaction";
import { summarizeTx } from "../utils/summarizeTx";
import useDevMode from "../hooks/useDevMode";
import useSpamTokens, { isSpam } from "../hooks/useSpamTokens";
import useSpamNfts, { isSpamNft } from "../hooks/useSpamNfts";
import AccountId from "./AccountId";
import Action from "./Action";
import GasAmount from "./GasAmount";
import KindBadge from "./KindBadge";
import ReceiptPopup from "./ReceiptPopup";
import Skeleton from "./Skeleton";
import { StatusIcon, type TxStatus } from "./StatusBadge";
import TimeAgo from "./TimeAgo";
import TransactionHash from "./TransactionHash";
import TransferSummary, { NftTransferSummary } from "./TransferSummary";
import TxSummary from "./TxSummary";

export interface TxFeedItem {
  hash: string;
  /** Block timestamp in nanoseconds */
  timestamp: string;
  /** Full details; absent while they are still loading */
  tx?: ParsedTx;
  /** What the list endpoint already told us, shown until details arrive */
  hint?: { signer?: string; receiver?: string; status?: TxStatus };
}

const EXPANDED_LIMIT = 12;

/** Items separated by a middle dot, skipping empty ones */
function Dotted({ items }: { items: ReactNode[] }) {
  const shown = items.filter(Boolean);
  return (
    <>
      {shown.map((child, i) => (
        <Fragment key={i}>
          {i > 0 && <span className="text-gray-300" aria-hidden>·</span>}
          {child}
        </Fragment>
      ))}
    </>
  );
}

function RowDetails({ tx }: { tx: ParsedTx }) {
  const [showAll, setShowAll] = useState(false);
  const [popupActionIndex, setPopupActionIndex] = useState<number | null>(null);
  const closePopup = useCallback(() => setPopupActionIndex(null), []);

  const total = tx.transfers.length + tx.nftTransfers.length;
  const rows: ReactNode[] = [
    ...tx.transfers.map((t, i) => <TransferSummary key={`ft-${i}`} transfer={t} />),
    ...tx.nftTransfers.map((t, i) => <NftTransferSummary key={`nft-${i}`} transfer={t} />),
  ];
  const visible = showAll ? rows : rows.slice(0, EXPANDED_LIMIT);

  return (
    <div className="mt-3 space-y-3 rounded-lg bg-gray-50 px-3 py-2.5 text-xs sm:ml-27">
      {total > 0 && (
        <div>
          <div className="mb-1 font-medium text-gray-500">Token movements</div>
          <div className="flex flex-col gap-1 text-gray-700">
            {visible}
            {!showAll && total > EXPANDED_LIMIT && (
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="cursor-pointer text-left text-blue-600 hover:underline"
              >
                Show {total - EXPANDED_LIMIT} more
              </button>
            )}
          </div>
        </div>
      )}
      <div>
        <div className="mb-1 font-medium text-gray-500">
          Actions <span className="font-normal">(click one to see what it did)</span>
        </div>
        <div className="flex flex-wrap gap-1.5 font-mono">
          {tx.actions.map((a, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setPopupActionIndex(i)}
              className="cursor-pointer rounded border border-gray-200 bg-surface px-2 py-1 text-gray-700 hover:border-blue-300 hover:text-blue-600"
            >
              <Action action={a} />
            </button>
          ))}
        </div>
      </div>
      <Link to={`/tx/${tx.hash}`} className="inline-block text-blue-600 hover:underline">
        Open transaction →
      </Link>
      {popupActionIndex !== null && (
        <ReceiptPopup
          txHash={tx.hash}
          receipts={tx.receipts}
          action={tx.actions[popupActionIndex]}
          actionIndex={popupActionIndex}
          onClose={closePopup}
        />
      )}
    </div>
  );
}

function PlaceholderRow({ item }: { item: TxFeedItem }) {
  const { hint } = item;
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <div className="hidden w-24 shrink-0 sm:block">
        <Skeleton className="h-5 w-16" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm">
          {hint?.signer ? (
            <span className="inline-flex flex-wrap items-center gap-1 text-gray-600">
              <AccountId accountId={hint.signer} />
              <span className="text-gray-400">→</span>
              {hint.receiver && <AccountId accountId={hint.receiver} />}
            </span>
          ) : (
            <Skeleton className="h-4 w-2/3 max-w-80" />
          )}
        </div>
        <div className="mt-1 text-xs">
          <TransactionHash hash={item.hash} />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 pt-0.5 text-xs text-gray-500">
        <TimeAgo timestampNs={item.timestamp} />
        {hint?.status && <StatusIcon status={hint.status} />}
      </div>
    </div>
  );
}

function TxFeedRow({ item, viewer }: { item: TxFeedItem; viewer?: string }) {
  const devMode = useDevMode();
  const [open, setOpen] = useState(false);
  const tx = item.tx;
  const summary = useMemo(() => (tx ? summarizeTx(tx, viewer) : null), [tx, viewer]);

  if (!tx || !summary) return <PlaceholderRow item={item} />;

  const badge = <KindBadge kind={summary.kind} label={summary.badge} />;

  return (
    <div className="px-4 py-3 hover:bg-gray-50/60">
      <div className="flex items-start gap-3">
        <div className="hidden w-24 shrink-0 pt-0.5 sm:block">{badge}</div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 sm:hidden">{badge}</div>
          <div className="text-sm leading-relaxed">
            <TxSummary summary={summary} />
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500">
            <Dotted
              items={[
                summary.app && (
                  <Link to={`/account/${summary.app.id}`} className="hover:underline">
                    on {summary.app.name}
                  </Link>
                ),
                <TransactionHash hash={tx.hash} />,
                summary.note && <span>{summary.note}</span>,
                tx.relayer_id && (
                  <Link
                    to={`/account/${tx.relayer_id}`}
                    title={`Fee paid by ${tx.relayer_id}`}
                    className="hover:underline"
                  >
                    relayed
                  </Link>
                ),
                devMode && <GasAmount gas={tx.gas_burnt} />,
              ]}
            />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 pt-0.5 text-xs text-gray-500">
          <TimeAgo timestampNs={item.timestamp} />
          <StatusIcon
            status={summary.status}
            partial={summary.status === "success" && tx.has_failed_receipts}
          />
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={open ? "Hide details" : "Show details"}
            title={open ? "Hide details" : "Show details"}
            className="cursor-pointer rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>
      {open && <RowDetails tx={tx} />}
    </div>
  );
}

function SpamFilterBar({ spamCount, showSpam, setShowSpam }: SpamFilterProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-gray-200">
      <div className="flex items-center justify-between gap-2 px-4 py-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        >
          <SlidersHorizontal className="size-3.5" />
          Filters
        </button>
        {!showSpam && spamCount > 0 && (
          <span className="text-xs text-gray-400">Hiding {spamCount} spam</span>
        )}
      </div>
      {open && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={showSpam}
              onChange={(e) => setShowSpam(e.target.checked)}
              className="rounded"
            />
            Show spam transactions
            {spamCount > 0 && <span className="text-gray-400">({spamCount} hidden)</span>}
          </label>
        </div>
      )}
    </div>
  );
}

export interface SpamFilterProps {
  showSpam: boolean;
  setShowSpam: (v: boolean) => void;
  spamCount: number;
}

/**
 * A list of transactions as plain-language rows. Rows whose details have not
 * loaded yet render as placeholders, so the list never appears empty.
 *
 * `filterBar` replaces the default spam-only filter bar; pass `null` for none.
 */
export default function TxFeed({
  items,
  viewer,
  filterBar,
  empty,
}: {
  items: TxFeedItem[];
  viewer?: string;
  filterBar?: ((spam: SpamFilterProps) => ReactNode) | null;
  empty?: ReactNode;
}) {
  const [showSpam, setShowSpam] = useState(false);
  const spamTokens = useSpamTokens();
  const spamNfts = useSpamNfts();

  const { filtered, spamCount } = useMemo(() => {
    if (showSpam) return { filtered: items, spamCount: 0 };
    let spamCount = 0;
    const filtered = items.filter((item) => {
      if (!item.tx) return true;
      const { signer_id, receiver_id } = item.tx;
      const spam =
        isSpam(spamTokens, signer_id) ||
        isSpam(spamTokens, receiver_id) ||
        isSpamNft(spamNfts, signer_id) ||
        isSpamNft(spamNfts, receiver_id);
      if (spam) spamCount++;
      return !spam;
    });
    return { filtered, spamCount };
  }, [items, showSpam, spamTokens, spamNfts]);

  const spamProps: SpamFilterProps = { showSpam, setShowSpam, spamCount };
  const topBar =
    filterBar === null ? null : filterBar ? filterBar(spamProps) : <SpamFilterBar {...spamProps} />;

  return (
    <div className="rounded-xl border border-gray-200 bg-surface">
      {topBar}
      <div className="divide-y divide-gray-100">
        {filtered.map((item, i) => (
          <TxFeedRow key={`${item.hash}-${i}`} item={item} viewer={viewer} />
        ))}
      </div>
      {filtered.length === 0 && empty}
    </div>
  );
}
