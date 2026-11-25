import { Fragment } from "react";
import { Image } from "lucide-react";
import type { SummaryPart, TxSummary as Summary } from "../utils/summarizeTx";
import AccountId from "./AccountId";
import { TransferAmount } from "./TransferSummary";

function Part({ part }: { part: SummaryPart }) {
  switch (part.t) {
    case "text":
      return <span className="text-gray-600">{part.text}</span>;
    case "account":
      return (
        <span className="font-medium">
          <AccountId accountId={part.id} />
        </span>
      );
    case "amount":
      return (
        <span className="font-semibold text-gray-900">
          <TransferAmount transfer={part.asset} />
        </span>
      );
    case "method":
      return (
        <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[0.85em] text-gray-800">
          {part.name}
        </code>
      );
    case "nft":
      return (
        <span className="inline-flex flex-wrap items-center gap-1">
          <Image className="size-3.5 text-pink-700" aria-hidden />
          <span className="font-semibold text-gray-900" title={part.tokenId}>
            {part.count > 1
              ? `${part.count} NFTs`
              : `NFT #${part.tokenId.length > 18 ? part.tokenId.slice(0, 16) + "…" : part.tokenId}`}
          </span>
          <span className="text-gray-500">
            (<AccountId accountId={part.contractId} />)
          </span>
        </span>
      );
  }
}

/** A transaction's one-sentence description, with linked accounts and token amounts */
export default function TxSummary({ summary }: { summary: Summary }) {
  return (
    <span className="[overflow-wrap:anywhere]">
      {summary.parts.map((part, i) => (
        <Fragment key={i}>
          {i > 0 && !(part.t === "text" && part.text === ",") && " "}
          <Part part={part} />
        </Fragment>
      ))}
    </span>
  );
}
