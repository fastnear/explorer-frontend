import { useCallback } from "react";
import { useParams } from "react-router-dom";
import { getAccount } from "../api/endpoints";
import type { AccountTx } from "../api/types";
import TransactionHash from "../components/TransactionHash";
import BlockHeight from "../components/BlockHeight";
import { timeAgo } from "../utils/time";
import usePagedCache from "../hooks/usePagedCache";

const PAGE_SIZE = 25;

function roleBadge(tx: AccountTx): string {
  if (tx.is_signer && tx.is_receiver) return "Signer & Receiver";
  if (tx.is_signer) return "Signer";
  if (tx.is_receiver) return "Receiver";
  return "";
}

export default function AccountDetail() {
  const { accountId } = useParams<{ accountId: string }>();

  const fetchPage = useCallback(
    async (resumeToken?: string) => {
      const data = await getAccount(accountId!, {
        resume_token: resumeToken,
        limit: PAGE_SIZE,
      });
      return {
        items: data.account_txs,
        resumeToken: data.resume_token,
        totalCount: data.txs_count,
      };
    },
    [accountId]
  );

  const {
    items: txns,
    currentPage,
    totalCount,
    hasNext,
    hasPrev,
    goNext,
    goPrev,
    loading,
    error,
  } = usePagedCache<AccountTx>({
    fetchPage,
    pageSize: PAGE_SIZE,
    key: accountId ?? "",
  });

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">
        Account: <span className="font-mono text-base">{accountId}</span>
      </h1>

      {totalCount > 0 && (
        <p className="mb-3 text-sm text-gray-600">
          Transactions ({totalCount.toLocaleString()})
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
              <th className="px-4 py-3">Tx Hash</th>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Block</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {txns.map((tx, i) => (
              <tr
                key={`${tx.transaction_hash}-${i}`}
                className="border-b border-gray-100 hover:bg-gray-50"
              >
                <td className="px-4 py-3">
                  <TransactionHash hash={tx.transaction_hash} />
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {timeAgo(tx.tx_block_timestamp)}
                </td>
                <td className="px-4 py-3 text-gray-700">{roleBadge(tx)}</td>
                <td className="px-4 py-3">
                  <BlockHeight height={tx.tx_block_height} />
                </td>
                <td className="px-4 py-3">
                  <span
                    className={
                      tx.is_success ? "text-green-600" : "text-red-600"
                    }
                  >
                    {tx.is_success ? "Success" : "Failed"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {loading && <p className="mt-4 text-gray-500">Loading...</p>}

      {!loading && totalCount > 0 && (
        <div className="mt-4 flex items-center gap-4">
          <button
            onClick={goPrev}
            disabled={!hasPrev}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Prev
          </button>
          <span className="text-sm text-gray-600">
            Page {currentPage + 1} of {totalPages}
          </span>
          <button
            onClick={goNext}
            disabled={!hasNext}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
