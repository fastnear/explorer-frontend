import type { ComponentType } from "react";
import type { TransactionDetail } from "../api/types";
import type { ParsedTx } from "../utils/parseTransaction";
import DefaultTxWidget from "./DefaultTxWidget";

export interface WidgetProps {
  tx: TransactionDetail;
  /** The same transaction, already normalized (parsed once by the page) */
  parsed: ParsedTx;
}

export interface Widget {
  id: string;
  match: (tx: TransactionDetail, parsed: ParsedTx) => boolean;
  component: ComponentType<WidgetProps>;
  /**
   * Explanation widgets render under the summary (protocol-specific detail
   * such as an intents breakdown); utility widgets render in the advanced area.
   */
  type: "explanation" | "utility";
}

/**
 * Every matching widget is rendered, in this order. The general one-sentence
 * summary and balance changes come from `summarizeTx`, not from widgets.
 */
const registry: Widget[] = [
  {
    id: "default",
    match: () => true,
    component: DefaultTxWidget,
    type: "utility",
  },
];

export function getMatchingWidgets(tx: TransactionDetail, parsed: ParsedTx): Widget[] {
  return registry.filter((w) => w.match(tx, parsed));
}
