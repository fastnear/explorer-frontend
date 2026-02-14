import { useEffect, useState } from "react";
import { getBlocks } from "../api/endpoints";
import type { BlockHeader } from "../api/types";
import BlockHeight from "../components/BlockHeight";
import AccountId from "../components/AccountId";

function timeAgo(timestampNs: string): string {
  const seconds = Math.floor((Date.now() - Number(timestampNs) / 1e6) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function Home() {
  const [blocks, setBlocks] = useState<BlockHeader[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const data = await getBlocks({ limit: 20, desc: true });
        if (active) setBlocks(data.blocks);
      } catch (err) {
        if (active) setError(String(err));
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  if (error) {
    return <p className="text-red-600">Error loading blocks: {error}</p>;
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Latest Blocks</h1>
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
              <th className="px-4 py-3">Height</th>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Author</th>
              <th className="px-4 py-3 text-right">Txns</th>
              <th className="px-4 py-3 text-right">Receipts</th>
              <th className="px-4 py-3 text-right">Gas Used</th>
            </tr>
          </thead>
          <tbody>
            {blocks.map((b) => (
              <tr
                key={b.block_height}
                className="border-b border-gray-100 hover:bg-gray-50"
              >
                <td className="px-4 py-3">
                  <span className="font-medium">
                    <BlockHeight height={b.block_height} />
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {timeAgo(b.block_timestamp)}
                </td>
                <td className="px-4 py-3">
                  <AccountId accountId={b.author_id} />
                </td>
                <td className="px-4 py-3 text-right">{b.num_transactions}</td>
                <td className="px-4 py-3 text-right">{b.num_receipts}</td>
                <td className="px-4 py-3 text-right">
                  {(Number(b.gas_burnt) / 1e12).toFixed(2)} Tgas
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
