import { Link } from "react-router-dom";
import { CircleAlert } from "lucide-react";
import useSpamTokens, { isSpam } from "../hooks/useSpamTokens";
import useSpamNfts, { isSpamNft } from "../hooks/useSpamNfts";
import { displayAccountId } from "../utils/format";
import { knownContract } from "../data/knownContracts";

const DEFAULT_MAX_LEN = 28;

function SpamBadge() {
  return (
    <span title="Flagged as spam">
      <CircleAlert className="inline-block size-3 shrink-0 text-red-500" aria-label="Flagged as spam" />
    </span>
  );
}

/**
 * @param maxLength - number of chars before the ID is shortened, or "auto" for
 *   CSS-only truncation that fills available space. Defaults to 28.
 */
export default function AccountId({
  accountId,
  linked = true,
  maxLength = DEFAULT_MAX_LEN,
}: {
  accountId: string;
  linked?: boolean;
  maxLength?: number | "auto";
}) {
  const spamSet = useSpamTokens();
  const spamNfts = useSpamNfts();
  const spam = isSpam(spamSet, accountId) || isSpamNft(spamNfts, accountId);

  const auto = maxLength === "auto";
  const shown = auto ? accountId : displayAccountId(accountId, maxLength);
  const known = knownContract(accountId);
  const title =
    known ? `${known.name} (${accountId})` : shown !== accountId || auto ? accountId : undefined;

  const cls = auto
    ? "inline-block min-w-0 max-w-full overflow-hidden text-ellipsis whitespace-nowrap align-bottom"
    : "whitespace-nowrap";

  return (
    <span className={`inline-flex items-center gap-0.5 ${auto ? "min-w-0 max-w-full" : ""}`}>
      {linked ? (
        <Link
          to={`/account/${accountId}`}
          className={`${cls} text-blue-600 hover:underline`}
          title={title}
        >
          {shown}
        </Link>
      ) : (
        <span className={cls} title={title}>
          {shown}
        </span>
      )}
      {spam && <SpamBadge />}
    </span>
  );
}
