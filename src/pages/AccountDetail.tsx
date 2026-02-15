import { useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import { getAccount } from "../api/endpoints";
import type { AccountTx } from "../api/types";
import useTxDetails from "../hooks/useTxDetails";
import usePagedCache from "../hooks/usePagedCache";
import TxRow, { TxTableHeader } from "../components/TxRow";
import Pagination from "../components/Pagination";

const PAGE_SIZE = 20;

export default function AccountDetail() {
  const { accountId } = useParams<{ accountId: string }>();

  const fetchPage = useCallback(
    async (resumeToken?: string, limit?: number) => {
      const data = await getAccount(accountId!, {
        resume_token: resumeToken,
        limit: limit ?? PAGE_SIZE,
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
    goFirst,
    goNext,
    goPrev,
    loading,
    error,
    aheadItems,
  } = usePagedCache<AccountTx>({
    fetchPage,
    pageSize: PAGE_SIZE,
    key: accountId ?? "",
  });

  // Current page hashes first, then ahead pages for preloading.
  // useTxDetails fires each batch of 20 independently, so current page
  // renders as soon as its batch resolves without waiting for preloads.
  const hashes = useMemo(() => {
    const current = txns.map((t) => t.transaction_hash);
    const ahead = (aheadItems as AccountTx[]).map(
      (t) => t.transaction_hash
    );
    return [...current, ...ahead];
  }, [txns, aheadItems]);

  const { txMap } = useTxDetails(hashes, accountId);

  // Only show loading on Next when the next page's data isn't ready yet
  const nextPageReady =
    !hasNext ||
    (aheadItems.length > 0 &&
      txMap.has((aheadItems[0] as AccountTx).transaction_hash));
  const nextBusy = loading || !nextPageReady;

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

      <div className="min-w-fit rounded-lg border border-gray-200 bg-surface">
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

      <Pagination
        currentPage={currentPage}
        hasNext={hasNext}
        hasPrev={hasPrev}
        goFirst={goFirst}
        goPrev={goPrev}
        goNext={goNext}
        nextBusy={nextBusy}
      />
    </div>
  );
}
