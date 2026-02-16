import type { ComponentType } from "react";
import type { TransactionDetail } from "../api/types";
import DefaultTxWidget from "./DefaultTxWidget";
import NearTransferWidget, { matchNearTransfer } from "./NearTransferWidget";
import FtTransferWidget, { matchFtTransfer } from "./FtTransferWidget";

export interface Widget {
  id: string;
  match: (tx: TransactionDetail) => boolean;
  component: ComponentType<{ tx: TransactionDetail }>;
  priority: number;
}

const registry: Widget[] = [
  {
    id: "near-transfer",
    match: matchNearTransfer,
    component: NearTransferWidget,
    priority: 10,
  },
  {
    id: "ft-transfer",
    match: matchFtTransfer,
    component: FtTransferWidget,
    priority: 10,
  },
  {
    id: "default",
    match: () => true,
    component: DefaultTxWidget,
    priority: 0,
  },
];

export function getMatchingWidgets(tx: TransactionDetail): Widget[] {
  return registry
    .filter((w) => w.match(tx))
    .sort((a, b) => b.priority - a.priority);
}

export function registerWidget(widget: Widget) {
  registry.push(widget);
}
