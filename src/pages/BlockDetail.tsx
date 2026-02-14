import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { getBlock } from "../api/endpoints";
import type { BlockHeader, BlockTx } from "../api/types";
import BlockHash from "../components/BlockHash";
import AccountId from "../components/AccountId";
import useTxDetails from "../hooks/useTxDetails";
import TxRow, { TxTableHeader } from "../components/TxRow";

export default function BlockDetail() {
  const { blockId } = useParams<{ blockId: string }>();
  const [block, setBlock] = useState<BlockHeader | null>(null);
  const [txs, setTxs] = useState<BlockTx[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!blockId) return;
    getBlock(Number(blockId), { with_transactions: true })
      .then((data) => {
        setBlock(data.block);
        setTxs(data.block_txs || []);
      })
      .catch((err) => setError(String(err)));
  }, [blockId]);

  const hashes = useMemo(() => txs.map((t) => t.transaction_hash), [txs]);
  const { txMap, loading: detailsLoading } = useTxDetails(hashes);

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
                {txs.map((btx) => {
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
          {detailsLoading && (
            <p className="mt-4 text-gray-500">Loading transaction details...</p>
          )}
        </>
      )}
    </div>
  );
}
