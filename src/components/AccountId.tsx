import { Link } from "react-router-dom";
import { CircleAlert } from "lucide-react";
import useSpamTokens, { isSpam } from "../hooks/useSpamTokens";
import useSpamNfts, { isSpamNft } from "../hooks/useSpamNfts";

const MAX_LEN = 30;
const TAIL_LEN = 7;

function truncate(id: string): string {
  if (id.length <= MAX_LEN) return id;
  const headLen = MAX_LEN - TAIL_LEN - 1; // 1 for ellipsis
  return `${id.slice(0, headLen)}…${id.slice(-TAIL_LEN)}`;
}

function SpamBadge() {
  return (
    <span title="Flagged as spam">
      <CircleAlert className="inline-block size-3 shrink-0 text-red-500" />
    </span>
  );
}

export default function AccountId({
  accountId,
  linked = true,
}: {
  accountId: string;
  linked?: boolean;
}) {
  const spamSet = useSpamTokens();
  const spamNfts = useSpamNfts();
  const spam = isSpam(spamSet, accountId) || isSpamNft(spamNfts, accountId);
  const display = truncate(accountId);
  const title = accountId.length > MAX_LEN ? accountId : undefined;

  if (linked) {
    return (
      <span className="inline-flex items-center gap-0.5">
        <Link
          to={`/account/${accountId}`}
          className="whitespace-nowrap font-mono text-xs text-blue-600 hover:underline"
          title={title}
        >
          {display}
        </Link>
        {spam && <SpamBadge />}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-0.5">
      <span className="whitespace-nowrap font-mono text-xs" title={title}>
        {display}
      </span>
      {spam && <SpamBadge />}
    </span>
  );
}
