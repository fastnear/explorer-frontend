import { useState, useEffect } from "react";
import { viewAccessKeyList, type AccessKeySummary } from "../api/rpc";

// Loads an account's access-key summary via a single RPC call, off the render
// path — the page renders immediately and fills this in when it resolves.
export default function useAccessKeys(accountId: string | undefined): {
  data: AccessKeySummary | null;
  loading: boolean;
  error: string | null;
} {
  const [data, setData] = useState<AccessKeySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accountId) return;

    setData(null);
    setLoading(true);
    setError(null);

    const controller = new AbortController();

    viewAccessKeyList(accountId, controller.signal)
      .then((result) => {
        setData(result);
        setLoading(false);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(String(err));
        setLoading(false);
      });

    return () => controller.abort();
  }, [accountId]);

  return { data, loading, error };
}
