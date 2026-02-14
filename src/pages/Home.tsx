import { useCallback } from "react";
import { getBlocks } from "../api/endpoints";
import type { BlockHeader } from "../api/types";
import usePagedCache from "../hooks/usePagedCache";
import BlockHeight from "../components/BlockHeight";
import AccountId from "../components/AccountId";
import Pagination from "../components/Pagination";
import { timeAgo } from "../utils/time";

const PAGE_SIZE = 20;

export default function Home() {
  const fetchPage = useCallback(
    async (resumeToken?: string, limit?: number) => {
      const data = await getBlocks({
        limit: limit ?? PAGE_SIZE,
        desc: true,
        to_block_height: resumeToken ? Number(resumeToken) : undefined,
      });
      const blocks = data.blocks;
      let nextToken: string | undefined;
      if (blocks.length > 0) {
        const lowestHeight = blocks[blocks.length - 1].block_height;
        nextToken = String(lowestHeight - 1);
      }
      return {
        items: blocks,
        resumeToken: nextToken,
        totalCount: 0,
      };
    },
    []
  );

  const {
    items: blocks,
    currentPage,
    hasNext,
    hasPrev,
    goFirst,
    goNext,
    goPrev,
    loading,
    error,
  } = usePagedCache<BlockHeader>({
    fetchPage,
    pageSize: PAGE_SIZE,
    key: "blocks",
  });

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
      <Pagination
        currentPage={currentPage}
        hasNext={hasNext}
        hasPrev={hasPrev}
        goFirst={goFirst}
        goPrev={goPrev}
        goNext={goNext}
        nextBusy={loading}
      />
    </div>
  );
}
