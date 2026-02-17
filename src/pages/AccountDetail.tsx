import { useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import { getAccount } from "../api/endpoints";
import type { AccountTx } from "../api/types";
import useTxDetails from "../hooks/useTxDetails";
import useInfiniteScroll from "../hooks/useInfiniteScroll";
import useAccountOverview from "../hooks/useAccountOverview";
import { TxTable } from "../components/TxRow";
import type { TxTableItem } from "../components/TxRow";
import InfiniteScrollSentinel from "../components/InfiniteScrollSentinel";
import AccountOverview from "../components/AccountOverview";

const BATCH_SIZE = 80;

export default function AccountDetail() {
  const { accountId } = useParams<{ accountId: string }>();

  const fetchPage = useCallback(
    async (resumeToken?: string, limit?: number) => {
      const data = await getAccount(accountId!, {
        resume_token: resumeToken,
        limit: limit ?? BATCH_SIZE,
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
    totalCount,
    hasMore,
    loadMore,
    loading,
    loadingMore,
    error,
    aheadItems,
  } = useInfiniteScroll<AccountTx>({
    fetchPage,
    batchSize: BATCH_SIZE,
    key: accountId ?? "",
  });

  // All accumulated hashes + prefetched ahead buffer for preloading
  const hashes = useMemo(() => {
    const current = txns.map((t) => t.transaction_hash);
    const ahead = (aheadItems as AccountTx[]).map(
      (t) => t.transaction_hash
    );
    return [...current, ...ahead];
  }, [txns, aheadItems]);

  const { txMap } = useTxDetails(hashes, accountId);
  const { data: overview, loading: overviewLoading, error: overviewError } = useAccountOverview(accountId);

  const txItems: TxTableItem[] = useMemo(
    () =>
      txns.flatMap((atx) => {
        const parsed = txMap.get(atx.transaction_hash);
        return parsed
          ? [{ tx: parsed, timestamp: atx.tx_block_timestamp }]
          : [];
      }),
    [txns, txMap]
  );

  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">
        Account: <span className="font-mono text-base">{accountId}</span>
      </h1>

      <AccountOverview data={overview} loading={overviewLoading} error={overviewError} />

      {totalCount > 0 && (
        <p className="mb-3 text-sm text-gray-600">
          Transactions ({totalCount.toLocaleString()})
        </p>
      )}

      <TxTable items={txItems} />

      <InfiniteScrollSentinel
        onLoadMore={loadMore}
        hasMore={hasMore}
        disabled={loading || txItems.length === 0}
        loadingMore={loadingMore}
      />
    </div>
  );
}
