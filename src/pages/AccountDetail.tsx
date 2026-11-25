import { useCallback, useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { getAccount } from "../api/endpoints";
import type { AccountTx } from "../api/types";
import type { AccountFtToken } from "../api/fastnearApi";
import useTxDetails from "../hooks/useTxDetails";
import useInfiniteScroll from "../hooks/useInfiniteScroll";
import useAccountOverview from "../hooks/useAccountOverview";
import useAccountState from "../hooks/useAccountState";
import useAccessKeys from "../hooks/useAccessKeys";
import useAccountFilters from "../hooks/useAccountFilters";
import useAccountActivity from "../hooks/useAccountActivity";
import useStakingBalances from "../hooks/useStakingBalances";
import useTokenPrices, { computeUsdValue } from "../hooks/useTokenPrices";
import useSpamTokens, { isSpam } from "../hooks/useSpamTokens";
import useSpamNfts, { isSpamNft } from "../hooks/useSpamNfts";
import useDocumentTitle from "../hooks/useDocumentTitle";
import TxFeed, { type TxFeedItem } from "../components/TxFeed";
import InfiniteScrollSentinel from "../components/InfiniteScrollSentinel";
import AccountFilterBar from "../components/AccountFilterBar";
import Tabs, { type TabDef } from "../components/Tabs";
import AccountHeader, { type AccountTotals } from "../components/account/AccountHeader";
import TokensTab from "../components/account/TokensTab";
import NftsTab from "../components/account/NftsTab";
import StakingTab from "../components/account/StakingTab";
import DetailsTab from "../components/account/DetailsTab";
import { formatCount } from "../utils/format";

const BATCH_SIZE = 80;
// Load every pool's balance up front only when there are few of them
const EAGER_POOLS = 8;

type TabId = "activity" | "tokens" | "nfts" | "staking" | "details";
const TAB_IDS: TabId[] = ["activity", "tokens", "nfts", "staking", "details"];

function hasBalance(token: AccountFtToken): boolean {
  return token.balance !== "" && token.balance !== "0";
}

export default function AccountDetail() {
  const { accountId } = useParams<{ accountId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { filters, setFilters, filterKey, hasActiveFilters } = useAccountFilters();
  useDocumentTitle(accountId);

  const tabParam = searchParams.get("tab") as TabId | null;
  const tab: TabId = tabParam && TAB_IDS.includes(tabParam) ? tabParam : "activity";
  const setTab = useCallback(
    (next: TabId) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          if (next === "activity") params.delete("tab");
          else params.set("tab", next);
          return params;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  /* ---- Activity feed ---- */
  const fetchPage = useCallback(
    async (resumeToken?: string, limit?: number) => {
      const data = await getAccount(accountId!, {
        resume_token: resumeToken,
        limit: limit ?? BATCH_SIZE,
        ...filters,
      });
      return {
        items: data.account_txs,
        resumeToken: data.resume_token,
        totalCount: data.txs_count,
      };
    },
    [accountId, filters]
  );

  const {
    items: txns,
    totalCount,
    hasMore,
    loadMore,
    loading,
    loadingMore,
    error,
    aheadItems,
  } = useInfiniteScroll<AccountTx>({
    fetchPage,
    batchSize: BATCH_SIZE,
    key: `${accountId ?? ""}:${filterKey}`,
  });

  // All accumulated hashes + prefetched ahead buffer for preloading
  const hashes = useMemo(() => {
    const current = txns.map((t) => t.transaction_hash);
    const ahead = (aheadItems as AccountTx[]).map((t) => t.transaction_hash);
    return [...current, ...ahead];
  }, [txns, aheadItems]);

  const { txMap } = useTxDetails(hashes, accountId);

  // Rows show up immediately as placeholders and fill in when details arrive.
  // The list endpoint cannot tell a pending transaction from a failed one, so
  // placeholders carry no status.
  const feedItems: TxFeedItem[] = useMemo(
    () =>
      txns.map((atx) => ({
        hash: atx.transaction_hash,
        timestamp: atx.tx_block_timestamp,
        tx: txMap.get(atx.transaction_hash),
      })),
    [txns, txMap]
  );

  /* ---- Holdings ---- */
  const overview = useAccountOverview(accountId);
  const accountState = useAccountState(accountId);
  const activity = useAccountActivity(accountId);
  const accessKeys = useAccessKeys(accountId);
  const { prices } = useTokenPrices();
  const spamTokens = useSpamTokens();
  const spamNfts = useSpamNfts();

  const data = overview.data;
  const state = accountState.data;
  const holdingsLoading = overview.loading || accountState.loading;

  const tokenGroups = useMemo(() => {
    const all = data?.tokens ?? [];
    const usd = (t: AccountFtToken) => {
      const p = prices?.get(t.contract_id);
      return p ? computeUsdValue(t.balance, p.decimals, p.price) : 0;
    };
    const held = all.filter(hasBalance);
    const clean = held
      .filter((t) => !isSpam(spamTokens, t.contract_id))
      .sort((a, b) => usd(b) - usd(a));
    return {
      clean,
      spam: held.filter((t) => isSpam(spamTokens, t.contract_id)),
      zero: all.filter((t) => !hasBalance(t)),
      value: clean.reduce((sum, t) => sum + usd(t), 0),
    };
  }, [data, prices, spamTokens]);

  const nftGroups = useMemo(() => {
    const all = data?.nfts ?? [];
    return {
      clean: all.filter((n) => !isSpamNft(spamNfts, n.contract_id)),
      spam: all.filter((n) => isSpamNft(spamNfts, n.contract_id)),
    };
  }, [data, spamNfts]);

  const pools = useMemo(() => data?.pools ?? [], [data]);
  const poolIds = useMemo(() => pools.map((p) => p.pool_id), [pools]);
  const staking = useStakingBalances(
    accountId,
    poolIds,
    poolIds.length <= EAGER_POOLS || tab === "staking"
  );

  // RPC is the live source; the indexed API is the fallback
  const balance = state?.amount ?? data?.state?.balance;
  const validatorStake = state?.locked ?? data?.state?.locked;
  const storageBytes = state?.storage_usage ?? data?.state?.storage_bytes;
  const exists =
    holdingsLoading || !!state || !!data?.state || !!accountState.error;

  const stakingKnown =
    pools.length === 0 || (!staking.loading && staking.byPool.size > 0);
  const totals: AccountTotals = {
    balance,
    tokenCount: tokenGroups.clean.length,
    tokenValue: tokenGroups.value,
    staked: stakingKnown
      ? staking.total + BigInt(validatorStake && /^\d+$/.test(validatorStake) ? validatorStake : "0")
      : undefined,
    poolCount: pools.length,
  };

  const tabs: TabDef<TabId>[] = [
    { id: "activity", label: "Activity" },
    { id: "tokens", label: "Tokens", count: tokenGroups.clean.length },
    { id: "nfts", label: "NFTs", count: nftGroups.clean.length },
    { id: "staking", label: "Staking", count: pools.length },
    { id: "details", label: "Details" },
  ];

  if (!accountId) return null;

  return (
    <div className="space-y-5">
      <AccountHeader
        accountId={accountId}
        state={state}
        exists={exists}
        loading={holdingsLoading}
        totals={totals}
        activity={activity}
        accessKeys={accessKeys.summary}
        prices={prices}
      />

      <Tabs tabs={tabs} active={tab} onChange={setTab} label="Account sections" />

      {tab === "activity" && (
        <div>
          {error ? (
            <p className="rounded-xl border border-gray-200 bg-surface px-4 py-8 text-center text-sm text-red-600">
              Could not load transactions: {error}
            </p>
          ) : (
            <>
              <TxFeed
                items={feedItems}
                viewer={accountId}
                filterBar={(spam) => (
                  <AccountFilterBar filters={filters} onChange={setFilters} spam={spam} />
                )}
                empty={
                  !loading && (
                    <p className="px-4 py-8 text-center text-sm text-gray-500">
                      {hasActiveFilters
                        ? "No transactions match these filters."
                        : "No transactions yet."}
                    </p>
                  )
                }
              />
              {hasActiveFilters && totalCount > 0 && (
                <p className="mt-2 text-right text-xs text-gray-500">
                  {formatCount(totalCount)} matching transactions
                </p>
              )}
              <InfiniteScrollSentinel
                onLoadMore={loadMore}
                hasMore={hasMore}
                disabled={loading || feedItems.length === 0}
                loadingMore={loadingMore}
              />
            </>
          )}
        </div>
      )}

      {tab === "tokens" && (
        <TokensTab
          tokens={tokenGroups.clean}
          spamTokens={tokenGroups.spam}
          zeroTokens={tokenGroups.zero}
          prices={prices}
        />
      )}
      {tab === "nfts" && <NftsTab nfts={nftGroups.clean} spamNfts={nftGroups.spam} />}
      {tab === "staking" && (
        <StakingTab pools={pools} balances={staking} validatorStake={validatorStake} />
      )}
      {tab === "details" && (
        <DetailsTab
          accountId={accountId}
          state={state}
          storageBytes={storageBytes}
          accessKeys={accessKeys}
        />
      )}
    </div>
  );
}
