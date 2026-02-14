import type { TransactionDetail } from "../api/types";

export default function DefaultTxWidget({ tx }: { tx: TransactionDetail }) {
  return (
    <div className="mt-4">
      <h3 className="mb-2 text-sm font-semibold text-gray-700">
        Raw Transaction Data
      </h3>
      <pre className="overflow-auto rounded-lg bg-gray-100 p-4 text-xs">
        {JSON.stringify(tx, null, 2)}
      </pre>
    </div>
  );
}
