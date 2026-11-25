import { useEffect, useState } from "react";
import { viewPoolBalance, type PoolBalance } from "../api/rpc";

const MAX_POOLS = 30;

export interface StakingBalances {
  /** Positions loaded so far, by pool */
  byPool: Map<string, PoolBalance>;
  loading: boolean;
  /** Sum of staked + unstaked across loaded pools, yoctoNEAR */
  total: bigint;
}

/**
 * Loads an account's balance in each staking pool with one view call per pool.
 * `enabled` lets the caller hold off until the numbers are needed.
 */
export default function useStakingBalances(
  accountId: string | undefined,
  poolIds: string[],
  enabled: boolean
): StakingBalances {
  const [byPool, setByPool] = useState<Map<string, PoolBalance>>(new Map());
  const [loading, setLoading] = useState(false);
  const key = `${accountId}|${poolIds.join(",")}`;

  useEffect(() => {
    setByPool(new Map());
    if (!accountId || !enabled || poolIds.length === 0) return;
    let cancelled = false;
    setLoading(true);
    const pools = poolIds.slice(0, MAX_POOLS);
    Promise.all(
      pools.map((poolId) =>
        viewPoolBalance(poolId, accountId)
          .then((balance) => {
            if (cancelled) return;
            setByPool((prev) => new Map(prev).set(poolId, balance));
          })
          .catch(() => {
            /* pool without the standard view method — leave it without amounts */
          })
      )
    ).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [key, enabled]);

  let total = 0n;
  for (const b of byPool.values()) {
    try {
      total += BigInt(b.staked) + BigInt(b.unstaked);
    } catch {
      /* ignore malformed amounts */
    }
  }
  return { byPool, loading, total };
}
