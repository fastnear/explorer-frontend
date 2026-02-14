import type { ParsedTx } from "../utils/parseTransaction";
import { formatGas } from "../utils/format";
import { timeAgo } from "../utils/time";
import TransactionHash from "./TransactionHash";
import AccountId from "./AccountId";
import Action from "./Action";
import { CircleCheck, CircleX } from "lucide-react";

interface TxRowProps {
  tx: ParsedTx;
  timestamp: string;
}

export function TxTableHeader() {
  const th = "px-4 py-3 whitespace-nowrap";
  return (
    <thead>
      <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
        <th className={th}>Tx Hash</th>
        <th className={th}>Time</th>
        <th className={th}>Signer</th>
        <th className={th}>Receiver</th>
        <th className={th}>Action</th>
        <th className={th}>Gas</th>
        <th className={th}></th>
      </tr>
    </thead>
  );
}

export default function TxRow({ tx, timestamp }: TxRowProps) {
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="whitespace-nowrap px-4 py-3">
        <TransactionHash hash={tx.hash} />
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-gray-500">
        {timeAgo(timestamp)}
      </td>
      <td className="px-4 py-3">
        <AccountId accountId={tx.signer_id} />
      </td>
      <td className="px-4 py-3">
        <AccountId accountId={tx.receiver_id} />
      </td>
      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">
        {tx.actions.map((a, i) => (
          <div key={i}>
            <Action action={a} />
          </div>
        ))}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-xs">
        {formatGas(tx.gas_burnt)}
      </td>
      <td className="whitespace-nowrap px-4 py-3">
        {tx.is_success ? (
          <CircleCheck className="size-4 text-green-600" />
        ) : (
          <CircleX className="size-4 text-red-600" />
        )}
      </td>
    </tr>
  );
}
