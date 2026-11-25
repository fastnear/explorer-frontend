import { useState, useEffect, useMemo } from "react";
import {
  viewAccessKeys,
  summarizeAccessKeys,
  TooManyAccessKeysError,
  type AccessKeyInfo,
  type AccessKeySummary,
} from "../api/rpc";

export interface AccessKeysState {
  /** null while loading, for unknown accounts, or when the list could not be read */
  keys: AccessKeyInfo[] | null;
  /** Keys grouped by cryptography type; null whenever `keys` is */
  summary: AccessKeySummary | null;
  loading: boolean;
  /** Readable reason the list is missing */
  error: string | null;
}

// Loads an account's access keys via a single RPC call, off the render
// path — the page renders immediately and fills this in when it resolves.
export default function useAccessKeys(accountId: string | undefined): AccessKeysState {
  const [keys, setKeys] = useState<AccessKeyInfo[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accountId) return;

    setKeys(null);
    setLoading(true);
    setError(null);

    const controller = new AbortController();

    viewAccessKeys(accountId, controller.signal)
      .then((result) => {
        setKeys(result);
        setLoading(false);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(
          err instanceof TooManyAccessKeysError
            ? `This account has more than ${err.limit} access keys, too many to list here.`
            : "Could not load access keys."
        );
        setLoading(false);
      });

    return () => controller.abort();
  }, [accountId]);

  const summary = useMemo(() => (keys ? summarizeAccessKeys(keys) : null), [keys]);

  return { keys, summary, loading, error };
}
