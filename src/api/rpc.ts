import { networkId } from "../config";

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

export interface AccessKeyInfo {
  public_key: string;
  /** "FullAccess", or the contract a limited key may call */
  permission: "FullAccess" | { receiver_id: string; method_names: string[]; allowance: string | null };
  nonce: number;
}

export class TooManyAccessKeysError extends Error {
  constructor(public limit: number) {
    super(`Account has more than ${limit} access keys`);
  }
}

export async function viewAccessKeys(
  accountId: string,
  signal?: AbortSignal
): Promise<AccessKeyInfo[]> {
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
    // The RPC refuses to list keys in one response past a fixed limit
    if (json.error.cause?.name === "TOO_MANY_ACCESS_KEYS") {
      throw new TooManyAccessKeysError(json.error.cause.info?.limit ?? 100);
    }
    throw new Error(json.error.message ?? JSON.stringify(json.error));
  }
  const keys: { public_key: string; access_key: { nonce: number; permission: unknown } }[] =
    json.result?.keys ?? [];
  return keys.map((k) => {
    const perm = k.access_key.permission;
    const fc =
      perm && typeof perm === "object"
        ? ((perm as Record<string, unknown>).FunctionCall as Record<string, unknown> | undefined)
        : undefined;
    return {
      public_key: k.public_key,
      nonce: k.access_key.nonce,
      permission: fc
        ? {
            receiver_id: String(fc.receiver_id ?? ""),
            method_names: (fc.method_names as string[]) ?? [],
            allowance: (fc.allowance as string | null) ?? null,
          }
        : "FullAccess",
    };
  });
}

export interface PoolBalance {
  pool_id: string;
  staked: string;
  unstaked: string;
  can_withdraw: boolean;
}

/** An account's position in one staking pool (standard staking-pool `get_account` view) */
export async function viewPoolBalance(
  poolId: string,
  accountId: string
): Promise<PoolBalance> {
  const r = await viewCall<{
    staked_balance: string;
    unstaked_balance: string;
    can_withdraw: boolean;
  }>(poolId, "get_account", { account_id: accountId });
  return {
    pool_id: poolId,
    staked: r.staked_balance ?? "0",
    unstaked: r.unstaked_balance ?? "0",
    can_withdraw: !!r.can_withdraw,
  };
}
