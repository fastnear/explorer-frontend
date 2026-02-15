import { Loader2 } from "lucide-react";

const btn =
  "rounded-lg bg-blue-600 px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed";

interface PaginationProps {
  currentPage: number;
  hasNext: boolean;
  hasPrev: boolean;
  goFirst: () => void;
  goPrev: () => void;
  goNext: () => void;
  nextBusy?: boolean;
}

export default function Pagination({
  currentPage,
  hasNext,
  hasPrev,
  goFirst,
  goPrev,
  goNext,
  nextBusy,
}: PaginationProps) {
  if (!hasNext && !hasPrev) return null;

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 sm:gap-4">
      <button onClick={goFirst} disabled={!hasPrev} className={btn}>
        First
      </button>
      <button onClick={goPrev} disabled={!hasPrev} className={btn}>
        Prev
      </button>
      <span className="text-sm text-gray-600">Page {currentPage + 1}</span>
      <button
        onClick={goNext}
        disabled={!hasNext || nextBusy}
        className={`inline-flex items-center gap-2 ${btn}`}
      >
        Next
        {nextBusy && hasNext && <Loader2 className="size-4 animate-spin" />}
      </button>
    </div>
  );
}
