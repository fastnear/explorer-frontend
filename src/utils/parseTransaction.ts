import type { TransactionDetail, TransactionAction, ReceiptWithOutcome } from "../api/types";
import { encodeBase58 } from "./format";

export interface ParsedAction {
  type: string;
  method_name?: string;
  deposit?: string;
  args?: string;
  gas?: number;
  public_key?: string;
  access_key_permission?: string;
  /** Contract a limited (function-call) access key is restricted to */
  access_key_contract?: string;
  beneficiary_id?: string;
  code_hash?: string;
  /** Validator stake amount in yoctoNEAR (Stake action) */
  stake?: string;
}

export interface TransferInfo {
  from: string | null; // null = minted (no sender)
  to: string | null; // null = burned (no recipient)
  amount: string;
  tokenType: "near" | "nep141" | "nep245";
  contractId?: string; // FT contract for nep141, MT contract for nep245
  tokenId?: string; // raw token_id within NEP-245 contract (e.g. "nep141:wrap.near" or native "42")
}

export interface NftTransferInfo {
  from: string | null;
  to: string | null;
  contractId: string;
  tokenId: string;
}

/** A swap reported by a DEX log line, used when no tokens actually move (internal balances) */
export interface SwapLogInfo {
  contractId: string; // the exchange
  account: string; // who called it
  tokenIn: string;
  amountIn: string;
  tokenOut: string;
  amountOut: string;
}

export interface ParsedTx {
  hash: string;
  signer_id: string;
  receiver_id: string;
  public_key?: string; // access key that signed the tx ("{curve}:{base58}")
  block_height: number;
  timestamp: string;
  gas_burnt: number;
  /** Total fee (tokens burnt by the transaction and all its receipts), yoctoNEAR */
  fee: string;
  /** null = pending: the result is not known yet, or some receipts are still executing */
  is_success: boolean | null;
  /** True when at least one receipt failed, even if the transaction as a whole succeeded */
  has_failed_receipts: boolean;
  actions: ParsedAction[];
  relayer_id?: string;
  transfers: TransferInfo[];
  nftTransfers: NftTransferInfo[];
  swapLogs: SwapLogInfo[];
  receipts: ReceiptWithOutcome[];
}

export function parseAction(action: TransactionAction): ParsedAction {
  // Actions can be plain strings (e.g. "CreateAccount") or objects (e.g. { Transfer: { deposit: "..." } })
  if (typeof action === "string") {
    return { type: action };
  }
  const type = Object.keys(action)[0];
  const value = action[type];
  const result: ParsedAction = { type };
  if (value && typeof value === "object") {
    const v = value as Record<string, unknown>;
    if (typeof v.method_name === "string") result.method_name = v.method_name;
    if (typeof v.deposit === "string") result.deposit = v.deposit;
    if (typeof v.args === "string") result.args = v.args;
    if (typeof v.gas === "number") result.gas = v.gas;
    if (typeof v.public_key === "string") result.public_key = v.public_key;
    if (typeof v.beneficiary_id === "string") result.beneficiary_id = v.beneficiary_id;
    if (type === "Stake" && typeof v.stake === "string") result.stake = v.stake;
    if (typeof v.code === "string") {
      try {
        const bytes = Uint8Array.from(atob(v.code), (c) => c.charCodeAt(0));
        result.code_hash = encodeBase58(bytes);
      } catch {
        /* not base64 — leave the hash out */
      }
    }
    if (v.access_key && typeof v.access_key === "object") {
      const ak = v.access_key as Record<string, unknown>;
      if (ak.permission === "FullAccess") {
        result.access_key_permission = "FullAccess";
      } else if (ak.permission && typeof ak.permission === "object") {
        const perm = ak.permission as Record<string, unknown>;
        if (perm.FunctionCall && typeof perm.FunctionCall === "object") {
          const fc = perm.FunctionCall as Record<string, unknown>;
          result.access_key_permission = `FunctionCall → ${fc.receiver_id ?? "?"}`;
          if (typeof fc.receiver_id === "string") {
            result.access_key_contract = fc.receiver_id;
          }
        }
      }
    }
  }
  return result;
}

/** Decode base64 JSON args of a function call; null when they are not a JSON object */
export function decodeArgs(args: string | undefined): Record<string, unknown> | null {
  if (!args) return null;
  try {
    const parsed = JSON.parse(atob(args));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function getDeleteAccountBeneficiary(
  action: TransactionAction,
): string | undefined {
  if (typeof action === "string") return undefined;
  if (action.DeleteAccount && typeof action.DeleteAccount === "object") {
    return (action.DeleteAccount as Record<string, unknown>).beneficiary_id as
      | string
      | undefined;
  }
  if (
    action.type === "DeleteAccount" &&
    typeof action.beneficiary_id === "string"
  ) {
    return action.beneficiary_id as string;
  }
  return undefined;
}

function getTransferDeposit(action: TransactionAction): string | undefined {
  if (typeof action === "string") return undefined;
  // Top-level format: { Transfer: { deposit: "..." } }
  if (action.Transfer && typeof action.Transfer === "object") {
    return (action.Transfer as Record<string, unknown>).deposit as
      | string
      | undefined;
  }
  // Delegate inner format: { type: "Transfer", deposit: "..." }
  if (action.type === "Transfer" && typeof action.deposit === "string") {
    return action.deposit as string;
  }
  return undefined;
}

function receiptActions(r: ReceiptWithOutcome): TransactionAction[] {
  const actionData = (r.receipt.receipt as Record<string, unknown>)?.Action as
    | Record<string, unknown>
    | undefined;
  return (actionData?.actions as TransactionAction[]) ?? [];
}

export function isReceiptFailed(r: ReceiptWithOutcome): boolean {
  return "Failure" in r.execution_outcome.outcome.status;
}

/** Real signer / receiver / actions, looking through a relayed (Delegate) wrapper */
function unwrapDelegate(tx: TransactionDetail): {
  signer: string;
  receiver: string;
  actions: TransactionAction[];
} {
  let signer = tx.transaction.signer_id;
  let receiver = tx.transaction.receiver_id;
  let actions: TransactionAction[] = tx.transaction.actions;

  if (actions.length === 1 && actions[0].Delegate) {
    const delegate = actions[0].Delegate as Record<string, unknown>;
    const da = (delegate.delegate_action ?? delegate) as Record<
      string,
      unknown
    >;
    if (typeof da.sender_id === "string") signer = da.sender_id;
    if (typeof da.receiver_id === "string") receiver = da.receiver_id;
    if (Array.isArray(da.actions)) actions = da.actions as TransactionAction[];
  }
  return { signer, receiver, actions };
}

// Log formats of tokens that predate NEP-141 events (wrap.near and other early tokens)
const LEGACY_TRANSFER = /^Transfer (\d+) from (\S+) to (\S+)$/;
const LEGACY_REFUND = /^Refund (\d+) from (\S+) to (\S+)$/;
const WNEAR_DEPOSIT = /^Deposit (\d+) NEAR to (\S+)$/;
const WNEAR_WITHDRAW = /^Withdraw (\d+) NEAR from (\S+)$/;
const SWAP_LOG = /^Swapped (\d+) (\S+) for (\d+) ([^\s,]+)/;

function isPositive(amount: unknown): amount is string {
  return typeof amount === "string" && /^\d+$/.test(amount) && amount !== "0";
}

function extractTransfers(tx: TransactionDetail): TransferInfo[] {
  const transfers: TransferInfo[] = [];
  const { receiver, actions } = unwrapDelegate(tx);

  // 1. Native NEAR moved by receipts that executed successfully: plain transfers
  //    and deposits attached to function calls. Refunds from `system` are gas
  //    change, and 1-yocto deposits are a security convention, so both are skipped.
  for (const r of tx.receipts) {
    if (isReceiptFailed(r)) continue;
    if (r.receipt.predecessor_id === "system") continue;
    let total = 0n;
    for (const a of receiptActions(r)) {
      if (typeof a === "string") continue;
      const body = (a.Transfer ?? a.FunctionCall) as
        | Record<string, unknown>
        | undefined;
      if (body && isPositive(body.deposit)) total += BigInt(body.deposit);
    }
    if (total > 1n) {
      transfers.push({
        from: r.receipt.predecessor_id,
        to: r.receipt.receiver_id,
        amount: total.toString(),
        tokenType: "near",
      });
    }
  }

  // 2. DeleteAccount — remaining balance goes to beneficiary
  for (const action of actions) {
    const beneficiary = getDeleteAccountBeneficiary(action);
    if (!beneficiary) continue;
    // Find the system receipt that transfers the remaining balance
    for (const r of tx.receipts) {
      if (
        r.receipt.predecessor_id !== "system" ||
        r.receipt.receiver_id !== beneficiary ||
        isReceiptFailed(r)
      )
        continue;
      for (const ra of receiptActions(r)) {
        const deposit = getTransferDeposit(ra);
        if (deposit && deposit !== "0") {
          transfers.push({
            from: receiver,
            to: beneficiary,
            amount: deposit,
            tokenType: "near",
          });
        }
      }
    }
  }

  // 3. Token movements reported by each successful receipt. Failed receipts are
  //    skipped: their logs are kept by the chain but their state changes are not.
  for (const r of tx.receipts) {
    if (isReceiptFailed(r)) continue;
    const receiptContractId = r.receipt.receiver_id;
    const before = transfers.length;
    const logs = r.execution_outcome.outcome.logs;

    for (const log of logs) {
      if (!log.startsWith("EVENT_JSON:")) continue;
      try {
        const evt = JSON.parse(log.slice(11));
        if (!Array.isArray(evt.data)) continue;

        // NEP-141 single-token events
        if (evt.standard === "nep141") {
          for (const d of evt.data) {
            if (!isPositive(d?.amount)) continue;
            if (evt.event === "ft_transfer") {
              transfers.push({
                from: d.old_owner_id ?? "",
                to: d.new_owner_id ?? "",
                amount: d.amount,
                tokenType: "nep141",
                contractId: receiptContractId,
              });
            } else if (evt.event === "ft_mint") {
              transfers.push({
                from: null,
                to: d.owner_id ?? "",
                amount: d.amount,
                tokenType: "nep141",
                contractId: receiptContractId,
              });
            } else if (evt.event === "ft_burn") {
              transfers.push({
                from: d.owner_id ?? "",
                to: null,
                amount: d.amount,
                tokenType: "nep141",
                contractId: receiptContractId,
              });
            }
          }
        }

        // NEP-245 multi-token events
        if (evt.standard === "nep245") {
          for (const d of evt.data) {
            const tokenIds: string[] = d?.token_ids ?? [];
            const amounts: string[] = d?.amounts ?? [];
            for (let j = 0; j < tokenIds.length; j++) {
              const amount = amounts[j];
              if (!isPositive(amount)) continue;
              const rawTokenId = tokenIds[j];
              if (evt.event === "mt_transfer") {
                transfers.push({
                  from: d.old_owner_id ?? "",
                  to: d.new_owner_id ?? "",
                  amount,
                  tokenType: "nep245",
                  contractId: receiptContractId,
                  tokenId: rawTokenId,
                });
              } else if (evt.event === "mt_mint") {
                transfers.push({
                  from: null,
                  to: d.owner_id ?? "",
                  amount,
                  tokenType: "nep245",
                  contractId: receiptContractId,
                  tokenId: rawTokenId,
                });
              } else if (evt.event === "mt_burn") {
                transfers.push({
                  from: d.owner_id ?? "",
                  to: null,
                  amount,
                  tokenType: "nep245",
                  contractId: receiptContractId,
                  tokenId: rawTokenId,
                });
              }
            }
          }
        }
      } catch {
        /* skip malformed event JSON */
      }
    }
    if (transfers.length > before) continue;

    // 3b. Tokens without events: plain-text logs used by early fungible tokens
    for (const log of logs) {
      let m: RegExpMatchArray | null;
      if ((m = log.match(LEGACY_TRANSFER)) || (m = log.match(LEGACY_REFUND))) {
        if (m[1] !== "0") {
          transfers.push({
            from: m[2],
            to: m[3],
            amount: m[1],
            tokenType: "nep141",
            contractId: receiptContractId,
          });
        }
      } else if ((m = log.match(WNEAR_DEPOSIT))) {
        transfers.push({
          from: null,
          to: m[2],
          amount: m[1],
          tokenType: "nep141",
          contractId: receiptContractId,
        });
      } else if ((m = log.match(WNEAR_WITHDRAW))) {
        transfers.push({
          from: m[2],
          to: null,
          amount: m[1],
          tokenType: "nep141",
          contractId: receiptContractId,
        });
      }
    }
    if (transfers.length > before) continue;

    // 3c. Tokens that log nothing at all: read the transfer from the call's arguments
    for (const a of receiptActions(r)) {
      if (typeof a === "string" || !a.FunctionCall) continue;
      const fc = a.FunctionCall as Record<string, unknown>;
      if (fc.method_name !== "ft_transfer" && fc.method_name !== "ft_transfer_call")
        continue;
      const args = decodeArgs(fc.args as string | undefined);
      if (!args || typeof args.receiver_id !== "string" || !isPositive(args.amount))
        continue;
      transfers.push({
        from: r.receipt.predecessor_id,
        to: args.receiver_id,
        amount: args.amount,
        tokenType: "nep141",
        contractId: receiptContractId,
      });
    }
  }

  return transfers;
}

function extractNftTransfers(tx: TransactionDetail): NftTransferInfo[] {
  const nftTransfers: NftTransferInfo[] = [];

  for (const r of tx.receipts) {
    if (isReceiptFailed(r)) continue;
    const receiptContractId = r.receipt.receiver_id;
    for (const log of r.execution_outcome.outcome.logs) {
      if (!log.startsWith("EVENT_JSON:")) continue;
      try {
        const evt = JSON.parse(log.slice(11));
        if (evt.standard !== "nep171" || !Array.isArray(evt.data)) continue;

        for (const d of evt.data) {
          const tokenIds: string[] = d?.token_ids ?? [];
          for (const tid of tokenIds) {
            if (evt.event === "nft_transfer") {
              nftTransfers.push({
                from: d.old_owner_id ?? "",
                to: d.new_owner_id ?? "",
                contractId: receiptContractId,
                tokenId: tid,
              });
            } else if (evt.event === "nft_mint") {
              nftTransfers.push({
                from: null,
                to: d.owner_id ?? "",
                contractId: receiptContractId,
                tokenId: tid,
              });
            } else if (evt.event === "nft_burn") {
              nftTransfers.push({
                from: d.owner_id ?? "",
                to: null,
                contractId: receiptContractId,
                tokenId: tid,
              });
            }
          }
        }
      } catch {
        /* skip malformed event JSON */
      }
    }
  }

  return nftTransfers;
}

function extractSwapLogs(tx: TransactionDetail): SwapLogInfo[] {
  const swaps: SwapLogInfo[] = [];
  for (const r of tx.receipts) {
    if (isReceiptFailed(r)) continue;
    for (const log of r.execution_outcome.outcome.logs) {
      const m = log.match(SWAP_LOG);
      if (!m) continue;
      swaps.push({
        contractId: r.receipt.receiver_id,
        account: r.receipt.predecessor_id,
        amountIn: m[1],
        tokenIn: m[2],
        amountOut: m[3],
        tokenOut: m[4],
      });
    }
  }
  return swaps;
}

/**
 * Overall outcome: follow the chain of `SuccessReceiptId` links from the
 * transaction to the receipt that produced the final result.
 */
function resolveSuccess(tx: TransactionDetail): boolean | null {
  let status = tx.execution_outcome.outcome.status;
  const byId = new Map(tx.receipts.map((r) => [r.receipt.receipt_id, r]));
  for (let hops = 0; hops <= tx.receipts.length; hops++) {
    if ("Failure" in status) return false;
    if ("SuccessValue" in status) return true;
    if (!("SuccessReceiptId" in status)) return null;
    const next = byId.get(String(status.SuccessReceiptId));
    if (!next) return null; // receipt not executed yet → pending
    status = next.execution_outcome.outcome.status;
  }
  return null;
}

/**
 * Whether every receipt the transaction has spawned so far has been executed.
 * The final result can be known while side branches (payouts, callbacks) are
 * still running, and until they finish the token movements are incomplete.
 */
function isFullyExecuted(tx: TransactionDetail): boolean {
  const executed = new Set<string>();
  for (const r of tx.receipts) executed.add(r.receipt.receipt_id);
  for (const d of tx.data_receipts ?? []) {
    const data = d as { receipt_id?: unknown; receipt?: { receipt_id?: unknown } } | null;
    const id = data?.receipt_id ?? data?.receipt?.receipt_id;
    if (typeof id === "string") executed.add(id);
  }
  const spawned = [
    tx.execution_outcome.outcome.receipt_ids,
    ...tx.receipts.map((r) => r.execution_outcome.outcome.receipt_ids),
  ];
  return spawned.every((ids) => (ids ?? []).every((id) => executed.has(id)));
}

export function parseTransaction(tx: TransactionDetail): ParsedTx {
  // A failure is final as soon as it is known; a success only counts once
  // nothing is left running, so that summaries never describe half a transaction.
  const resolved = resolveSuccess(tx);
  const is_success = resolved === true && !isFullyExecuted(tx) ? null : resolved;

  let totalGas = tx.execution_outcome.outcome.gas_burnt;
  let fee = BigInt(tx.execution_outcome.outcome.tokens_burnt || "0");
  for (const r of tx.receipts) {
    totalGas += r.execution_outcome.outcome.gas_burnt;
    fee += BigInt(r.execution_outcome.outcome.tokens_burnt || "0");
  }

  const actions = tx.transaction.actions;
  const parsed: ParsedTx = {
    hash: tx.transaction.hash,
    signer_id: tx.transaction.signer_id,
    receiver_id: tx.transaction.receiver_id,
    public_key:
      typeof tx.transaction.public_key === "string"
        ? tx.transaction.public_key
        : undefined,
    block_height: tx.execution_outcome.block_height,
    timestamp: String(tx.execution_outcome.block_timestamp),
    gas_burnt: totalGas,
    fee: fee.toString(),
    is_success,
    has_failed_receipts: tx.receipts.some(isReceiptFailed),
    actions: actions.map(parseAction),
    transfers: extractTransfers(tx),
    nftTransfers: extractNftTransfers(tx),
    swapLogs: extractSwapLogs(tx),
    receipts: tx.receipts,
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
      // The key that matters is the sender's, not the relayer's
      parsed.public_key =
        typeof delegateAction.public_key === "string"
          ? delegateAction.public_key
          : undefined;
      if (typeof delegateAction.receiver_id === "string") {
        parsed.receiver_id = delegateAction.receiver_id;
      }
      const innerActions = delegateAction.actions;
      if (Array.isArray(innerActions)) {
        parsed.actions = innerActions.map((a: TransactionAction) => {
          // Inner actions may be wrapped as { type: "FunctionCall", ... }
          // or as { FunctionCall: { ... } } like top-level actions
          if (typeof a.type === "string") {
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
