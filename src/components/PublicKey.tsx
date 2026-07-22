import { useState } from "react";
import { Check, Copy, LockKeyhole } from "lucide-react";
import { parsePublicKey, truncatePublicKeyData } from "../utils/publicKey";

/**
 * Renders a NEAR access-key public key: "{curve}:{base58}".
 * Long payloads (notably post-quantum ML-DSA keys) are middle-truncated with
 * the full value available via copy and tooltip. Post-quantum keys get a
 * purple lock badge so non-technical users can see the account is quantum-safe.
 */
export default function PublicKey({ publicKey }: { publicKey: string }) {
  const { curve, data, isPostQuantum } = parsePublicKey(publicKey);
  const [copied, setCopied] = useState(false);

  // Classic keys (ed25519 ~44 chars) are shown in full, matching other
  // explorers; only oversized payloads (ML-DSA is thousands of chars) truncate.
  const display = data.length > 48 ? truncatePublicKeyData(data) : data;

  const copy = () => {
    navigator.clipboard?.writeText(publicKey).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      },
      () => {},
    );
  };

  return (
    <span className="inline-flex min-w-0 items-center gap-1">
      {isPostQuantum && (
        <span
          title={`Post-quantum key (${curve.toUpperCase()}) — quantum-safe signature`}
          className="inline-flex shrink-0 items-center gap-0.5 rounded bg-purple-100 px-1 py-0.5 text-[10px] font-medium text-purple-700 dark:bg-purple-950"
        >
          <LockKeyhole className="size-3" />
          PQ
        </span>
      )}
      <span
        className="min-w-0 truncate font-mono text-xs text-gray-600"
        title={publicKey}
      >
        <span className={isPostQuantum ? "text-purple-700" : "text-gray-500"}>
          {curve}
        </span>
        :{display}
      </span>
      <button
        onClick={copy}
        title="Copy public key"
        className="shrink-0 cursor-pointer text-gray-400 hover:text-gray-700"
      >
        {copied ? (
          <Check className="size-3.5 text-green-600" />
        ) : (
          <Copy className="size-3.5" />
        )}
      </button>
    </span>
  );
}
