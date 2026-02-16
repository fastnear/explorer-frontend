import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getTransactions } from "../api/endpoints";
import type { TransactionDetail, ReceiptWithOutcome } from "../api/types";
import { getMatchingWidgets } from "../widgets/registry";
import { parseTransaction, parseAction } from "../utils/parseTransaction";
import GasAmount from "../components/GasAmount";
import NearAmount from "../components/NearAmount";
import TransactionHash from "../components/TransactionHash";
import AccountId from "../components/AccountId";
import BlockHeight from "../components/BlockHeight";
import TimeAgo from "../components/TimeAgo";
import { ActionExpanded } from "../components/Action";
import Base64Data from "../components/Base64Data";
import JsonView from "@uiw/react-json-view";
import { darkTheme } from "@uiw/react-json-view/dark";
import { CircleCheck, CircleX, Radio } from "lucide-react";

function useIsDark() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return dark;
}

function EventLog({ log }: { log: string }) {
  const isDark = useIsDark();
  if (!log.startsWith("EVENT_JSON:")) {
    return <div className="whitespace-pre-wrap break-all rounded bg-gray-50 p-2 font-mono">{log}</div>;
  }
  try {
    const json = JSON.parse(log.slice("EVENT_JSON:".length));
    return (
      <div className="rounded bg-gray-50 p-2">
        <span className="font-semibold text-purple-700">
          {json.standard ?? "event"}
        </span>
        {json.event && (
          <span className="ml-1 text-gray-600">: {json.event}</span>
        )}
        {json.data && (
          <div className="mt-1 overflow-auto text-xs">
            <JsonView value={json.data} collapsed={2} displayDataTypes={false} displayObjectSize={false} shortenTextAfterLength={512} style={isDark ? darkTheme : undefined} />
          </div>
        )}
      </div>
    );
  } catch {
    return <div className="whitespace-pre-wrap break-all rounded bg-gray-50 p-2 font-mono">{log}</div>;
  }
}


function ReceiptResult({ status }: { status: Record<string, unknown> }) {
  const isDark = useIsDark();
  if ("SuccessReceiptId" in status) {
    return (
      <div className="overflow-auto rounded border border-gray-200 bg-gray-50 p-2 text-xs font-mono break-all">
        Receipt:{" "}
        <a href={`#receipt-${String(status.SuccessReceiptId)}`} className="text-blue-600 hover:underline">
          {String(status.SuccessReceiptId)}
        </a>
      </div>
    );
  }
  if ("SuccessValue" in status) {
    return <Base64Data base64={String(status.SuccessValue)} />;
  }
  if ("Failure" in status) {
    return (
      <div className="overflow-auto rounded border border-gray-200 bg-red-50 p-2 text-xs text-red-700">
        <JsonView value={status.Failure as object} collapsed={2} displayDataTypes={false} displayObjectSize={false} style={isDark ? darkTheme : undefined} />
      </div>
    );
  }
  return null;
}

function ReceiptCard({ r }: { r: ReceiptWithOutcome }) {
  const outcome = r.execution_outcome.outcome;
  const statusKey = Object.keys(outcome.status)[0];
  const isSuccess =
    statusKey === "SuccessValue" || statusKey === "SuccessReceiptId";

  const actions: unknown[] =
    (r.receipt.receipt as Record<string, unknown>)?.Action
      ? ((
          (r.receipt.receipt as Record<string, unknown>).Action as Record<
            string,
            unknown
          >
        )?.actions as unknown[]) ?? []
      : [];

  return (
    <div id={`receipt-${r.receipt.receipt_id}`} className="rounded-lg border border-gray-200 bg-surface text-sm">
      <dl className="grid gap-px sm:grid-cols-2 [&>div]:flex [&>div]:items-center [&>div]:gap-2 [&>div]:border-b [&>div]:border-gray-100 [&>div]:px-4 [&>div]:py-2 [&>div:last-child]:border-b-0 [&>div:nth-last-child(2)]:sm:border-b-0">
        <div className="sm:col-span-2">
          <dt className="shrink-0 text-gray-500">ID</dt>
          <dd className="flex flex-1 min-w-0 items-center justify-between gap-2">
            <span className="font-mono text-xs text-gray-400 break-all">
              {r.receipt.receipt_id}
            </span>
            <span className="flex shrink-0 items-center gap-1">
              {isSuccess ? (
                <CircleCheck className="size-3.5 text-green-600" />
              ) : (
                <CircleX className="size-3.5 text-red-600" />
              )}
            </span>
          </dd>
        </div>
        <div>
          <dt className="shrink-0 text-gray-500">Predecessor</dt>
          <dd>
            <AccountId accountId={r.receipt.predecessor_id} />
          </dd>
        </div>
        <div>
          <dt className="shrink-0 text-gray-500">Receiver</dt>
          <dd>
            <AccountId accountId={r.receipt.receiver_id} />
          </dd>
        </div>
        <div>
          <dt className="shrink-0 text-gray-500">Block</dt>
          <dd>
            <BlockHeight height={r.execution_outcome.block_height} />
          </dd>
        </div>
        <div>
          <dt className="shrink-0 text-gray-500">Time</dt>
          <dd>
            <TimeAgo
              timestampNs={String(r.receipt.block_timestamp)}
            />
          </dd>
        </div>
        <div>
          <dt className="shrink-0 text-gray-500">Gas Burnt</dt>
          <dd><GasAmount gas={outcome.gas_burnt} /></dd>
        </div>
        <div>
          <dt className="shrink-0 text-gray-500">Tokens Burnt</dt>
          <dd><NearAmount yoctoNear={outcome.tokens_burnt} /></dd>
        </div>
      </dl>

      {actions.length > 0 && (
        <div className="border-t border-gray-100 px-4 py-2">
          <p className="mb-1 text-xs font-medium text-gray-500">Actions</p>
          <div className="space-y-2 font-mono text-xs">
            {actions.map((a, i) => (
              <ActionExpanded
                key={i}
                action={parseAction(a as Record<string, unknown>)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-gray-100 px-4 py-2">
        <p className="mb-1 text-xs font-medium text-gray-500">Result</p>
        <ReceiptResult status={outcome.status} />
      </div>

      {outcome.logs.length > 0 && (
        <div className="border-t border-gray-100 px-4 py-2">
          <p className="mb-1 text-xs font-medium text-gray-500">Logs</p>
          <div className="space-y-1 text-xs">
            {outcome.logs.map((log, i) => (
              <EventLog key={i} log={log} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TxDetail() {
  const { txHash } = useParams<{ txHash: string }>();
  const [tx, setTx] = useState<TransactionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!txHash) return;
    getTransactions([txHash])
      .then((data) => {
        if (data.transactions.length > 0) {
          setTx(data.transactions[0]);
        } else {
          setError("Transaction not found");
        }
      })
      .catch((err) => setError(String(err)));
  }, [txHash]);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!tx) return <p className="text-gray-500">Loading transaction...</p>;

  const parsed = parseTransaction(tx);
  const allWidgets = getMatchingWidgets(tx);
  const explanationWidgets = allWidgets.filter((w) => w.type === "explanation");
  const utilityWidgets = allWidgets.filter((w) => w.type === "utility");

  // Total gas and tokens burnt across all outcomes
  let totalGas = tx.execution_outcome.outcome.gas_burnt;
  let totalTokensBurnt = BigInt(tx.execution_outcome.outcome.tokens_burnt);
  for (const r of tx.receipts) {
    totalGas += r.execution_outcome.outcome.gas_burnt;
    totalTokensBurnt += BigInt(r.execution_outcome.outcome.tokens_burnt);
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Transaction</h1>

      <div className="mb-6 rounded-lg border border-gray-200 bg-surface text-sm">
        <dl className="grid gap-px sm:grid-cols-2 [&>div]:flex [&>div]:items-center [&>div]:gap-2 [&>div]:border-b [&>div]:border-gray-100 [&>div]:px-4 [&>div]:py-2 [&>div:last-child]:border-b-0 [&>div:nth-last-child(2)]:sm:border-b-0">
          <div className="sm:col-span-2">
            <dt className="shrink-0 text-gray-500">Hash</dt>
            <dd className="flex flex-1 min-w-0 items-center justify-between gap-2">
              <span className="break-all">
                <TransactionHash hash={tx.transaction.hash} truncate={false} />
              </span>
              <span className="flex shrink-0 items-center gap-1">
                {parsed.is_success ? (
                  <CircleCheck className="size-3.5 text-green-600" />
                ) : (
                  <CircleX className="size-3.5 text-red-600" />
                )}
              </span>
            </dd>
          </div>
          <div>
            <dt className="shrink-0 text-gray-500">Signer</dt>
            <dd className="flex items-center gap-1">
              {parsed.relayer_id && (
                <Link
                  to={`/account/${parsed.relayer_id}`}
                  title={`Relayed by ${parsed.relayer_id}`}
                >
                  <Radio className="size-3.5 text-red-500" />
                </Link>
              )}
              <AccountId accountId={parsed.signer_id} />
            </dd>
          </div>
          <div>
            <dt className="shrink-0 text-gray-500">Receiver</dt>
            <dd>
              <AccountId accountId={parsed.receiver_id} />
            </dd>
          </div>
          <div>
            <dt className="shrink-0 text-gray-500">Block</dt>
            <dd>
              <BlockHeight height={tx.execution_outcome.block_height} />
            </dd>
          </div>
          <div>
            <dt className="shrink-0 text-gray-500">Time</dt>
            <dd>
              <TimeAgo
                timestampNs={String(tx.execution_outcome.block_timestamp)}
              />
            </dd>
          </div>
          <div>
            <dt className="shrink-0 text-gray-500">Gas Used</dt>
            <dd><GasAmount gas={totalGas} /></dd>
          </div>
          <div>
            <dt className="shrink-0 text-gray-500">Tokens Burnt</dt>
            <dd><NearAmount yoctoNear={totalTokensBurnt.toString()} /></dd>
          </div>
        </dl>
      </div>

      {explanationWidgets.map((w) => (
        <w.component key={w.id} tx={tx} />
      ))}

      {tx.receipts.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-lg font-semibold">
            Receipts ({tx.receipts.length})
          </h2>
          <div className="space-y-3">
            {tx.receipts.map((r) => (
              <ReceiptCard key={r.receipt.receipt_id} r={r} />
            ))}
          </div>
        </div>
      )}

      {utilityWidgets.map((w) => (
        <w.component key={w.id} tx={tx} />
      ))}
    </div>
  );
}
