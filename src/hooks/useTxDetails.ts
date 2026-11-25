import { useEffect, useRef, useState } from "react";
import { getTransactions } from "../api/endpoints";
import { parseTransaction, type ParsedTx } from "../utils/parseTransaction";

const BATCH_SIZE = 20;
// Transactions near the chain tip are often still executing when first fetched
const PENDING_RETRY_MS = 2500;
const PENDING_MAX_RETRIES = 4;

export default function useTxDetails(
  hashes: string[],
  key?: string,
  /** `prune` forgets transactions that are no longer requested, for feeds that run indefinitely */
  { prune = false }: { prune?: boolean } = {}
) {
  const [txMap, setTxMap] = useState<Map<string, ParsedTx>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const knownRef = useRef<Set<string>>(new Set());
  const retriesRef = useRef<Map<string, number>>(new Map());
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const pendingRef = useRef(0);
  const aliveRef = useRef(true);
  const prevKeyRef = useRef(key);

  // Reset on key change
  if (key !== prevKeyRef.current) {
    prevKeyRef.current = key;
    knownRef.current = new Set();
    retriesRef.current = new Map();
  }

  useEffect(() => {
    aliveRef.current = true;
    const timers = timersRef.current;
    return () => {
      aliveRef.current = false;
      timers.forEach(clearTimeout);
      timers.clear();
    };
  }, []);

  useEffect(() => {
    const missing = hashes.filter((h) => h && !knownRef.current.has(h));
    if (missing.length === 0) return;

    // Mark as known immediately to avoid duplicate fetches
    for (const h of missing) knownRef.current.add(h);

    const fetchBatch = (batch: string[], isRetry: boolean) => {
      if (!isRetry) {
        pendingRef.current++;
        setLoading(true);
        setError(null);
      }
      getTransactions(batch)
        .then((res) => {
          if (!aliveRef.current) return;
          const unfinished: string[] = [];
          const parsedList = res.transactions.map(parseTransaction);
          setTxMap((prev) => {
            const next = new Map(prev);
            for (const parsed of parsedList) next.set(parsed.hash, parsed);
            return next;
          });
          // Refetch transactions that are still executing, a few times
          for (const parsed of parsedList) {
            if (parsed.is_success !== null) continue;
            const tries = retriesRef.current.get(parsed.hash) ?? 0;
            if (tries >= PENDING_MAX_RETRIES) continue;
            retriesRef.current.set(parsed.hash, tries + 1);
            unfinished.push(parsed.hash);
          }
          if (unfinished.length > 0) {
            const timer = setTimeout(() => {
              timersRef.current.delete(timer);
              fetchBatch(unfinished, true);
            }, PENDING_RETRY_MS);
            timersRef.current.add(timer);
          }
        })
        .catch((err) => {
          if (isRetry) return;
          setError(String(err));
          for (const h of batch) knownRef.current.delete(h);
        })
        .finally(() => {
          if (isRetry) return;
          pendingRef.current--;
          if (pendingRef.current === 0) setLoading(false);
        });
    };

    // Batch into chunks of BATCH_SIZE to respect API limit; each batch is
    // fired independently so earlier batches render immediately
    for (let i = 0; i < missing.length; i += BATCH_SIZE) {
      fetchBatch(missing.slice(i, i + BATCH_SIZE), false);
    }
  }, [hashes.join(",")]);

  useEffect(() => {
    if (!prune) return;
    const keep = new Set(hashes);
    for (const h of knownRef.current) {
      if (keep.has(h)) continue;
      knownRef.current.delete(h);
      retriesRef.current.delete(h);
    }
    setTxMap((prev) => {
      const next = new Map([...prev].filter(([h]) => keep.has(h)));
      return next.size === prev.size ? prev : next;
    });
  }, [hashes.join(","), prune]);

  return { txMap, loading, error };
}
