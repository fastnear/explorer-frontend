import { useState, useMemo } from "react";
import type {
  AccountFullResponse,
  AccountFtToken,
} from "../api/fastnearApi";
import useTokenMetadata from "../hooks/useTokenMetadata";
import useTokenPrices, {
  computeUsdValue,
  type TokenPrice,
} from "../hooks/useTokenPrices";
import useSpamTokens, { isSpam } from "../hooks/useSpamTokens";
import useSpamNfts, { isSpamNft } from "../hooks/useSpamNfts";
import { TokenAmount } from "./TransferSummary";
import NearAmount from "./NearAmount";
import AccountId from "./AccountId";
import { ChevronDown, ChevronRight, Coins, Image, Landmark, Loader2 } from "lucide-react";

const VISIBLE_LIMIT = 3;

function formatStorageBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isNonZeroBalance(token: AccountFtToken): boolean {
  return token.balance !== "" && token.balance !== "0";
}

function getTokenUsdValue(
  token: AccountFtToken,
  prices: Map<string, TokenPrice> | null
): number {
  if (!prices) return 0;
  const p = prices.get(token.contract_id);
  if (!p) return 0;
  return computeUsdValue(token.balance, p.decimals, p.price);
}

function FtTokenRow({ token }: { token: AccountFtToken }) {
  const { metadata, loading } = useTokenMetadata(token.contract_id);
  const spamSet = useSpamTokens();
  const spam = isSpam(spamSet, token.contract_id);

  const spamClass = spam ? "opacity-50" : "";

  if (loading) {
    return (
      <div className={`flex items-center gap-2 py-1 text-sm ${spamClass}`}>
        <Loader2 className="size-3 animate-spin text-gray-400" />
        <AccountId accountId={token.contract_id} />
      </div>
    );
  }

  if (!metadata) {
    return (
      <div className={`flex items-center gap-2 py-1 text-sm ${spamClass}`}>
        <span className="font-mono">{token.balance}</span>
        <AccountId accountId={token.contract_id} />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 py-1 text-sm ${spamClass}`}>
      <TokenAmount
        amount={token.balance}
        meta={metadata}
        contractId={token.contract_id}
      />
    </div>
  );
}

function CollapsibleSection({
  icon,
  title,
  count,
  defaultOpen = true,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  if (count === 0) return null;

  return (
    <div>
      <button
        className="flex w-full items-center gap-1.5 text-left text-sm font-medium text-gray-700 hover:text-gray-900"
        onClick={() => setOpen(!open)}
      >
        {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        {icon}
        {title}
        <span className="font-normal text-gray-400">({count})</span>
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  );
}

function ExpandableList<T>({
  items,
  renderItem,
}: {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, VISIBLE_LIMIT);
  const hiddenCount = items.length - VISIBLE_LIMIT;

  return (
    <>
      <div>
        {visible.map((item, i) => renderItem(item, i))}
      </div>
      {hiddenCount > 0 && !expanded && (
        <button
          className="mt-1 text-sm text-blue-600 hover:underline"
          onClick={() => setExpanded(true)}
        >
          + {hiddenCount} more
        </button>
      )}
    </>
  );
}

function useSortedTokens(
  data: AccountFullResponse | null,
  prices: Map<string, TokenPrice> | null,
  spamSet: Set<string> | null
): AccountFtToken[] {
  return useMemo(() => {
    if (!data) return [];
    const nonZero = data.tokens.filter(isNonZeroBalance);
    return [...nonZero].sort((a, b) => {
      // Spam tokens always go to the bottom
      const aSpam = isSpam(spamSet, a.contract_id);
      const bSpam = isSpam(spamSet, b.contract_id);
      if (aSpam !== bSpam) return aSpam ? 1 : -1;
      // Then sort by USD value descending
      if (!prices) return 0;
      return getTokenUsdValue(b, prices) - getTokenUsdValue(a, prices);
    });
  }, [data, prices, spamSet]);
}

export default function AccountOverview({
  data,
  loading,
  error,
}: {
  data: AccountFullResponse | null;
  loading: boolean;
  error: string | null;
}) {
  const [showZero, setShowZero] = useState(false);
  const { prices } = useTokenPrices();
  const spamSet = useSpamTokens();
  const spamNfts = useSpamNfts();
  const sortedTokens = useSortedTokens(data, prices, spamSet);
  const sortedNfts = useMemo(() => {
    if (!data || !spamNfts) return data?.nfts ?? [];
    return [...data.nfts].sort((a, b) => {
      const aSpam = isSpamNft(spamNfts, a.contract_id);
      const bSpam = isSpamNft(spamNfts, b.contract_id);
      if (aSpam !== bSpam) return aSpam ? 1 : -1;
      return 0;
    });
  }, [data, spamNfts]);

  if (loading) {
    return (
      <div className="mb-6 flex items-center gap-2 text-sm text-gray-500">
        <Loader2 className="size-4 animate-spin" />
        Loading account overview...
      </div>
    );
  }

  if (error) {
    return (
      <p className="mb-6 text-sm text-red-600">
        Failed to load account overview
      </p>
    );
  }

  if (!data) return null;

  const { state, tokens, pools } = data;

  if (!state) {
    return (
      <p className="mb-6 text-sm text-gray-500">
        This account does not exist on-chain.
      </p>
    );
  }

  const zeroTokens = tokens.filter((t) => !isNonZeroBalance(t));
  const zeroCount = zeroTokens.length;

  return (
    <div className="mb-6 space-y-3 rounded-lg border border-gray-200 bg-surface px-4 py-4 text-sm">
      {/* State summary */}
      <dl className="grid gap-px sm:grid-cols-2 [&>div]:flex [&>div]:min-w-0 [&>div]:gap-2 [&>div]:py-1">
        <div>
          <dt className="shrink-0 text-gray-500">Balance</dt>
          <dd><NearAmount yoctoNear={state.balance} /></dd>
        </div>
        {state.locked !== "0" && (
          <div>
            <dt className="shrink-0 text-gray-500">Locked (Staked)</dt>
            <dd><NearAmount yoctoNear={state.locked} /></dd>
          </div>
        )}
        <div>
          <dt className="shrink-0 text-gray-500">Storage Used</dt>
          <dd>{formatStorageBytes(state.storage_bytes)}</dd>
        </div>
      </dl>

      <div className="grid grid-cols-1 sm:grid-cols-2 [&>div]:border-t [&>div]:border-gray-100 [&>div]:px-1 [&>div]:py-3">
        {/* Tokens */}
        <CollapsibleSection
          icon={<Coins className="size-4" />}
          title="Tokens"
          count={sortedTokens.length + zeroCount}
        >
          <ExpandableList
            items={sortedTokens}
            renderItem={(token) => (
              <FtTokenRow key={token.contract_id} token={token} />
            )}
          />
          {zeroCount > 0 && (
            <div className="mt-2 border-t border-gray-100 pt-2">
              <button
                className="text-sm text-gray-400 hover:text-gray-600"
                onClick={() => setShowZero(!showZero)}
              >
                {showZero ? "Hide" : "Show"} {zeroCount} zero-balance token{zeroCount !== 1 ? "s" : ""}
              </button>
              {showZero && (
                <ExpandableList
                  items={zeroTokens}
                  renderItem={(token) => (
                    <FtTokenRow key={token.contract_id} token={token} />
                  )}
                />
              )}
            </div>
          )}
        </CollapsibleSection>

        {/* NFT Contracts */}
        <CollapsibleSection
          icon={<Image className="size-4" />}
          title="NFT Contracts"
          count={sortedNfts.length}
        >
          <ExpandableList
            items={sortedNfts}
            renderItem={(nft) => {
              const spam = isSpamNft(spamNfts, nft.contract_id);
              return (
                <div key={nft.contract_id} className={`py-0.5${spam ? " opacity-50" : ""}`}>
                  <AccountId accountId={nft.contract_id} />
                </div>
              );
            }}
          />
        </CollapsibleSection>

        {/* Staking Pools */}
        <CollapsibleSection
          icon={<Landmark className="size-4" />}
          title="Staking Pools"
          count={pools.length}
          defaultOpen={pools.length > 0}
        >
          <ExpandableList
            items={pools}
            renderItem={(pool) => (
              <div key={pool.pool_id} className="py-0.5">
                <AccountId accountId={pool.pool_id} />
              </div>
            )}
          />
        </CollapsibleSection>
      </div>
    </div>
  );
}
