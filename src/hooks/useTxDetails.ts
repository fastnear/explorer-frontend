import { useEffect, useState } from "react";
import { getTransactions } from "../api/endpoints";
import { parseTransaction, type ParsedTx } from "../utils/parseTransaction";

export default function useTxDetails(hashes: string[]) {
  const [txMap, setTxMap] = useState<Map<string, ParsedTx>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hashes.length === 0) {
      setTxMap(new Map());
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    getTransactions(hashes)
      .then((res) => {
        if (cancelled) return;
        const map = new Map<string, ParsedTx>();
        for (const tx of res.transactions) {
          const parsed = parseTransaction(tx);
          map.set(parsed.hash, parsed);
        }
        setTxMap(map);
      })
      .catch((err) => {
        if (!cancelled) setError(String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [hashes.join(",")]);

  return { txMap, loading, error };
}
