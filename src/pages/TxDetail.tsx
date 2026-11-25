import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useLocation, useNavigate, Link } from "react-router-dom";
import { ArrowRightLeft, Layers, ListOrdered, TriangleAlert } from "lucide-react";
import { getReceipt, getTransactions } from "../api/endpoints";
import type { TransactionDetail } from "../api/types";
import { getMatchingWidgets } from "../widgets/registry";
import { parseTransaction } from "../utils/parseTransaction";
import { summarizeTx } from "../utils/summarizeTx";
import { displayAccountId, shortenMiddle } from "../utils/format";
import { findFailures } from "../utils/describeFailure";
import { formatDateTime } from "../utils/time";
import useDevMode from "../hooks/useDevMode";
import useDocumentTitle from "../hooks/useDocumentTitle";
import AccountId from "../components/AccountId";
import { ActionLine } from "../components/Action";
import BalanceChanges from "../components/BalanceChanges";
import BlockHeight from "../components/BlockHeight";
import Collapsible from "../components/Collapsible";
import CopyButton from "../components/CopyButton";
import GasAmount from "../components/GasAmount";
import KindBadge from "../components/KindBadge";
import NearAmount from "../components/NearAmount";
import ReceiptCard from "../components/ReceiptCard";
import Skeleton from "../components/Skeleton";
import StatusBadge from "../components/StatusBadge";
import TimeAgo from "../components/TimeAgo";
import TransferSummary, { NftTransferSummary } from "../components/TransferSummary";
import TxSummary from "../components/TxSummary";
import PublicKey from "../components/PublicKey";

const PENDING_POLL_MS = 2500;
const PENDING_MAX_POLLS = 12;

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 py-2 sm:flex-row sm:gap-3">
      <dt className="w-28 shrink-0 text-gray-500">{label}</dt>
      <dd className="min-w-0 flex-1">{children}</dd>
    </div>
  );
}

export default function TxDetail() {
  const { txHash } = useParams<{ txHash: string }>();
  const { hash, key: locationKey } = useLocation();
  const navigate = useNavigate();
  const devMode = useDevMode();
  const [tx, setTx] = useState<TransactionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollsRef = useRef(0);

  useEffect(() => {
    if (!txHash) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    pollsRef.current = 0;
    setTx(null);
    setError(null);

    const load = () => {
      getTransactions([txHash])
        .then((data) => {
          if (cancelled) return;
          const found = data.transactions[0];
          if (!found) {
            // Receipt IDs look exactly like transaction hashes: if this is one,
            // open the transaction it belongs to, at that receipt.
            getReceipt(txHash)
              .then((res) => {
                if (cancelled) return;
                if (res.receipt?.transaction_hash) {
                  navigate(`/tx/${res.receipt.transaction_hash}#receipt-${txHash}`, {
                    replace: true,
                  });
                } else {
                  setError("Transaction not found");
                }
              })
              .catch(() => {
                if (!cancelled) setError("Transaction not found");
              });
            return;
          }
          setTx(found);
          // Still executing: check again shortly so the page settles on its own
          if (
            parseTransaction(found).is_success === null &&
            pollsRef.current++ < PENDING_MAX_POLLS
          ) {
            timer = setTimeout(load, PENDING_POLL_MS);
          }
        })
        .catch((err) => {
          if (!cancelled) setError(String(err));
        });
    };
    load();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [txHash, navigate]);

  const parsed = useMemo(() => (tx ? parseTransaction(tx) : null), [tx]);
  const summary = useMemo(() => (parsed ? summarizeTx(parsed) : null), [parsed]);
  const failures = useMemo(
    () => (parsed && tx ? findFailures(parsed, tx.execution_outcome.outcome.status) : []),
    [parsed, tx]
  );
  const widgets = useMemo(
    () => (tx && parsed ? getMatchingWidgets(tx, parsed) : []),
    [tx, parsed]
  );

  useDocumentTitle(
    summary && parsed
      ? `${summary.badge} by ${displayAccountId(parsed.signer_id)}`
      : txHash
        ? `Transaction ${shortenMiddle(txHash)}`
        : null
  );

  // A link to a receipt opens the receipts section and scrolls to it
  const targetsReceipt = hash.startsWith("#receipt-");
  const loadedHash = parsed?.hash;
  useEffect(() => {
    if (!loadedHash || !hash) return;
    const id = requestAnimationFrame(() => {
      document
        .getElementById(hash.slice(1))
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => cancelAnimationFrame(id);
  }, [loadedHash, hash, locationKey]);

  if (error) {
    return (
      <div className="rounded-xl border border-gray-200 bg-surface px-4 py-8 text-center">
        <p className="font-medium text-red-600">{error}</p>
        <p className="mt-1 break-all font-mono text-xs text-gray-500">{txHash}</p>
      </div>
    );
  }
  if (!tx || !parsed || !summary) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading transaction">
        <Skeleton block className="h-6 w-40" />
        <Skeleton block className="h-8 w-3/4" />
        <Skeleton block className="h-40 w-full" />
      </div>
    );
  }

  const timestampNs = String(tx.execution_outcome.block_timestamp);
  const partial = summary.status === "success" && parsed.has_failed_receipts;
  const movements = parsed.transfers.length + parsed.nftTransfers.length;
  const explanationWidgets = widgets.filter((w) => w.type === "explanation");
  const utilityWidgets = widgets.filter((w) => w.type === "utility");

  return (
    <div className="space-y-4">
      {/* What happened, in one sentence */}
      <header>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-500">Transaction</span>
          <KindBadge kind={summary.kind} label={summary.badge} />
          <StatusBadge status={summary.status} partial={partial} />
        </div>
        <h1 className="text-xl font-semibold leading-snug sm:text-2xl">
          <TxSummary summary={summary} />
        </h1>
        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-500">
          {summary.app && (
            <>
              <span>
                on{" "}
                <Link to={`/account/${summary.app.id}`} className="font-medium text-gray-700 hover:underline">
                  {summary.app.name}
                </Link>
              </span>
              <span aria-hidden className="text-gray-300">·</span>
            </>
          )}
          <TimeAgo timestampNs={timestampNs} />
          {summary.note && (
            <>
              <span aria-hidden className="text-gray-300">·</span>
              <span>{summary.note}</span>
            </>
          )}
        </p>
      </header>

      {failures.length > 0 && (
        <div
          role="alert"
          className={`flex gap-3 rounded-xl border px-4 py-3 text-sm ${
            summary.status === "failed"
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-yellow-200 bg-yellow-50 text-yellow-800"
          }`}
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <div className="min-w-0 space-y-1">
            <p className="font-semibold">
              {summary.status !== "failed"
                ? "The transaction completed, but one of its steps failed."
                : movements === 0
                  ? "This transaction failed. No tokens moved; only the fee was paid."
                  : "This transaction failed part-way. Some steps completed first; see the balance changes below."}
            </p>
            {failures.slice(0, 3).map((f, i) => (
              <p key={i} className="[overflow-wrap:anywhere]">
                {f.where && (
                  <>
                    <AccountId accountId={f.where} />:{" "}
                  </>
                )}
                {f.message}
                {f.receiptId && (
                  <>
                    {" "}
                    {/* A router link, so the receipts section learns it must open */}
                    <Link to={{ hash: `#receipt-${f.receiptId}` }} replace className="underline">
                      details
                    </Link>
                  </>
                )}
              </p>
            ))}
            {failures.length > 3 && <p>and {failures.length - 3} more failed steps</p>}
          </div>
        </div>
      )}

      {explanationWidgets.map((w) => (
        <w.component key={w.id} tx={tx} parsed={parsed} />
      ))}

      {/* Who gained and lost what */}
      {movements > 0 && (
        <section className="rounded-xl border border-gray-200 bg-surface px-4 py-3 text-sm">
          <h2 className="mb-1 flex items-center gap-2 font-semibold text-gray-700">
            <ArrowRightLeft className="size-4 text-gray-400" aria-hidden />
            Balance changes
          </h2>
          <BalanceChanges tx={parsed} />
          <div className="mt-2 border-t border-gray-100 pt-2">
            <Collapsible
              card={false}
              title="Every transfer in order"
              count={movements}
              defaultOpen={devMode && movements <= 20}
            >
              <div className="flex flex-col gap-1.5 text-sm">
                {parsed.transfers.map((t, i) => (
                  <TransferSummary key={`ft-${i}`} transfer={t} />
                ))}
                {parsed.nftTransfers.map((t, i) => (
                  <NftTransferSummary key={`nft-${i}`} transfer={t} />
                ))}
              </div>
            </Collapsible>
          </div>
        </section>
      )}

      {/* Key facts */}
      <section className="rounded-xl border border-gray-200 bg-surface px-4 py-1 text-sm">
        <dl className="divide-y divide-gray-100">
          <Fact label="From">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <AccountId accountId={parsed.signer_id} maxLength={64} />
              {parsed.relayer_id && (
                <span className="text-gray-500">
                  fee paid by <AccountId accountId={parsed.relayer_id} />
                </span>
              )}
            </span>
          </Fact>
          {parsed.public_key && (
            <Fact label="Signed with">
              <PublicKey publicKey={parsed.public_key} />
            </Fact>
          )}
          <Fact label="To">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <AccountId accountId={parsed.receiver_id} maxLength={64} />
              {summary.app?.id === parsed.receiver_id && (
                <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                  {summary.app.name}
                </span>
              )}
            </span>
          </Fact>
          <Fact label="Time">
            <span className="flex flex-wrap items-center gap-x-2">
              <span>{formatDateTime(timestampNs)}</span>
              <span className="text-gray-500">
                in block <BlockHeight height={tx.execution_outcome.block_height} />
              </span>
            </span>
          </Fact>
          <Fact label="Fee">
            <span className="flex flex-wrap items-center gap-x-2">
              <NearAmount yoctoNear={parsed.fee} showPrice />
              {devMode && (
                <span className="text-gray-500">
                  <GasAmount gas={parsed.gas_burnt} />
                </span>
              )}
            </span>
          </Fact>
          <Fact label="Hash">
            <span className="flex items-center gap-1">
              <span className="break-all font-mono text-xs text-gray-700">{parsed.hash}</span>
              <CopyButton text={parsed.hash} label="Copy transaction hash" />
            </span>
          </Fact>
        </dl>
      </section>

      {/* What was asked for */}
      <Collapsible
        title={parsed.actions.length === 1 ? "What was requested" : "What was requested, step by step"}
        icon={<ListOrdered className="size-4 text-gray-400" />}
        count={parsed.actions.length > 1 ? parsed.actions.length : undefined}
        defaultOpen
      >
        <ol className="space-y-3 text-sm">
          {parsed.actions.map((a, i) => (
            <li key={i} className="flex gap-2">
              {parsed.actions.length > 1 && (
                <span className="w-5 shrink-0 text-right text-gray-400">{i + 1}.</span>
              )}
              <div className="min-w-0 flex-1">
                <ActionLine action={a} receiverId={parsed.receiver_id} />
              </div>
            </li>
          ))}
        </ol>
      </Collapsible>

      {/* Developer detail */}
      {tx.receipts.length > 0 && (
        <Collapsible
          dev
          forceOpen={targetsReceipt}
          title="Receipts"
          icon={<Layers className="size-4 text-gray-400" />}
          count={tx.receipts.length}
          hint="Each step the network executed, with logs and results"
        >
          <div className="space-y-3">
            {tx.receipts.map((r) => (
              <ReceiptCard key={r.receipt.receipt_id} r={r} />
            ))}
          </div>
        </Collapsible>
      )}

      {utilityWidgets.map((w) => (
        <w.component key={w.id} tx={tx} parsed={parsed} />
      ))}
    </div>
  );
}
