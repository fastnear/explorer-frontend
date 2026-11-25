import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, Blocks as BlocksIcon, Box, CircleDollarSign, Coins, Pause, Timer } from "lucide-react";
import type { BlockHeader } from "../api/types";
import useLatestActivity from "../hooks/useLatestActivity";
import useSettledTxs from "../hooks/useSettledTxs";
import useTokenPrices from "../hooks/useTokenPrices";
import { networkId } from "../config";
import AccountId from "../components/AccountId";
import BlockHeight from "../components/BlockHeight";
import SearchBar from "../components/SearchBar";
import Skeleton from "../components/Skeleton";
import StatTile from "../components/StatTile";
import TimeAgo from "../components/TimeAgo";
import TxFeed, { type TxFeedItem } from "../components/TxFeed";

const BLOCKS_SHOWN = 10;
const TXS_SHOWN = 12;

interface NetworkStats {
  height: number;
  /** Average seconds between blocks over the sampled window */
  blockTime: number;
  /** Transactions per second over the sampled window */
  tps: number;
  /** Total NEAR supply, in whole NEAR */
  supply: number;
}

function computeStats(blocks: BlockHeader[]): NetworkStats | null {
  if (blocks.length < 2) return null;
  const newest = blocks[0];
  const oldest = blocks[blocks.length - 1];
  const seconds = (Number(newest.block_timestamp) - Number(oldest.block_timestamp)) / 1e9;
  if (seconds <= 0) return null;
  // Transactions in the oldest block happened before the window started
  const txs = blocks.slice(0, -1).reduce((sum, b) => sum + b.num_transactions, 0);
  return {
    height: newest.block_height,
    blockTime: seconds / (blocks.length - 1),
    tps: txs / seconds,
    supply: Number(BigInt(newest.total_supply) / 10n ** 24n),
  };
}

function compactNumber(n: number): string {
  return n.toLocaleString(undefined, { notation: "compact", maximumFractionDigits: 2 });
}

export default function Home() {
  const { blocks, txs, loading, error } = useLatestActivity();
  const { prices } = useTokenPrices();
  const stats = useMemo(() => computeStats(blocks), [blocks]);
  const nearPrice = prices?.get("wrap.near")?.price;

  // The feed holds still while the mouse is over it, and new transactions
  // join it only once they can be shown as a sentence.
  const [paused, setPaused] = useState(false);
  const { rows, txMap } = useSettledTxs(txs, paused, TXS_SHOWN);
  const feedItems: TxFeedItem[] = useMemo(
    () =>
      // Before the first details arrive, show what we know as placeholders
      (rows.length > 0 ? rows : txs).map((t) => ({
        hash: t.transaction_hash,
        timestamp: t.tx_block_timestamp,
        tx: txMap.get(t.transaction_hash),
        hint: {
          signer: t.real_signer_id || t.signer_id,
          receiver: t.real_receiver_id || t.receiver_id,
          // The API reports unfinished transactions as not successful
          status: !t.is_completed ? "pending" : t.is_success ? "success" : "failed",
        },
      })),
    [rows, txs, txMap]
  );

  const placeholder = <Skeleton className="h-6 w-20" />;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-accent-200 bg-accent-50 px-4 py-8 sm:px-8 sm:py-10">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          See what is happening on NEAR
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-gray-600 sm:text-base">
          Look up any account, transaction or block{networkId === "testnet" ? " on testnet" : ""} and
          read what happened in plain language.
        </p>
        <div className="mt-5 max-w-2xl">
          <SearchBar size="large" />
        </div>
      </section>

      <section aria-label="Network at a glance" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile
          label="Latest block"
          icon={<Box className="size-3.5" aria-hidden />}
          value={stats ? <BlockHeight height={stats.height} /> : placeholder}
        />
        <StatTile
          label="Block time"
          icon={<Timer className="size-3.5" aria-hidden />}
          value={stats ? `${stats.blockTime.toFixed(2)} s` : placeholder}
          sub="average, last 100 blocks"
        />
        <StatTile
          label="Transactions"
          icon={<Activity className="size-3.5" aria-hidden />}
          value={stats ? `${stats.tps.toFixed(1)} / s` : placeholder}
          sub="average, last 100 blocks"
        />
        <StatTile
          label="NEAR price"
          icon={<CircleDollarSign className="size-3.5" aria-hidden />}
          value={nearPrice ? `$${nearPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 })}` : placeholder}
        />
        <StatTile
          label="Total supply"
          icon={<Coins className="size-3.5" aria-hidden />}
          value={stats ? `${compactNumber(stats.supply)} NEAR` : placeholder}
          sub={stats && nearPrice ? `$${compactNumber(stats.supply * nearPrice)} at current price` : undefined}
        />
      </section>

      {error && blocks.length === 0 && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Could not load the latest activity: {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <section
          className="min-w-0 lg:col-span-3"
          // Touch has no hover to end, so only a mouse pauses the feed
          onPointerEnter={(e) => e.pointerType === "mouse" && setPaused(true)}
          onPointerLeave={() => setPaused(false)}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <Activity className="size-4 text-gray-400" aria-hidden />
              Latest transactions
            </h2>
            {paused && rows.length > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                <Pause className="size-3" aria-hidden /> Paused while you hover
              </span>
            )}
          </div>
          <TxFeed
            items={feedItems}
            filterBar={null}
            empty={
              <p className="px-4 py-8 text-center text-sm text-gray-500">
                {loading ? "Loading…" : "No recent transactions."}
              </p>
            }
          />
        </section>

        <section className="min-w-0 lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <BlocksIcon className="size-4 text-gray-400" aria-hidden />
              Latest blocks
            </h2>
            <Link to="/blocks" className="text-sm text-blue-600 hover:underline">
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-surface">
            {blocks.slice(0, BLOCKS_SHOWN).map((b) => (
              <div key={b.block_height} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <div className="min-w-0">
                  <div className="font-medium">
                    <BlockHeight height={b.block_height} />
                  </div>
                  <div className="flex min-w-0 items-center gap-1 text-xs text-gray-500">
                    <span className="shrink-0">by</span>
                    <AccountId accountId={b.author_id} maxLength="auto" />
                  </div>
                </div>
                <div className="shrink-0 text-right text-xs text-gray-500">
                  <div className="text-sm text-gray-700">
                    {b.num_transactions} {b.num_transactions === 1 ? "transaction" : "transactions"}
                  </div>
                  <TimeAgo timestampNs={b.block_timestamp} />
                </div>
              </div>
            ))}
            {blocks.length === 0 &&
              Array.from({ length: BLOCKS_SHOWN }, (_, i) => (
                <div key={i} className="px-4 py-3">
                  <Skeleton className="h-4 w-40" />
                </div>
              ))}
          </div>
        </section>
      </div>
    </div>
  );
}
