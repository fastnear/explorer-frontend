import { Link } from "react-router-dom";

const MAX_LEN = 30;
const TAIL_LEN = 7;

function truncate(id: string): string {
  if (id.length <= MAX_LEN) return id;
  const headLen = MAX_LEN - TAIL_LEN - 1; // 1 for ellipsis
  return `${id.slice(0, headLen)}…${id.slice(-TAIL_LEN)}`;
}

export default function AccountId({
  accountId,
  linked = true,
}: {
  accountId: string;
  linked?: boolean;
}) {
  const display = truncate(accountId);
  const title = accountId.length > MAX_LEN ? accountId : undefined;

  if (linked) {
    return (
      <Link
        to={`/account/${accountId}`}
        className="font-mono text-xs text-blue-600 hover:underline"
        title={title}
      >
        {display}
      </Link>
    );
  }

  return (
    <span className="font-mono text-xs" title={title}>
      {display}
    </span>
  );
}
