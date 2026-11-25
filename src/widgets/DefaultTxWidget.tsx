import type { TransactionDetail } from "../api/types";
import { Braces } from "lucide-react";
import JsonView from "@uiw/react-json-view";
import { darkTheme } from "@uiw/react-json-view/dark";
import Collapsible from "../components/Collapsible";
import useIsDark from "../hooks/useIsDark";

export default function DefaultTxWidget({ tx }: { tx: TransactionDetail }) {
  const isDark = useIsDark();

  return (
    <Collapsible
      dev
      title="Raw transaction data"
      icon={<Braces className="size-4 text-gray-400" />}
      hint="Full JSON as returned by the API"
    >
      <div className="overflow-auto rounded bg-gray-50 p-3 text-xs">
        <JsonView
          value={tx}
          collapsed={2}
          shortenTextAfterLength={512}
          displayDataTypes={false}
          displayObjectSize={false}
          style={isDark ? darkTheme : undefined}
        />
      </div>
    </Collapsible>
  );
}
