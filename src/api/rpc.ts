import { networkId } from "../config";
import { parsePublicKey } from "../utils/publicKey";

const RPC_URL =
  networkId === "testnet"
    ? "https://rpc.testnet.fastnear.com"
    : "https://rpc.mainnet.fastnear.com";

const NO_CONTRACT_CODE_HASH = "11111111111111111111111111111111";

export interface AccountState {
  amount: string;
  locked: string;
  code_hash: string;
  storage_usage: number;
  block_height: number;
  block_hash: string;
  hasContract: boolean;
}

export async function viewAccount(
  accountId: string,
  signal?: AbortSignal
): Promise<AccountState | null> {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "1",
      method: "query",
      params: {
        request_type: "view_account",
        finality: "final",
        account_id: accountId,
      },
    }),
    signal,
  });
  const json = await res.json();
  if (json.error) {
    if (json.error.cause?.name === "UNKNOWN_ACCOUNT") return null;
    throw new Error(json.error.message ?? JSON.stringify(json.error));
  }
  const r = json.result;
  return {
    amount: r.amount,
    locked: r.locked,
    code_hash: r.code_hash,
    storage_usage: r.storage_usage,
    block_height: r.block_height,
    block_hash: r.block_hash,
    hasContract: r.code_hash !== NO_CONTRACT_CODE_HASH,
  };
}

// One cryptography type (curve) present among an account's access keys.
export interface AccessKeyType {
  curve: string; // e.g. "ed25519", "secp256k1", "ml-dsa-65-hash"
  count: number;
  isPostQuantum: boolean;
}

export interface AccessKeySummary {
  total: number;
  // Access keys grouped by cryptography type, so new curves surface on their
  // own without special-casing any particular scheme.
  types: AccessKeyType[];
}

// Fetches an account's full access-key list in a single RPC call and groups the
// keys by cryptography type. Returns null for unknown accounts.
export async function viewAccessKeyList(
  accountId: string,
  signal?: AbortSignal
): Promise<AccessKeySummary | null> {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "1",
      method: "query",
      params: {
        request_type: "view_access_key_list",
        finality: "final",
        account_id: accountId,
      },
    }),
    signal,
  });
  const json = await res.json();
  if (json.error) {
    if (json.error.cause?.name === "UNKNOWN_ACCOUNT") return null;
    throw new Error(json.error.message ?? JSON.stringify(json.error));
  }
  const keys: { public_key: string }[] = json.result?.keys ?? [];
  const byCurve = new Map<string, AccessKeyType>();
  for (const k of keys) {
    const { curve, isPostQuantum } = parsePublicKey(k.public_key);
    const existing = byCurve.get(curve);
    if (existing) existing.count += 1;
    else byCurve.set(curve, { curve, count: 1, isPostQuantum });
  }
  const types = [...byCurve.values()].sort((a, b) => b.count - a.count);
  return { total: keys.length, types };
}

export async function viewCall<T>(
  contractId: string,
  methodName: string,
  args: Record<string, unknown> = {}
): Promise<T> {
  const argsBase64 = btoa(JSON.stringify(args));
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "1",
      method: "query",
      params: {
        request_type: "call_function",
        finality: "final",
        account_id: contractId,
        method_name: methodName,
        args_base64: argsBase64,
      },
    }),
  });
  const json = await res.json();
  if (json.error) {
    throw new Error(json.error.message ?? JSON.stringify(json.error));
  }
  const bytes = new Uint8Array(json.result.result);
  const text = new TextDecoder().decode(bytes);
  return JSON.parse(text) as T;
}
