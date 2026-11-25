import { useEffect, useState } from "react";
import { getAccount } from "../api/endpoints";

export interface AccountActivity {
  /** Number of transactions the account took part in, in any role */
  total: number;
  /** Timestamps (ns) of the earliest and latest indexed transaction */
  first?: string;
  last?: string;
}

/** Totals for the account header, independent of the activity tab's filters */
export default function useAccountActivity(accountId: string | undefined): AccountActivity | null {
  const [activity, setActivity] = useState<AccountActivity | null>(null);

  useEffect(() => {
    if (!accountId) return;
    let cancelled = false;
    setActivity(null);
    Promise.all([
      getAccount(accountId, { limit: 1 }),
      getAccount(accountId, { limit: 1, desc: false }),
    ])
      .then(([latest, earliest]) => {
        if (cancelled) return;
        setActivity({
          total: latest.txs_count || earliest.txs_count || 0,
          last: latest.account_txs[0]?.tx_block_timestamp,
          first: earliest.account_txs[0]?.tx_block_timestamp,
        });
      })
      .catch(() => {
        /* the header simply omits activity */
      });
    return () => {
      cancelled = true;
    };
  }, [accountId]);

  return activity;
}
