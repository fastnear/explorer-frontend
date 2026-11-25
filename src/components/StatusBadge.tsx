import { CircleCheck, CircleX, Clock, TriangleAlert } from "lucide-react";

export type TxStatus = "success" | "failed" | "pending";

export function statusOf(isSuccess: boolean | null): TxStatus {
  return isSuccess === null ? "pending" : isSuccess ? "success" : "failed";
}

const LABEL: Record<TxStatus, string> = {
  success: "Succeeded",
  failed: "Failed",
  pending: "Pending",
};

/** Compact icon for feed rows */
export function StatusIcon({
  status,
  partial = false,
  className = "size-4",
}: {
  status: TxStatus;
  partial?: boolean;
  className?: string;
}) {
  if (status === "pending")
    return (
      <span title="Pending">
        <Clock className={`${className} text-yellow-500`} aria-label="Pending" />
      </span>
    );
  if (status === "failed")
    return (
      <span title="Failed">
        <CircleX className={`${className} text-red-600`} aria-label="Failed" />
      </span>
    );
  if (partial)
    return (
      <span title="Succeeded, but one step failed">
        <TriangleAlert
          className={`${className} text-yellow-500`}
          aria-label="Succeeded, but one step failed"
        />
      </span>
    );
  return (
    <span title="Succeeded">
      <CircleCheck className={`${className} text-green-600`} aria-label="Succeeded" />
    </span>
  );
}

/** Labelled pill for page headers */
export default function StatusBadge({
  status,
  partial = false,
}: {
  status: TxStatus;
  partial?: boolean;
}) {
  const cls =
    status === "success"
      ? partial
        ? "bg-yellow-100 text-yellow-800"
        : "bg-green-100 text-green-800"
      : status === "failed"
        ? "bg-red-100 text-red-800"
        : "bg-yellow-100 text-yellow-800";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}
    >
      <StatusIcon status={status} partial={partial} className="size-3.5" />
      {status === "success" && partial ? "Succeeded with a failed step" : LABEL[status]}
    </span>
  );
}
