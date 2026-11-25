import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { networkId, otherNetworkUrl } from "../config";
import { decodeBase58 } from "../utils/format";

function detectType(q: string): "block" | "tx" | "account" | null {
  if (!q) return null;
  const stripped = q.replaceAll(",", "");
  if (/^\d+$/.test(stripped)) return "block";
  if (q.length < 50 && decodeBase58(q)?.length === 32) return "tx";
  return "account";
}

const hintLabel: Record<string, string> = {
  block: "Block",
  // A receipt ID has the same shape; the transaction page resolves either
  tx: "Transaction or receipt",
  account: "Account",
};

export default function SearchBar({ size = "normal" }: { size?: "normal" | "large" }) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const type = useMemo(() => detectType(query.trim()), [query]);
  const large = size === "large";

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q || !type) return;

    if (type === "block") {
      navigate(`/block/${q.replaceAll(",", "")}`);
    } else if (type === "tx") {
      navigate(`/tx/${q}`);
    } else {
      const id = q.toLowerCase();
      if (id.endsWith(".testnet") && networkId === "mainnet") {
        window.location.href = `${otherNetworkUrl}/account/${id}`;
      } else if ((id.endsWith(".near") || id.endsWith(".tg")) && networkId === "testnet") {
        window.location.href = `${otherNetworkUrl}/account/${id}`;
      } else {
        navigate(`/account/${id}`);
      }
    }
    setQuery("");
  }

  return (
    <form onSubmit={handleSearch} role="search" className="flex gap-2">
      <div className="relative flex-1">
        <Search
          className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-gray-400 ${large ? "left-4 size-5" : "left-3 size-4"}`}
          aria-hidden
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-label="Search by account, transaction hash, receipt ID or block"
          placeholder={
            large ? "Account, transaction hash or block number" : "Search account, transaction or block"
          }
          className={`w-full rounded-xl border border-gray-300 bg-surface text-gray-900 placeholder:text-gray-400 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-200 ${
            large ? "py-3 pl-12 text-base" : "py-2 pl-9 text-sm"
          } ${type ? (type === "tx" ? "pr-40" : "pr-20") : "pr-3"
          }`}
        />
        {type && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
            {hintLabel[type]}
          </span>
        )}
      </div>
      <button
        type="submit"
        className={`cursor-pointer rounded-xl bg-gray-900 font-medium text-gray-50 hover:bg-gray-700 ${
          large ? "px-5 py-3 text-base" : "px-3 py-2 text-sm sm:px-4"
        }`}
      >
        <Search className="size-4 sm:hidden" aria-hidden />
        <span className="sr-only sm:not-sr-only">Search</span>
      </button>
    </form>
  );
}
