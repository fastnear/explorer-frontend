import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getTransactions } from "../api/endpoints";
import type { ReceiptWithOutcome } from "../api/types";
import { parseAction } from "../utils/parseTransaction";
import type { ParsedAction } from "../utils/parseTransaction";
import ReceiptCard from "./ReceiptCard";
import { X, Loader2 } from "lucide-react";

function findReceiptForAction(
  receipts: ReceiptWithOutcome[],
  action: ParsedAction,
  actionIndex: number
): ReceiptWithOutcome | null {
  // For each receipt, extract its actions and check for a match
  for (const r of receipts) {
    const actionData = (r.receipt.receipt as Record<string, unknown>)
      ?.Action as Record<string, unknown> | undefined;
    if (!actionData) continue;
    const receiptActions = (actionData.actions as unknown[]) ?? [];
    for (let i = 0; i < receiptActions.length; i++) {
      const parsed = parseAction(receiptActions[i] as Record<string, unknown>);
      if (parsed.type === action.type && parsed.method_name === action.method_name) {
        // If same type/method appears multiple times, match by relative index
        if (i === actionIndex || receiptActions.length === 1) {
          return r;
        }
      }
    }
  }
  // Fallback: return first non-system Action receipt
  for (const r of receipts) {
    if (r.receipt.predecessor_id === "system") continue;
    const actionData = (r.receipt.receipt as Record<string, unknown>)?.Action;
    if (actionData) return r;
  }
  return receipts[0] ?? null;
}

export default function ReceiptPopup({
  txHash,
  action,
  actionIndex,
  onClose,
}: {
  txHash: string;
  action: ParsedAction;
  actionIndex: number;
  onClose: () => void;
}) {
  const [receipt, setReceipt] = useState<ReceiptWithOutcome | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getTransactions([txHash])
      .then((data) => {
        if (data.transactions.length === 0) {
          setError("Transaction not found");
          return;
        }
        const tx = data.transactions[0];
        const match = findReceiptForAction(tx.receipts, action, actionIndex);
        if (match) {
          setReceipt(match);
        } else {
          setError("No matching receipt found");
        }
      })
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, [txHash, action, actionIndex]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  return createPortal(
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-[10vh]"
    >
      <div className="relative w-full max-w-3xl">
        <button
          onClick={onClose}
          className="absolute -top-2 -right-2 z-10 flex size-7 cursor-pointer items-center justify-center rounded-full bg-white shadow-md hover:bg-gray-100"
        >
          <X className="size-4 text-gray-600" />
        </button>
        {loading && (
          <div className="flex items-center justify-center rounded-lg border border-gray-200 bg-surface p-12">
            <Loader2 className="size-6 animate-spin text-gray-400" />
          </div>
        )}
        {error && (
          <div className="rounded-lg border border-gray-200 bg-surface p-6 text-center text-sm text-red-600">
            {error}
          </div>
        )}
        {receipt && <ReceiptCard r={receipt} />}
      </div>
    </div>,
    document.body
  );
}
