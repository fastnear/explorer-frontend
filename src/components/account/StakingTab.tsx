import { Landmark, Loader2 } from "lucide-react";
import type { AccountPool } from "../../api/fastnearApi";
import type { StakingBalances } from "../../hooks/useStakingBalances";
import AccountId from "../AccountId";
import NearAmount from "../NearAmount";

// Rounding leftovers a pool cannot pay out are not worth showing
const DUST = 10n ** 19n; // 0.00001 NEAR

export default function StakingTab({
  pools,
  balances,
  validatorStake,
}: {
  pools: AccountPool[];
  balances: StakingBalances;
  /** NEAR locked because the account itself is a validator */
  validatorStake?: string;
}) {
  const hasValidatorStake = !!validatorStake && validatorStake !== "0";
  const big = (v: string | undefined) => {
    try {
      return BigInt(v ?? "0");
    } catch {
      return 0n;
    }
  };
  // Largest position first; pools the account has left sink to the bottom
  const sorted = [...pools].sort((a, b) => {
    const diff =
      big(balances.byPool.get(b.pool_id)?.staked) - big(balances.byPool.get(a.pool_id)?.staked);
    return diff > 0n ? 1 : diff < 0n ? -1 : 0;
  });

  if (pools.length === 0 && !hasValidatorStake) {
    return (
      <div className="rounded-xl border border-gray-200 bg-surface px-4 py-8 text-center text-sm text-gray-500">
        This account has not staked with any validator pool.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {hasValidatorStake && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-surface px-4 py-3 text-sm">
          <span className="text-gray-600">
            Validator stake <span className="text-gray-400">(locked while this account validates)</span>
          </span>
          <span className="font-medium">
            <NearAmount yoctoNear={validatorStake} showPrice />
          </span>
        </div>
      )}
      {pools.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                <th className="px-4 py-2.5 font-medium">Validator pool</th>
                <th className="px-4 py-2.5 text-right font-medium">Staked</th>
                <th className="px-4 py-2.5 text-right font-medium">Unstaked</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((pool) => {
                const b = balances.byPool.get(pool.pool_id);
                const pending = !b && balances.loading;
                return (
                  <tr key={pool.pool_id} className="border-b border-gray-100 last:border-b-0">
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-2">
                        <Landmark className="size-4 shrink-0 text-teal-700" aria-hidden />
                        <AccountId accountId={pool.pool_id} maxLength={36} />
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium">
                      {b ? (
                        big(b.staked) < DUST ? (
                          <span className="font-normal text-gray-400">Nothing staked now</span>
                        ) : (
                          <NearAmount yoctoNear={b.staked} showPrice />
                        )
                      ) : pending ? (
                        <Loader2 className="inline size-3.5 animate-spin text-gray-400" />
                      ) : (
                        <span className="font-normal text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {b ? (
                        big(b.unstaked) < DUST ? (
                          <span className="text-gray-400">—</span>
                        ) : (
                          <span className="inline-flex flex-col items-end">
                            <NearAmount yoctoNear={b.unstaked} />
                            <span className="text-xs text-gray-500">
                              {b.can_withdraw ? "ready to withdraw" : "still unlocking"}
                            </span>
                          </span>
                        )
                      ) : pending ? null : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
