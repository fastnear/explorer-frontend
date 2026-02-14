import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { getBlock } from "../api/endpoints";
import type { BlockHeader, BlockTx } from "../api/types";
import BlockHash from "../components/BlockHash";
import AccountId from "../components/AccountId";
import Pagination from "../components/Pagination";
import useTxDetails from "../hooks/useTxDetails";
import TxRow, { TxTableHeader } from "../components/TxRow";

const PAGE_SIZE = 20;

export default function BlockDetail() {
  const { blockId } = useParams<{ blockId: string }>();
  const [block, setBlock] = useState<BlockHeader | null>(null);
  const [txs, setTxs] = useState<BlockTx[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (!blockId) return;
    setPage(0);
    getBlock(Number(blockId), { with_transactions: true })
      .then((data) => {
        setBlock(data.block);
        setTxs(data.block_txs || []);
      })
      .catch((err) => setError(String(err)));
  }, [blockId]);

  const totalPages = Math.ceil(txs.length / PAGE_SIZE);
  const hasNext = page < totalPages - 1;
  const hasPrev = page > 0;

  const goFirst = useCallback(() => setPage(0), []);
  const goPrev = useCallback(() => setPage((p) => Math.max(0, p - 1)), []);
  const goNext = useCallback(
    () => setPage((p) => Math.min(totalPages - 1, p + 1)),
    [totalPages]
  );

  const pageTxs = useMemo(
    () => txs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [txs, page]
  );

  // Fetch details for current page + one page ahead for preloading
  const visibleHashes = useMemo(
    () => txs.slice(page * PAGE_SIZE, (page + 2) * PAGE_SIZE).map((t) => t.transaction_hash),
    [txs, page]
  );
  const { txMap } = useTxDetails(visibleHashes);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!block) return <p className="text-gray-500">Loading block...</p>;

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">
        Block #{block.block_height.toLocaleString()}
      </h1>

      <div className="mb-6 grid gap-3 rounded-lg border border-gray-200 bg-white p-4 text-sm sm:grid-cols-2">
        <div>
          <span className="text-gray-500">Hash: </span>
          <BlockHash hash={block.block_hash} />
        </div>
        <div>
          <span className="text-gray-500">Timestamp: </span>
          {new Date(Number(block.block_timestamp) / 1e6).toLocaleString()}
        </div>
        <div>
          <span className="text-gray-500">Author: </span>
          <AccountId accountId={block.author_id} />
        </div>
        <div>
          <span className="text-gray-500">Gas Used: </span>
          {(Number(block.gas_burnt) / 1e12).toFixed(2)} Tgas
        </div>
        <div>
          <span className="text-gray-500">Gas Price: </span>
          {block.gas_price}
        </div>
        <div>
          <span className="text-gray-500">Transactions: </span>
          {block.num_transactions}
        </div>
      </div>

      {txs.length > 0 && (
        <>
          <h2 className="mb-3 text-lg font-semibold">Transactions</h2>
          <div className="min-w-fit rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <TxTableHeader />
              <tbody>
                {pageTxs.map((btx) => {
                  const parsed = txMap.get(btx.transaction_hash);
                  if (!parsed) return null;
                  return (
                    <TxRow
                      key={btx.transaction_hash}
                      tx={parsed}
                      timestamp={btx.tx_block_timestamp}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={page}
            hasNext={hasNext}
            hasPrev={hasPrev}
            goFirst={goFirst}
            goPrev={goPrev}
            goNext={goNext}
          />
        </>
      )}
    </div>
  );
}
