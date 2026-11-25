import { Link } from "react-router-dom";
import { shortenMiddle } from "../utils/format";

export default function TransactionHash({
  hash,
  truncate = true,
}: {
  hash: string;
  truncate?: boolean;
}) {
  return (
    <Link
      to={`/tx/${hash}`}
      title={truncate ? hash : undefined}
      className={`font-mono text-xs text-gray-500 hover:text-blue-600 hover:underline ${truncate ? "whitespace-nowrap" : "break-all"}`}
    >
      {truncate ? shortenMiddle(hash, 6, 4) : hash}
    </Link>
  );
}
