import { useState } from "react";
import type { TransactionDetail } from "../api/types";
import { ChevronRight } from "lucide-react";
import JsonView from "@uiw/react-json-view";


export default function DefaultTxWidget({ tx }: { tx: TransactionDetail }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="mt-4 rounded-lg border border-gray-200 bg-white">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full cursor-pointer items-center gap-1 px-4 py-3 text-sm font-semibold text-gray-700 hover:text-gray-900"
      >
        <ChevronRight
          className={`size-4 transition-transform ${open ? "rotate-90" : ""}`}
        />
        Raw Transaction Data
      </button>
      {open && (
        <div className="overflow-auto border-t border-gray-100 rounded-b-lg bg-gray-50 p-4 text-xs">
          <JsonView
            value={tx}
            collapsed={2}
            shortenTextAfterLength={512}
            displayDataTypes={false}
          />
        </div>
      )}
    </div>
  );
}
