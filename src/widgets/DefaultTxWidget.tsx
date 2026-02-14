import { useState } from "react";
import type { TransactionDetail } from "../api/types";
import { ChevronRight } from "lucide-react";
import JsonView from "@uiw/react-json-view";
import { lightTheme } from "@uiw/react-json-view/light";

export default function DefaultTxWidget({ tx }: { tx: TransactionDetail }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex cursor-pointer items-center gap-1 text-sm font-semibold text-gray-700 hover:text-gray-900"
      >
        <ChevronRight
          className={`size-4 transition-transform ${open ? "rotate-90" : ""}`}
        />
        Raw Transaction Data
      </button>
      {open && (
        <div className="mt-2 overflow-auto rounded-lg bg-gray-100 p-4 text-xs">
          <JsonView
            value={tx}
            collapsed={1}
            style={lightTheme}
            displayDataTypes={false}
          />
        </div>
      )}
    </div>
  );
}
