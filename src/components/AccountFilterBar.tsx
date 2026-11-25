import { useState } from "react";
import type { AccountFilters } from "../api/types";
import type { SpamFilterProps } from "./TxFeed";
import { SlidersHorizontal, X } from "lucide-react";

type TriState = boolean | undefined;

function cycleTriState(value: TriState): TriState {
  if (value === undefined) return true;
  if (value === true) return false;
  return undefined;
}

function FilterChip({
  label,
  value,
  onClick,
}: {
  label: string;
  value: TriState;
  onClick: () => void;
}) {
  let cls: string;
  if (value === true) {
    cls = "bg-green-100 border-green-300 hover:bg-green-200 text-green-800";
  } else if (value === false) {
    cls = "bg-red-100 border-red-300 hover:bg-red-200 text-red-800";
  } else {
    cls = "bg-gray-100 border-gray-200 hover:bg-gray-200 text-gray-600";
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}
    >
      {label}
      {value !== undefined && (
        <span className="text-[10px]">{value ? "Yes" : "No"}</span>
      )}
    </button>
  );
}

interface FilterGroup {
  label: string;
  filters: { key: keyof AccountFilters; label: string }[];
}

const FILTER_GROUPS: FilterGroup[] = [
  {
    label: "Role of this account",
    filters: [
      { key: "is_signer", label: "Signer" },
      { key: "is_real_signer", label: "Real Signer" },
      { key: "is_delegated_signer", label: "Delegated Signer" },
      { key: "is_any_signer", label: "Any Signer" },
      { key: "is_receiver", label: "Receiver" },
      { key: "is_real_receiver", label: "Real Receiver" },
      { key: "is_predecessor", label: "Predecessor" },
      { key: "is_explicit_refund_to", label: "Refund Recipient" },
    ],
  },
  {
    label: "How it was involved",
    filters: [
      { key: "is_function_call", label: "Function Call" },
      { key: "is_action_arg", label: "Action Arg" },
      { key: "is_event_log", label: "Event Log" },
    ],
  },
  {
    label: "Status",
    filters: [{ key: "is_success", label: "Successful" }],
  },
];

// Keys that are not part of "which transactions", so presets leave them alone
const KEEP_KEYS: (keyof AccountFilters)[] = [
  "desc",
  "from_tx_block_height",
  "to_tx_block_height",
];

/**
 * Everyday views of an account's history. Each maps onto the API's role flags:
 * "Started by" is the real signer (the account itself, not a relayer paying the fee).
 * "Incoming" is everything it did not start, which includes tokens sent to it —
 * the recipient of a token transfer is never the receiver of a receipt, so the
 * receiver flags would miss those.
 */
const PRESETS: { id: string; label: string; title: string; filters: AccountFilters }[] = [
  { id: "all", label: "All", title: "Every transaction involving this account", filters: {} },
  {
    id: "sent",
    label: "Started by this account",
    title: "Transactions this account signed",
    filters: { is_real_signer: true },
  },
  {
    id: "received",
    label: "Incoming",
    title: "Transactions started by someone else that involve this account",
    filters: { is_real_signer: false },
  },
  {
    id: "failed",
    label: "Failed",
    title: "Transactions that did not succeed",
    filters: { is_success: false },
  },
];

function selection(filters: AccountFilters): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (!KEEP_KEYS.includes(key as keyof AccountFilters)) out[key] = value;
  }
  return out;
}

function activePreset(filters: AccountFilters): string | null {
  const current = JSON.stringify(selection(filters));
  return PRESETS.find((p) => JSON.stringify(p.filters) === current)?.id ?? null;
}

export default function AccountFilterBar({
  filters,
  onChange,
  spam,
}: {
  filters: AccountFilters;
  onChange: (filters: AccountFilters) => void;
  spam: SpamFilterProps;
}) {
  const [open, setOpen] = useState(false);
  const preset = activePreset(filters);
  const advancedCount =
    (preset === null ? Object.keys(selection(filters)).length : 0) +
    (filters.from_tx_block_height !== undefined ? 1 : 0) +
    (filters.to_tx_block_height !== undefined ? 1 : 0);

  const applyPreset = (next: AccountFilters) => {
    const kept: AccountFilters = {};
    for (const key of KEEP_KEYS) {
      if (filters[key] !== undefined) (kept as Record<string, unknown>)[key] = filters[key];
    }
    onChange({ ...kept, ...next });
  };

  const toggleFilter = (key: keyof AccountFilters) => {
    const current = filters[key] as TriState;
    const next = cycleTriState(current);
    const updated = { ...filters };
    if (next === undefined) {
      delete updated[key];
    } else {
      (updated as Record<string, boolean>)[key] = next;
    }
    onChange(updated);
  };

  const setNumberFilter = (key: "from_tx_block_height" | "to_tx_block_height", value: string) => {
    const updated = { ...filters };
    if (value === "") {
      delete updated[key];
    } else {
      const num = Number(value);
      if (!isNaN(num) && num >= 0) updated[key] = num;
    }
    onChange(updated);
  };

  const toggleOrder = () => {
    const updated = { ...filters };
    if (filters.desc === false) {
      delete updated.desc;
    } else {
      updated.desc = false;
    }
    onChange(updated);
  };

  const inputCls =
    "w-36 rounded border border-gray-200 bg-surface px-2 py-1 text-xs focus:border-blue-300 focus:outline-none";

  return (
    <div className="border-b border-gray-200">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Show">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              title={p.title}
              aria-pressed={preset === p.id}
              onClick={() => applyPreset(p.filters)}
              className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium ${
                preset === p.id
                  ? "bg-gray-900 text-gray-50"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {p.label}
            </button>
          ))}
          {preset === null && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
              Custom
              <button
                type="button"
                onClick={() => applyPreset({})}
                aria-label="Clear custom filters"
                className="cursor-pointer rounded-full hover:bg-blue-200"
              >
                <X className="size-3" />
              </button>
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!spam.showSpam && spam.spamCount > 0 && (
            <span className="mr-2 text-xs text-gray-400">
              Hiding {spam.spamCount} spam
            </span>
          )}
          <button
            type="button"
            onClick={toggleOrder}
            className="inline-flex cursor-pointer items-center gap-1 rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            {filters.desc === false ? "Oldest first" : "Newest first"}
          </button>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded px-2 py-1 text-xs font-medium ${
              advancedCount > 0
                ? "bg-blue-50 text-blue-700 hover:bg-blue-100"
                : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            }`}
          >
            <SlidersHorizontal className="size-3.5" />
            Advanced
            {advancedCount > 0 && (
              <span className="rounded-full bg-blue-200 px-1.5 text-[10px] font-semibold text-blue-800">
                {advancedCount}
              </span>
            )}
          </button>
        </div>
      </div>
      {open && (
        <div className="space-y-3 border-t border-gray-100 bg-gray-50 px-4 py-3">
          <p className="text-xs text-gray-500">
            Click a chip to require it (Yes), click again to exclude it (No), and once more to clear.
          </p>
          {FILTER_GROUPS.map((group) => (
            <div key={group.label}>
              <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                {group.label}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {group.filters.map(({ key, label }) => (
                  <FilterChip
                    key={key}
                    label={label}
                    value={filters[key] as TriState}
                    onClick={() => toggleFilter(key)}
                  />
                ))}
              </div>
            </div>
          ))}
          <div>
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Block Height Range
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="From"
                aria-label="From block height"
                defaultValue={filters.from_tx_block_height ?? ""}
                onBlur={(e) => setNumberFilter("from_tx_block_height", e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
                className={inputCls}
              />
              <span className="text-xs text-gray-400">to</span>
              <input
                type="number"
                placeholder="To"
                aria-label="To block height"
                defaultValue={filters.to_tx_block_height ?? ""}
                onBlur={(e) => setNumberFilter("to_tx_block_height", e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Spam
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={spam.showSpam}
                onChange={(e) => spam.setShowSpam(e.target.checked)}
                className="rounded"
              />
              Show spam transactions
              {spam.spamCount > 0 && (
                <span className="text-gray-400">({spam.spamCount} hidden)</span>
              )}
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
