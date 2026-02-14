import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { getAccount } from "../api/endpoints";
import type { AccountTx } from "../api/types";
import TransactionHash from "../components/TransactionHash";
import BlockHeight from "../components/BlockHeight";

export default function AccountDetail() {
  const { accountId } = useParams<{ accountId: string }>();
  const [txns, setTxns] = useState<AccountTx[]>([]);
  const [resumeToken, setResumeToken] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (token?: string) => {
      if (!accountId) return;
      setLoading(true);
      try {
        const data = await getAccount(accountId, {
          resume_token: token,
          limit: 25,
        });
        setTxns((prev) =>
          token ? [...prev, ...data.account_txs] : data.account_txs
        );
        setResumeToken(data.resume_token);
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
      }
    },
    [accountId]
  );

  useEffect(() => {
    setTxns([]);
    setResumeToken(undefined);
    load();
  }, [load]);

  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">
        Account: <span className="font-mono text-base">{accountId}</span>
      </h1>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
              <th className="px-4 py-3">Tx Hash</th>
              <th className="px-4 py-3">Block</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {txns.map((tx, i) => (
              <tr
                key={`${tx.transaction_hash}-${i}`}
                className="border-b border-gray-100 hover:bg-gray-50"
              >
                <td className="px-4 py-3">
                  <TransactionHash hash={tx.transaction_hash} />
                </td>
                <td className="px-4 py-3">
                  <BlockHeight height={tx.tx_block_height} />
                </td>
                <td className="px-4 py-3">
                  <span
                    className={
                      tx.is_success ? "text-green-600" : "text-red-600"
                    }
                  >
                    {tx.is_success ? "Success" : "Failed"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {loading && <p className="mt-4 text-gray-500">Loading...</p>}

      {resumeToken && !loading && (
        <button
          onClick={() => load(resumeToken)}
          className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Load more
        </button>
      )}
    </div>
  );
}
