import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Cpu } from "lucide-react";
import { getBlock, getBlocks } from "../api/endpoints";
import type { BlockHeader, BlockTx } from "../api/types";
import useTxDetails from "../hooks/useTxDetails";
import useDocumentTitle from "../hooks/useDocumentTitle";
import { formatDateTime } from "../utils/time";
import AccountId from "../components/AccountId";
import BlockHeight from "../components/BlockHeight";
import Collapsible from "../components/Collapsible";
import CopyButton from "../components/CopyButton";
import GasAmount from "../components/GasAmount";
import InfiniteScrollSentinel from "../components/InfiniteScrollSentinel";
import NearAmount from "../components/NearAmount";
import Skeleton from "../components/Skeleton";
import TimeAgo from "../components/TimeAgo";
import TxFeed, { type TxFeedItem } from "../components/TxFeed";
import { formatCount } from "../utils/format";

const VISIBLE_STEP = 40;

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 py-2 sm:flex-row sm:gap-3">
      <dt className="w-36 shrink-0 text-gray-500">{label}</dt>
      <dd className="min-w-0 flex-1">{children}</dd>
    </div>
  );
}

export default function BlockDetail() {
  const { blockId } = useParams<{ blockId: string }>();
  const [block, setBlock] = useState<BlockHeader | null>(null);
  const [txs, setTxs] = useState<BlockTx[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(VISIBLE_STEP);
  const [nextBlockHeight, setNextBlockHeight] = useState<number | null>(null);
  useDocumentTitle(block ? `Block ${formatCount(block.block_height)}` : null);

  useEffect(() => {
    if (!blockId) return;
    let cancelled = false;
    setBlock(null);
    setTxs([]);
    setError(null);
    setVisibleCount(VISIBLE_STEP);
    setNextBlockHeight(null);
    getBlock(/^\d+$/.test(blockId) ? Number(blockId) : blockId, { with_transactions: true })
      .then((data) => {
        if (cancelled) return;
        if (!data.block) {
          setError("Block not found");
          return;
        }
        setBlock(data.block);
        setTxs(data.block_txs || []);
        // Fire-and-forget: fetch next block without blocking UI
        getBlocks({
          from_block_height: data.block.block_height + 1,
          desc: false,
          limit: 1,
        })
          .then((res) => {
            if (!cancelled && res.blocks.length > 0) {
              setNextBlockHeight(res.blocks[0].block_height);
            }
          })
          .catch(() => {});
      })
      .catch((err) => {
        if (!cancelled) setError(String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [blockId]);

  const visibleTxs = useMemo(() => txs.slice(0, visibleCount), [txs, visibleCount]);
  const hasMore = visibleCount < txs.length;

  const loadMore = useCallback(
    () => setVisibleCount((c) => Math.min(c + VISIBLE_STEP, txs.length)),
    [txs.length]
  );

  // Fetch details for visible txs + one step ahead for preloading
  const visibleHashes = useMemo(
    () => txs.slice(0, visibleCount + VISIBLE_STEP).map((t) => t.transaction_hash),
    [txs, visibleCount]
  );
  const { txMap } = useTxDetails(visibleHashes);

  // Rows appear at once from what the block endpoint returns and fill in as
  // full details load. Unfinished transactions are reported as unsuccessful
  // by the API, so the status is only trusted once `is_completed` is set.
  const feedItems: TxFeedItem[] = useMemo(
    () =>
      visibleTxs.map((btx) => ({
        hash: btx.transaction_hash,
        timestamp: btx.tx_block_timestamp,
        tx: txMap.get(btx.transaction_hash),
        hint: {
          signer: btx.real_signer_id || btx.signer_id,
          receiver: btx.real_receiver_id || btx.receiver_id,
          status: !btx.is_completed ? "pending" : btx.is_success ? "success" : "failed",
        },
      })),
    [visibleTxs, txMap]
  );

  if (error) {
    return (
      <div className="rounded-xl border border-gray-200 bg-surface px-4 py-8 text-center">
        <p className="font-medium text-red-600">{error}</p>
        <p className="mt-1 break-all font-mono text-xs text-gray-500">{blockId}</p>
      </div>
    );
  }
  if (!block) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading block">
        <Skeleton block className="h-8 w-56" />
        <Skeleton block className="h-32 w-full" />
      </div>
    );
  }

  const failed = txs.filter((t) => t.is_completed && !t.is_success).length;
  const navBtn =
    "inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-surface px-2.5 py-1 text-sm text-gray-600 hover:bg-gray-50";

  return (
    <div className="space-y-4">
      <header>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-semibold sm:text-2xl">
            <span className="font-medium text-gray-500">Block</span>{" "}
            {formatCount(block.block_height)}
          </h1>
          <nav aria-label="Neighbouring blocks" className="flex gap-2">
            {block.prev_block_height != null && (
              <Link to={`/block/${block.prev_block_height}`} className={navBtn}>
                <ChevronLeft className="size-4" aria-hidden /> Previous
              </Link>
            )}
            {nextBlockHeight != null && (
              <Link to={`/block/${nextBlockHeight}`} className={navBtn}>
                Next <ChevronRight className="size-4" aria-hidden />
              </Link>
            )}
          </nav>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          Produced by{" "}
          <span className="font-medium">
            <AccountId accountId={block.author_id} />
          </span>{" "}
          <TimeAgo timestampNs={block.block_timestamp} /> with{" "}
          <strong className="font-semibold text-gray-900">
            {formatCount(block.num_transactions)}{" "}
            {block.num_transactions === 1 ? "transaction" : "transactions"}
          </strong>
          {failed > 0 && <> ({failed} failed)</>}. Fees burnt:{" "}
          <NearAmount yoctoNear={block.tokens_burnt} showPrice />.
        </p>
      </header>

      <section className="rounded-xl border border-gray-200 bg-surface px-4 py-1 text-sm">
        <dl className="divide-y divide-gray-100">
          <Fact label="Time">{formatDateTime(block.block_timestamp)}</Fact>
          <Fact label="Produced by">
            <AccountId accountId={block.author_id} maxLength={64} />
          </Fact>
          <Fact label="Transactions">{formatCount(block.num_transactions)}</Fact>
          <Fact label="Hash">
            <span className="flex items-center gap-1">
              <span className="break-all font-mono text-xs text-gray-700">{block.block_hash}</span>
              <CopyButton text={block.block_hash} label="Copy block hash" />
            </span>
          </Fact>
        </dl>
      </section>

      <Collapsible
        dev
        title="Protocol details"
        icon={<Cpu className="size-4 text-gray-400" />}
        hint="Receipts, gas, epoch, chunks, protocol version"
      >
        <dl className="grid gap-x-8 text-sm sm:grid-cols-2">
          <Fact label="Receipts">{formatCount(block.num_receipts)}</Fact>
          <Fact label="Chunks">{block.chunks_included}</Fact>
          <Fact label="Gas used">
            <GasAmount gas={Number(block.gas_burnt)} />
          </Fact>
          <Fact label="Gas price">
            <NearAmount yoctoNear={block.gas_price} raw />
          </Fact>
          <Fact label="Protocol version">{block.protocol_version}</Fact>
          <Fact label="Previous block">
            {block.prev_block_height != null ? (
              <BlockHeight height={block.prev_block_height} />
            ) : (
              <span className="break-all font-mono text-xs">{block.prev_block_hash}</span>
            )}
          </Fact>
          <div className="sm:col-span-2">
            <Fact label="Epoch ID">
              <span className="break-all font-mono text-xs">{block.epoch_id}</span>
            </Fact>
          </div>
        </dl>
      </Collapsible>

      <section>
        <h2 className="mb-2 text-base font-semibold">
          Transactions{" "}
          <span className="font-normal text-gray-400">{formatCount(block.num_transactions)}</span>
        </h2>
        {txs.length > 0 ? (
          <>
            <TxFeed items={feedItems} />
            <InfiniteScrollSentinel onLoadMore={loadMore} hasMore={hasMore} />
          </>
        ) : (
          <p className="rounded-xl border border-gray-200 bg-surface px-4 py-8 text-center text-sm text-gray-500">
            This block contains no transactions.
          </p>
        )}
      </section>
    </div>
  );
}
