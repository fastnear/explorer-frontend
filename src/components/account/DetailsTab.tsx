import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  viewAccessKeys,
  TooManyAccessKeysError,
  type AccessKeyInfo,
  type AccountState,
} from "../../api/rpc";
import { shortenMiddle } from "../../utils/format";
import AccountId from "../AccountId";
import BlockHeight from "../BlockHeight";
import CopyButton from "../CopyButton";
import NearAmount from "../NearAmount";

function formatStorageBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Each byte of storage keeps 10^19 yoctoNEAR of the balance reserved
const STORAGE_PRICE_PER_BYTE = 10n ** 19n;

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 py-2 sm:flex-row sm:gap-3">
      <dt className="w-40 shrink-0 text-gray-500">{label}</dt>
      <dd className="min-w-0 flex-1">{children}</dd>
    </div>
  );
}

/** Protocol-level account data: storage, contract code and access keys */
export default function DetailsTab({
  accountId,
  state,
  storageBytes,
}: {
  accountId: string;
  state: AccountState | null;
  storageBytes?: number;
}) {
  const [keys, setKeys] = useState<AccessKeyInfo[] | null>(null);
  const [keysError, setKeysError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setKeys(null);
    setKeysError(null);
    viewAccessKeys(accountId, controller.signal)
      .then(setKeys)
      .catch((err) => {
        if (controller.signal.aborted) return;
        setKeysError(
          err instanceof TooManyAccessKeysError
            ? `This account has more than ${err.limit} access keys, too many to list here.`
            : "Could not load access keys."
        );
      });
    return () => controller.abort();
  }, [accountId]);

  const fullAccess = keys?.filter((k) => k.permission === "FullAccess") ?? [];
  const limited = keys?.filter((k) => k.permission !== "FullAccess") ?? [];

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-gray-200 bg-surface px-4 py-1 text-sm">
        <dl className="divide-y divide-gray-100">
          <Row label="Account ID">
            <span className="flex items-center gap-1">
              <span className="break-all font-mono text-xs">{accountId}</span>
              <CopyButton text={accountId} label="Copy account ID" />
            </span>
          </Row>
          {storageBytes != null && (
            <Row label="Storage used">
              {formatStorageBytes(storageBytes)}{" "}
              <span className="text-gray-500">
                (keeps{" "}
                <NearAmount yoctoNear={(BigInt(storageBytes) * STORAGE_PRICE_PER_BYTE).toString()} />{" "}
                reserved)
              </span>
            </Row>
          )}
          {state && (
            <Row label="Contract code">
              {state.hasContract ? (
                <span className="flex flex-wrap items-center gap-1">
                  <span className="rounded-md bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-800">
                    Deployed
                  </span>
                  <span className="break-all font-mono text-xs text-gray-600">{state.code_hash}</span>
                  <CopyButton text={state.code_hash} label="Copy code hash" />
                </span>
              ) : (
                <span className="text-gray-500">None (not a smart contract)</span>
              )}
            </Row>
          )}
          {state && state.locked !== "0" && (
            <Row label="Validator stake">
              <NearAmount yoctoNear={state.locked} showPrice />
            </Row>
          )}
          {state && (
            <Row label="Read at block">
              <BlockHeight height={state.block_height} />
            </Row>
          )}
        </dl>
      </section>

      <section className="rounded-xl border border-gray-200 bg-surface px-4 py-3 text-sm">
        <h2 className="mb-2 font-semibold text-gray-700">
          Access keys{keys && <span className="ml-1.5 font-normal text-gray-400">{keys.length}</span>}
        </h2>
        {keysError ? (
          <p className="text-gray-500">{keysError}</p>
        ) : !keys ? (
          <p className="flex items-center gap-2 text-gray-500">
            <Loader2 className="size-4 animate-spin" /> Loading keys…
          </p>
        ) : keys.length === 0 ? (
          <p className="text-gray-500">
            No access keys. Nobody can sign transactions for this account directly.
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-gray-500">
              {fullAccess.length} full-access {fullAccess.length === 1 ? "key" : "keys"} (can do
              anything) and {limited.length} limited {limited.length === 1 ? "key" : "keys"} (can only
              call one app).
            </p>
            <ul className="divide-y divide-gray-100">
              {[...fullAccess, ...limited].slice(0, 100).map((k) => (
                <li key={k.public_key} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                  <span className="inline-flex items-center gap-0.5 font-mono text-xs" title={k.public_key}>
                    {shortenMiddle(k.public_key, 18, 8)}
                    <CopyButton text={k.public_key} label="Copy public key" />
                  </span>
                  {k.permission === "FullAccess" ? (
                    <span className="rounded-md bg-accent-100 px-1.5 py-0.5 text-xs font-medium text-accent-800">
                      Full access
                    </span>
                  ) : (
                    <span className="inline-flex flex-wrap items-center gap-1 text-xs text-gray-600">
                      can call <AccountId accountId={k.permission.receiver_id} />
                      {k.permission.method_names.length > 0 && (
                        <span className="text-gray-400" title={k.permission.method_names.join(", ")}>
                          ({k.permission.method_names.length}{" "}
                          {k.permission.method_names.length === 1 ? "method" : "methods"})
                        </span>
                      )}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            {keys.length > 100 && (
              <p className="text-gray-500">Showing the first 100 of {keys.length} keys.</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
