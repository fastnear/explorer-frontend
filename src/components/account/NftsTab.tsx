import { useState } from "react";
import { Image } from "lucide-react";
import type { AccountNft } from "../../api/fastnearApi";
import { knownContract } from "../../data/knownContracts";
import AccountId from "../AccountId";

function Collection({ nft, dimmed }: { nft: AccountNft; dimmed?: boolean }) {
  const known = knownContract(nft.contract_id);
  return (
    <li
      className={`flex min-w-0 items-center gap-2.5 rounded-lg border border-gray-200 px-3 py-2.5 ${dimmed ? "opacity-60" : ""}`}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-pink-100 text-pink-700">
        <Image className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 text-sm">
        {known && <div className="truncate font-medium text-gray-900">{known.name}</div>}
        <div className="truncate">
          <AccountId accountId={nft.contract_id} maxLength="auto" />
        </div>
      </div>
    </li>
  );
}

export default function NftsTab({
  nfts,
  spamNfts,
}: {
  nfts: AccountNft[];
  spamNfts: AccountNft[];
}) {
  const [showSpam, setShowSpam] = useState(false);

  return (
    <div className="rounded-xl border border-gray-200 bg-surface px-4 py-4">
      {nfts.length === 0 && !showSpam ? (
        <p className="py-4 text-center text-sm text-gray-500">
          No NFT collections found for this account.
        </p>
      ) : (
        <>
          <p className="mb-3 text-sm text-gray-500">
            Collections this account holds or has held NFTs from. Open a collection to see its
            activity.
          </p>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {nfts.map((nft) => (
              <Collection key={nft.contract_id} nft={nft} />
            ))}
            {showSpam &&
              spamNfts.map((nft) => <Collection key={nft.contract_id} nft={nft} dimmed />)}
          </ul>
        </>
      )}
      {spamNfts.length > 0 && (
        <label className="mt-3 inline-flex cursor-pointer items-center gap-1.5 text-xs text-gray-500">
          <input
            type="checkbox"
            checked={showSpam}
            onChange={(e) => setShowSpam(e.target.checked)}
          />
          Show {spamNfts.length} flagged as spam
        </label>
      )}
    </div>
  );
}
