import type { TransactionDetail, TransactionAction } from "../api/types";

export interface ParsedAction {
  type: string;
  method_name?: string;
  deposit?: string;
}

export interface ParsedTx {
  hash: string;
  signer_id: string;
  receiver_id: string;
  block_height: number;
  timestamp: string;
  gas_burnt: number;
  is_success: boolean;
  actions: ParsedAction[];
}

function parseAction(action: TransactionAction): ParsedAction {
  const type = Object.keys(action)[0];
  const value = action[type];
  const result: ParsedAction = { type };
  if (value && typeof value === "object") {
    const v = value as Record<string, unknown>;
    if (typeof v.method_name === "string") result.method_name = v.method_name;
    if (typeof v.deposit === "string") result.deposit = v.deposit;
  }
  return result;
}

export function parseTransaction(tx: TransactionDetail): ParsedTx {
  const { status } = tx.execution_outcome.outcome;
  const is_success = "SuccessValue" in status || "SuccessReceiptId" in status;

  let totalGas = tx.execution_outcome.outcome.gas_burnt;
  for (const r of tx.receipts) {
    totalGas += r.execution_outcome.outcome.gas_burnt;
  }

  return {
    hash: tx.transaction.hash,
    signer_id: tx.transaction.signer_id,
    receiver_id: tx.transaction.receiver_id,
    block_height: tx.execution_outcome.block_height,
    timestamp: String(tx.execution_outcome.block_timestamp),
    gas_burnt: totalGas,
    is_success,
    actions: tx.transaction.actions.map(parseAction),
  };
}
