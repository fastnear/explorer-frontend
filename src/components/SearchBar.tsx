import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
  tx: "Transaction",
  account: "Account",
};

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const type = useMemo(() => detectType(query.trim()), [query]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q || !type) return;

    if (type === "block") {
      navigate(`/block/${q.replaceAll(",", "")}`);
    } else if (type === "tx") {
      navigate(`/tx/${q}`);
    } else {
      if (q.endsWith(".testnet") && networkId === "mainnet") {
        window.location.href = `${otherNetworkUrl}/account/${q}`;
      } else if ((q.endsWith(".near") || q.endsWith(".tg")) && networkId === "testnet") {
        window.location.href = `${otherNetworkUrl}/account/${q}`;
      } else {
        navigate(`/account/${q}`);
      }
    }
    setQuery("");
  }

  return (
    <form onSubmit={handleSearch} className="flex gap-2">
      <div className="relative flex-1">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by tx hash, block height, or account ID"
          className="w-full rounded-lg border border-gray-300 bg-surface px-4 py-2 pr-20 text-sm focus:border-blue-500 focus:outline-none"
        />
        {type && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
            {hintLabel[type]}
          </span>
        )}
      </div>
      <button
        type="submit"
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Search
      </button>
    </form>
  );
}
