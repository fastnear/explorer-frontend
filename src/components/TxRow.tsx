import { useState } from "react";
import type { ParsedTx } from "../utils/parseTransaction";
import type { ParsedAction } from "../utils/parseTransaction";
import { formatGas } from "../utils/format";
import TransactionHash from "./TransactionHash";
import TimeAgo from "./TimeAgo";
import AccountId from "./AccountId";
import Action from "./Action";
import { CircleCheck, CircleX, Radio } from "lucide-react";
import { Link } from "react-router-dom";

const ACTIONS_LIMIT = 3;

function ActionList({ actions }: { actions: ParsedAction[] }) {
  const [expanded, setExpanded] = useState(false);
  const showAll = expanded || actions.length <= ACTIONS_LIMIT;
  const visible = showAll ? actions : actions.slice(0, ACTIONS_LIMIT);

  return (
    <>
      {visible.map((a, i) => (
        <div key={i}>
          <Action action={a} />
        </div>
      ))}
      {!showAll && (
        <button
          onClick={() => setExpanded(true)}
          className="cursor-pointer text-blue-600 hover:text-blue-800"
        >
          + {actions.length - ACTIONS_LIMIT} more...
        </button>
      )}
    </>
  );
}

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
        <TimeAgo timestampNs={timestamp} />
      </td>
      <td className="px-4 py-3">
        <span className="inline-flex items-center gap-1">
          {tx.relayer_id && (
            <Link
              to={`/account/${tx.relayer_id}`}
              title={`Relayed by ${tx.relayer_id}`}
            >
              <Radio className="size-3.5 text-red-500" />
            </Link>
          )}
          <AccountId accountId={tx.signer_id} />
        </span>
      </td>
      <td className="px-4 py-3">
        <AccountId accountId={tx.receiver_id} />
      </td>
      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">
        <ActionList actions={tx.actions} />
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
