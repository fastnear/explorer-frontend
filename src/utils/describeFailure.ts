import type { ParsedTx } from "./parseTransaction";

const KNOWN: Record<string, (detail: Record<string, unknown>) => string> = {
  AccountAlreadyExists: (d) => `Account ${d.account_id ?? ""} already exists`.replace("  ", " "),
  AccountDoesNotExist: (d) => `Account ${d.account_id ?? ""} does not exist`.replace("  ", " "),
  CreateAccountNotAllowed: (d) =>
    `${d.predecessor_id ?? "This account"} is not allowed to create ${d.account_id ?? "that account"}`,
  CreateAccountOnlyByRegistrar: () => "Only the registrar can create this account name",
  ActorNoPermission: (d) => `${d.actor_id ?? "The sender"} has no permission to act on ${d.account_id ?? "that account"}`,
  LackBalanceForState: () => "Not enough NEAR left to cover the account's storage",
  TriesToUnstake: () => "The account has nothing staked",
  TriesToStake: () => "Not enough balance to stake that amount",
  InsufficientStake: () => "The stake is below the minimum required",
  DeleteKeyDoesNotExist: () => "The access key to remove does not exist",
  AddKeyAlreadyExists: () => "That access key is already on the account",
  DeleteAccountStaking: () => "An account that is staking cannot be deleted",
  DelegateActionExpired: () => "The relayed request expired before it was submitted",
  DelegateActionInvalidNonce: () => "The relayed request was already used or is out of order",
  DelegateActionInvalidSignature: () => "The relayed request has an invalid signature",
  NotEnoughBalance: () => "Not enough NEAR to pay for the transaction",
  NotEnoughAllowance: () => "The access key's spending allowance is used up",
  InvalidNonce: () => "The transaction was already used or is out of order",
  Expired: () => "The transaction expired before it was included",
  MethodNotFound: () => "The contract has no method with that name",
  CodeDoesNotExist: (d) => `${d.account_id ?? "That account"} has no contract deployed`,
  GasExceeded: () => "Ran out of gas",
  GasLimitExceeded: () => "Ran out of gas",
  Deserialization: () => "The contract could not read the arguments it was given",
};

function humanize(key: string): string {
  return key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase());
}

/** Pull the contract's own message out of a panic string */
function cleanPanic(message: string): string {
  let m = message.replace(/^Smart contract panicked:\s*/, "");
  const quoted = m.match(/^panicked at '([\s\S]*?)',\s*\S+:\d+:\d+$/);
  if (quoted) m = quoted[1];
  else m = m.replace(/^panicked at \S+:\d+:\d+:\s*/, "");
  return m.trim() || message;
}

/** One readable line for a `Failure` status from the chain */
export function describeFailure(failure: unknown): string {
  let node: unknown = failure;
  let lastKey = "";
  // Walk down single-key wrappers: ActionError → kind → FunctionCallError → ExecutionError …
  for (let depth = 0; depth < 8; depth++) {
    if (typeof node === "string") {
      if (lastKey === "ExecutionError") return cleanPanic(node);
      return KNOWN[node]?.({}) ?? humanize(node);
    }
    if (!node || typeof node !== "object") break;
    const obj = node as Record<string, unknown>;
    if ("kind" in obj) {
      node = obj.kind;
      continue;
    }
    const keys = Object.keys(obj).filter((k) => k !== "index");
    if (keys.length !== 1) break;
    lastKey = keys[0];
    const known = KNOWN[lastKey];
    const value = obj[lastKey];
    if (known) {
      return known(value && typeof value === "object" ? (value as Record<string, unknown>) : {});
    }
    node = value;
  }
  return lastKey ? humanize(lastKey) : "The transaction failed";
}

export interface FailureInfo {
  /** Contract or account where it failed; absent when the transaction itself was rejected */
  where?: string;
  receiptId?: string;
  message: string;
}

export function findFailures(tx: ParsedTx, txStatus?: Record<string, unknown>): FailureInfo[] {
  const failures: FailureInfo[] = [];
  if (txStatus && "Failure" in txStatus) {
    failures.push({ message: describeFailure(txStatus.Failure) });
  }
  for (const r of tx.receipts) {
    const status = r.execution_outcome.outcome.status;
    if ("Failure" in status) {
      failures.push({
        where: r.receipt.receiver_id,
        receiptId: r.receipt.receipt_id,
        message: describeFailure(status.Failure),
      });
    }
  }
  return failures;
}
