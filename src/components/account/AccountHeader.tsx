import { Coins, FileCode, History, Landmark, Wallet } from "lucide-react";
import type { AccountState } from "../../api/rpc";
import type { AccountActivity } from "../../hooks/useAccountActivity";
import { computeUsdValue, formatUsd, type TokenPrice } from "../../hooks/useTokenPrices";
import useSpamTokens, { isSpam } from "../../hooks/useSpamTokens";
import { knownContract } from "../../data/knownContracts";
import { formatUnits, NEAR_DECIMALS, formatCount } from "../../utils/format";
import { formatMonthYear } from "../../utils/time";
import CopyButton from "../CopyButton";
import Skeleton from "../Skeleton";
import StatTile from "../StatTile";
import TimeAgo from "../TimeAgo";

export interface AccountTotals {
  /** Spendable + reserved NEAR on the account, yoctoNEAR */
  balance?: string;
  /** Number of tokens with a balance, not counting spam */
  tokenCount: number;
  /** Combined value of priced tokens, USD */
  tokenValue: number;
  /** NEAR in staking pools plus validator stake, yoctoNEAR; undefined while unknown */
  staked?: bigint;
  poolCount: number;
}

function nearUsd(yocto: string | bigint | undefined, prices: Map<string, TokenPrice> | null): number {
  const p = prices?.get("wrap.near");
  if (!p || yocto === undefined) return 0;
  return computeUsdValue(yocto.toString(), p.decimals, p.price);
}

export default function AccountHeader({
  accountId,
  state,
  exists,
  loading,
  totals,
  activity,
  prices,
}: {
  accountId: string;
  state: AccountState | null;
  /** false once we know the account is not on-chain */
  exists: boolean;
  loading: boolean;
  totals: AccountTotals;
  activity: AccountActivity | null;
  prices: Map<string, TokenPrice> | null;
}) {
  const spamSet = useSpamTokens();
  const known = knownContract(accountId);
  const spam = isSpam(spamSet, accountId);
  const balanceUsd = nearUsd(totals.balance, prices);
  const stakedUsd = nearUsd(totals.staked, prices);
  const netWorth = balanceUsd + stakedUsd + totals.tokenValue;
  const near = (yocto: string | bigint) => `${formatUnits(yocto.toString(), NEAR_DECIMALS)} NEAR`;

  return (
    <header className="space-y-4">
      <div>
        <div className="mb-1 flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium text-gray-500">Account</span>
          {known && (
            <span className="rounded-md bg-accent-100 px-2 py-0.5 text-xs font-semibold text-accent-800">
              {known.name}
            </span>
          )}
          {state?.hasContract && (
            <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
              <FileCode className="size-3.5" aria-hidden /> Smart contract
            </span>
          )}
          {spam && (
            <span className="rounded-md bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
              Flagged as spam
            </span>
          )}
        </div>
        <h1 className="flex items-start gap-1 text-xl font-semibold sm:text-2xl">
          <span className="[overflow-wrap:anywhere]">{accountId}</span>
          <CopyButton text={accountId} label="Copy account ID" />
        </h1>

        {/* One-paragraph summary */}
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-600">
          {!exists ? (
            <>
              This account does not exist on-chain right now.
              {activity && activity.total > 0 && " It may have been deleted; its past activity is listed below."}
            </>
          ) : loading && !totals.balance ? (
            <Skeleton className="h-4 w-80 max-w-full" />
          ) : (
            <>
              {totals.balance !== undefined && (
                <>
                  Holds <strong className="font-semibold text-gray-900">{near(totals.balance)}</strong>
                </>
              )}
              {totals.staked !== undefined && totals.staked > 0n && (
                <>
                  , has <strong className="font-semibold text-gray-900">{near(totals.staked)}</strong> staked
                </>
              )}
              {totals.tokenCount > 0 && (
                <>
                  {" "}and owns{" "}
                  <strong className="font-semibold text-gray-900">
                    {totals.tokenCount} {totals.tokenCount === 1 ? "other token" : "other tokens"}
                  </strong>
                </>
              )}
              {netWorth >= 0.01 && (
                <>
                  , worth about{" "}
                  <strong className="font-semibold text-gray-900">{formatUsd(netWorth)}</strong> in total at
                  current prices
                </>
              )}
              .
              {activity && activity.total > 0 && activity.first && (
                <>
                  {" "}Involved in{" "}
                  <strong className="font-semibold text-gray-900">
                    {formatCount(activity.total)}
                  </strong>{" "}
                  {activity.total === 1 ? "transaction" : "transactions"} since{" "}
                  {formatMonthYear(activity.first)}
                  {activity.last && (
                    <>
                      , most recently <TimeAgo timestampNs={activity.last} />
                    </>
                  )}
                  .
                </>
              )}
            </>
          )}
        </p>
      </div>

      {exists && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile
            label="NEAR balance"
            icon={<Wallet className="size-3.5" aria-hidden />}
            value={totals.balance !== undefined ? near(totals.balance) : <Skeleton className="h-6 w-24" />}
            sub={balanceUsd > 0 ? formatUsd(balanceUsd) : undefined}
          />
          <StatTile
            label="Other tokens"
            icon={<Coins className="size-3.5" aria-hidden />}
            value={
              loading ? (
                <Skeleton className="h-6 w-20" />
              ) : totals.tokenValue >= 0.01 ? (
                formatUsd(totals.tokenValue)
              ) : (
                totals.tokenCount.toLocaleString()
              )
            }
            sub={
              loading
                ? undefined
                : totals.tokenValue >= 0.01
                  ? `${totals.tokenCount} ${totals.tokenCount === 1 ? "token" : "tokens"}`
                  : totals.tokenCount === 1
                    ? "token"
                    : "tokens"
            }
          />
          <StatTile
            label="Staked"
            icon={<Landmark className="size-3.5" aria-hidden />}
            value={
              totals.staked !== undefined ? (
                totals.staked > 0n ? near(totals.staked) : "None"
              ) : totals.poolCount > 0 ? (
                `${totals.poolCount} ${totals.poolCount === 1 ? "pool" : "pools"}`
              ) : loading ? (
                <Skeleton className="h-6 w-20" />
              ) : (
                "None"
              )
            }
            sub={
              totals.staked !== undefined && totals.staked > 0n
                ? `${stakedUsd > 0 ? formatUsd(stakedUsd) + " · " : ""}${totals.poolCount} ${totals.poolCount === 1 ? "pool" : "pools"}`
                : undefined
            }
          />
          <StatTile
            label="Transactions"
            icon={<History className="size-3.5" aria-hidden />}
            value={activity ? activity.total.toLocaleString() : <Skeleton className="h-6 w-16" />}
            sub={activity?.first ? `since ${formatMonthYear(activity.first)}` : undefined}
          />
        </div>
      )}
    </header>
  );
}
