import { Link } from "react-router-dom";
import { CircleAlert } from "lucide-react";
import useSpamTokens, { isSpam } from "../hooks/useSpamTokens";
import useSpamNfts, { isSpamNft } from "../hooks/useSpamNfts";

const MAX_LEN = 30;

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
  const needsTruncate = accountId.length > MAX_LEN;
  const cls = needsTruncate
    ? "inline-block max-w-[36ch] overflow-hidden text-ellipsis whitespace-nowrap align-bottom font-mono text-xs text-blue-600 hover:underline"
    : "whitespace-nowrap font-mono text-xs text-blue-600 hover:underline";

  if (linked) {
    return (
      <span className="inline-flex items-center gap-0.5">
        <Link
          to={`/account/${accountId}`}
          className={cls}
          title={needsTruncate ? accountId : undefined}
        >
          {accountId}
        </Link>
        {spam && <SpamBadge />}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-0.5">
      <span
        className={needsTruncate
          ? "inline-block max-w-[36ch] overflow-hidden text-ellipsis whitespace-nowrap align-bottom font-mono text-xs"
          : "whitespace-nowrap font-mono text-xs"}
        title={needsTruncate ? accountId : undefined}
      >
        {accountId}
      </span>
      {spam && <SpamBadge />}
    </span>
  );
}
