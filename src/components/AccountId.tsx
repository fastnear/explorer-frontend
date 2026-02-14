import { Link } from "react-router-dom";

export default function AccountId({
  accountId,
  linked = true,
}: {
  accountId: string;
  linked?: boolean;
}) {
  if (linked) {
    return (
      <Link
        to={`/account/${accountId}`}
        className="font-mono text-xs text-blue-600 hover:underline"
      >
        {accountId}
      </Link>
    );
  }

  return <span className="font-mono text-xs">{accountId}</span>;
}
