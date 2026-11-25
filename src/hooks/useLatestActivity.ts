import { useEffect, useRef, useState } from "react";
import { getBlock, getBlocks } from "../api/endpoints";
import type { BlockHeader, BlockTx } from "../api/types";

const POLL_MS = 6000;
const BLOCKS = 100;
// Transactions in the newest blocks are usually still executing, so the feed
// starts a few blocks behind the tip.
const TIP_LAG = 3;
const TX_TARGET = 12;
const MAX_BLOCK_FETCHES = 6;
const CACHE_LIMIT = 60;

export interface LatestActivity {
  /** Most recent blocks, newest first */
  blocks: BlockHeader[];
  /** Most recent transactions, newest first */
  txs: BlockTx[];
  loading: boolean;
  error: string | null;
}

/**
 * Latest blocks and transactions for the home page, refreshed while the tab
 * is visible. There is no network-wide "latest transactions" endpoint, so the
 * list is assembled from the newest blocks.
 */
export default function useLatestActivity(): LatestActivity {
  const [blocks, setBlocks] = useState<BlockHeader[]>([]);
  const [txs, setTxs] = useState<BlockTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<Map<number, BlockTx[]>>(new Map());

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let running = false;

    const refresh = async () => {
      if (running || document.visibilityState !== "visible") return;
      running = true;
      try {
        const { blocks: latest } = await getBlocks({ limit: BLOCKS });
        if (cancelled) return;
        setBlocks(latest);
        setError(null);

        const cache = cacheRef.current;
        const collected: BlockTx[] = [];
        let fetches = 0;
        for (const block of latest.slice(TIP_LAG)) {
          if (collected.length >= TX_TARGET) break;
          if (block.num_transactions === 0) continue;
          let blockTxs = cache.get(block.block_height);
          if (!blockTxs) {
            if (fetches >= MAX_BLOCK_FETCHES) break;
            fetches++;
            const res = await getBlock(block.block_height, { with_transactions: true });
            if (cancelled) return;
            blockTxs = res.block_txs ?? [];
            cache.set(block.block_height, blockTxs);
          }
          // Newest first within the block too
          collected.push(...[...blockTxs].sort((a, b) => b.tx_index - a.tx_index));
        }
        // Keep the cache from growing for as long as the page stays open
        if (cache.size > CACHE_LIMIT) {
          const keep = new Set(latest.map((b) => b.block_height));
          for (const height of cache.keys()) if (!keep.has(height)) cache.delete(height);
        }
        setTxs(collected.slice(0, TX_TARGET));
      } catch (err) {
        if (!cancelled) setError(String(err));
      } finally {
        running = false;
        if (!cancelled) setLoading(false);
      }
    };

    const tick = () => {
      refresh().finally(() => {
        if (!cancelled) timer = setTimeout(tick, POLL_MS);
      });
    };
    tick();

    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return { blocks, txs, loading, error };
}
