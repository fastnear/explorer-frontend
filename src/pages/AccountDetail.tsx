import { useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import { getAccount } from "../api/endpoints";
import type { AccountTx } from "../api/types";
import useTxDetails from "../hooks/useTxDetails";
import usePagedCache from "../hooks/usePagedCache";
import TxRow, { TxTableHeader } from "../components/TxRow";

const PAGE_SIZE = 20;

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

  const hashes = useMemo(() => txns.map((t) => t.transaction_hash), [txns]);
  const { txMap, loading: detailsLoading } = useTxDetails(hashes);

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

      <div className="min-w-fit rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <TxTableHeader />
          <tbody>
            {txns.map((atx, i) => {
              const parsed = txMap.get(atx.transaction_hash);
              if (!parsed) return null;
              return (
                <TxRow
                  key={`${atx.transaction_hash}-${i}`}
                  tx={parsed}
                  timestamp={atx.tx_block_timestamp}
                />
              );
            })}
          </tbody>
        </table>
      </div>

      {(loading || detailsLoading) && (
        <p className="mt-4 text-gray-500">Loading...</p>
      )}

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
