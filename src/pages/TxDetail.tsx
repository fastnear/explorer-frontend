import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getTransactions } from "../api/endpoints";
import type { TransactionDetail, ReceiptWithOutcome } from "../api/types";
import { getMatchingWidgets } from "../widgets/registry";
import { parseTransaction, parseAction } from "../utils/parseTransaction";
import { formatGas, formatNear } from "../utils/format";
import TransactionHash from "../components/TransactionHash";
import AccountId from "../components/AccountId";
import BlockHeight from "../components/BlockHeight";
import TimeAgo from "../components/TimeAgo";
import Action from "../components/Action";
import { CircleCheck, CircleX, Radio } from "lucide-react";

function EventLog({ log }: { log: string }) {
  if (!log.startsWith("EVENT_JSON:")) {
    return <div className="whitespace-pre-wrap break-all">{log}</div>;
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
          <pre className="mt-1 overflow-auto text-[11px] text-gray-500">
            {JSON.stringify(json.data, null, 2)}
          </pre>
        )}
      </div>
    );
  } catch {
    return <div className="whitespace-pre-wrap break-all">{log}</div>;
  }
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
    <div className="rounded-lg border border-gray-200 bg-white text-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2">
        <span className="font-mono text-xs text-gray-400 break-all">
          {r.receipt.receipt_id}
        </span>
        <span className="ml-2 flex items-center gap-1">
          {isSuccess ? (
            <CircleCheck className="size-3.5 text-green-600" />
          ) : (
            <CircleX className="size-3.5 text-red-600" />
          )}
        </span>
      </div>

      <dl className="grid gap-px sm:grid-cols-2 [&>div]:flex [&>div]:gap-2 [&>div]:border-b [&>div]:border-gray-100 [&>div]:px-4 [&>div]:py-2 [&>div:last-child]:border-b-0 [&>div:nth-last-child(2)]:sm:border-b-0">
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
          <dd>{formatGas(outcome.gas_burnt)}</dd>
        </div>
        <div>
          <dt className="shrink-0 text-gray-500">Tokens Burnt</dt>
          <dd>{formatNear(outcome.tokens_burnt)}</dd>
        </div>
        {actions.length > 0 && (
          <div className="sm:col-span-2">
            <dt className="shrink-0 text-gray-500">Actions</dt>
            <dd className="flex flex-wrap gap-2 font-mono text-xs">
              {actions.map((a, i) => (
                <Action
                  key={i}
                  action={parseAction(a as Record<string, unknown>)}
                />
              ))}
            </dd>
          </div>
        )}
      </dl>

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
  const widgets = getMatchingWidgets(tx);

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

      <div className="mb-6 rounded-lg border border-gray-200 bg-white text-sm">
        <dl className="grid gap-px sm:grid-cols-2 [&>div]:flex [&>div]:gap-2 [&>div]:border-b [&>div]:border-gray-100 [&>div]:px-4 [&>div]:py-3 [&>div:last-child]:border-b-0 [&>div:nth-last-child(2)]:sm:border-b-0">
          <div className="sm:col-span-2">
            <dt className="shrink-0 text-gray-500">Hash</dt>
            <dd className="min-w-0 break-all">
              <TransactionHash hash={tx.transaction.hash} truncate={false} />
            </dd>
          </div>
          <div>
            <dt className="shrink-0 text-gray-500">Status</dt>
            <dd className="flex items-center gap-1">
              {parsed.is_success ? (
                <>
                  <CircleCheck className="size-4 text-green-600" />
                  <span className="text-green-600">Success</span>
                </>
              ) : (
                <>
                  <CircleX className="size-4 text-red-600" />
                  <span className="text-red-600">Failure</span>
                </>
              )}
            </dd>
          </div>
          <div>
            <dt className="shrink-0 text-gray-500">Timestamp</dt>
            <dd>
              <TimeAgo
                timestampNs={String(tx.execution_outcome.block_timestamp)}
              />
            </dd>
          </div>
          <div>
            <dt className="shrink-0 text-gray-500">Block</dt>
            <dd>
              <BlockHeight height={tx.execution_outcome.block_height} />
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
          <div className="sm:col-span-2">
            <dt className="shrink-0 text-gray-500">Actions</dt>
            <dd className="flex flex-wrap gap-2 font-mono text-xs">
              {parsed.actions.map((a, i) => (
                <Action key={i} action={a} />
              ))}
            </dd>
          </div>
          <div>
            <dt className="shrink-0 text-gray-500">Gas Used</dt>
            <dd>{formatGas(totalGas)}</dd>
          </div>
          <div>
            <dt className="shrink-0 text-gray-500">Tokens Burnt</dt>
            <dd>{formatNear(totalTokensBurnt.toString())}</dd>
          </div>
        </dl>
      </div>

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

      {widgets.map((w) => (
        <w.component key={w.id} tx={tx} />
      ))}
    </div>
  );
}
