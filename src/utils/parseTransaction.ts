import type { TransactionDetail, TransactionAction } from "../api/types";

export interface ParsedAction {
  type: string;
  method_name?: string;
  deposit?: string;
  args?: string;
  gas?: number;
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
  relayer_id?: string;
}

export function parseAction(action: TransactionAction): ParsedAction {
  const type = Object.keys(action)[0];
  const value = action[type];
  const result: ParsedAction = { type };
  if (value && typeof value === "object") {
    const v = value as Record<string, unknown>;
    if (typeof v.method_name === "string") result.method_name = v.method_name;
    if (typeof v.deposit === "string") result.deposit = v.deposit;
    if (typeof v.args === "string") result.args = v.args;
    if (typeof v.gas === "number") result.gas = v.gas;
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

  const actions = tx.transaction.actions;
  const parsed: ParsedTx = {
    hash: tx.transaction.hash,
    signer_id: tx.transaction.signer_id,
    receiver_id: tx.transaction.receiver_id,
    block_height: tx.execution_outcome.block_height,
    timestamp: String(tx.execution_outcome.block_timestamp),
    gas_burnt: totalGas,
    is_success,
    actions: actions.map(parseAction),
  };

  // Detect Delegate: first action is Delegate wrapping the real signer/receiver
  if (actions.length === 1 && actions[0].Delegate) {
    const delegate = actions[0].Delegate as Record<string, unknown>;
    const delegateAction = (delegate.delegate_action ?? delegate) as Record<
      string,
      unknown
    >;
    if (typeof delegateAction.sender_id === "string") {
      parsed.relayer_id = tx.transaction.signer_id;
      parsed.signer_id = delegateAction.sender_id;
      if (typeof delegateAction.receiver_id === "string") {
        parsed.receiver_id = delegateAction.receiver_id;
      }
      const innerActions = delegateAction.actions;
      if (Array.isArray(innerActions)) {
        parsed.actions = innerActions.map((a: TransactionAction) => {
          // Inner actions may be wrapped as { type: "FunctionCall", ... }
          // or as { FunctionCall: { ... } } like top-level actions
          if (typeof a.type === "string" && a.type !== "object") {
            const result: ParsedAction = { type: a.type as string };
            if (typeof a.method_name === "string")
              result.method_name = a.method_name as string;
            if (typeof a.deposit === "string")
              result.deposit = a.deposit as string;
            if (typeof a.args === "string")
              result.args = a.args as string;
            if (typeof a.gas === "number")
              result.gas = a.gas as number;
            return result;
          }
          return parseAction(a);
        });
      }
    }
  }

  return parsed;
}
