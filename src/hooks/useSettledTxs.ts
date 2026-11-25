import { useEffect, useMemo, useState } from "react";
import type { BlockTx } from "../api/types";
import type { ParsedTx } from "../utils/parseTransaction";
import useTxDetails from "./useTxDetails";

function newestFirst(a: BlockTx, b: BlockTx): number {
  return b.tx_block_height - a.tx_block_height || b.tx_index - a.tx_index;
}

/**
 * Turns a polled list of the latest transactions into one that is safe to show
 * in a live feed: a transaction joins the list only once its details have
 * loaded, so a refresh never swaps readable rows for placeholders. While
 * `paused`, the list stays exactly as it is and nothing new is requested.
 *
 * `rows` is empty until the first details arrive.
 */
export default function useSettledTxs(
  latest: BlockTx[],
  paused: boolean,
  limit: number
): { rows: BlockTx[]; txMap: Map<string, ParsedTx> } {
  // The newest list we are working towards; held still while paused
  const [candidates, setCandidates] = useState(latest);
  const [rows, setRows] = useState<BlockTx[]>([]);

  useEffect(() => {
    if (!paused) setCandidates(latest);
  }, [latest, paused]);

  // Rows on screen stay requested so their details are kept
  const hashes = useMemo(
    () => [...new Set([...candidates, ...rows].map((t) => t.transaction_hash))],
    [candidates, rows]
  );
  const { txMap } = useTxDetails(hashes, undefined, { prune: true });

  useEffect(() => {
    if (paused) return;
    setRows((prev) => {
      const ready = candidates.filter((t) => txMap.has(t.transaction_hash));
      if (ready.length === 0) return prev;
      const fresh = new Set(ready.map((t) => t.transaction_hash));
      const next = [...ready, ...prev.filter((t) => !fresh.has(t.transaction_hash))]
        .sort(newestFirst)
        .slice(0, limit);
      const unchanged =
        next.length === prev.length &&
        next.every((t, i) => t.transaction_hash === prev[i].transaction_hash);
      return unchanged ? prev : next;
    });
  }, [candidates, txMap, paused, limit]);

  return { rows, txMap };
}
