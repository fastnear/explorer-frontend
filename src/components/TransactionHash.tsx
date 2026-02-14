import { Link } from "react-router-dom";

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
      className="font-mono text-xs text-blue-600 hover:underline"
    >
      {truncate ? `${hash.slice(0, 12)}...` : <span className="break-all">{hash}</span>}
    </Link>
  );
}
