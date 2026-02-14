import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getTransactions } from "../api/endpoints";
import type { TransactionDetail } from "../api/types";
import { getMatchingWidgets } from "../widgets/registry";
import TransactionHash from "../components/TransactionHash";
import AccountId from "../components/AccountId";
import BlockHeight from "../components/BlockHeight";

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

  const statusKey = Object.keys(tx.execution_outcome.outcome.status)[0];
  const isSuccess =
    statusKey === "SuccessValue" || statusKey === "SuccessReceiptId";

  const widgets = getMatchingWidgets(tx);

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Transaction</h1>

      <div className="mb-6 grid gap-3 rounded-lg border border-gray-200 bg-white p-4 text-sm sm:grid-cols-2">
        <div className="sm:col-span-2">
          <span className="text-gray-500">Hash: </span>
          <TransactionHash hash={tx.transaction.hash} truncate={false} />
        </div>
        <div>
          <span className="text-gray-500">Signer: </span>
          <AccountId accountId={tx.transaction.signer_id} />
        </div>
        <div>
          <span className="text-gray-500">Receiver: </span>
          <AccountId accountId={tx.transaction.receiver_id} />
        </div>
        <div>
          <span className="text-gray-500">Block: </span>
          <BlockHeight height={tx.execution_outcome.block_height} />
        </div>
        <div>
          <span className="text-gray-500">Status: </span>
          <span className={isSuccess ? "text-green-600" : "text-red-600"}>
            {statusKey}
          </span>
        </div>
      </div>

      {tx.receipts.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-lg font-semibold">
            Receipts ({tx.receipts.length})
          </h2>
          <div className="space-y-2">
            {tx.receipts.map((r) => {
              const rStatus = Object.keys(
                r.execution_outcome.outcome.status
              )[0];
              const rSuccess =
                rStatus === "SuccessValue" || rStatus === "SuccessReceiptId";
              return (
                <div
                  key={r.receipt.receipt_id}
                  className="rounded-lg border border-gray-200 bg-white p-3 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-gray-500 break-all">
                      {r.receipt.receipt_id}
                    </span>
                    <span
                      className={`ml-2 text-xs ${rSuccess ? "text-green-600" : "text-red-600"}`}
                    >
                      {rStatus}
                    </span>
                  </div>
                  <div className="mt-1 text-xs">
                    <span className="text-gray-500">
                      {r.receipt.predecessor_id}
                    </span>
                    {" → "}
                    <span className="font-medium">{r.receipt.receiver_id}</span>
                  </div>
                  {r.execution_outcome.outcome.logs.length > 0 && (
                    <pre className="mt-2 overflow-auto rounded bg-gray-100 p-2 text-xs">
                      {r.execution_outcome.outcome.logs.join("\n")}
                    </pre>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {widgets.map((w) => (
        <w.component key={w.id} tx={tx} />
      ))}
    </div>
  );
}
