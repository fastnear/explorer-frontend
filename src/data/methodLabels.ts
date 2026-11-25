import { isStakingPool, isWrappedNear } from "./knownContracts";

export interface MethodLabel {
  /** Badge shown on the row */
  badge: string;
  kind: "stake" | "swap" | "account" | "call";
  /** Past tense ("staked") and infinitive ("stake") of the verb phrase */
  past: string;
  inf: string;
  /** Where the NEAR amount for the sentence comes from */
  amount?: "deposit" | "arg" | "received";
  /** Preposition before the contract ("with", "from"); omit to leave the contract out */
  prep?: string;
  /** Name of an argument holding an account to show as the object */
  argAccount?: string;
  /** Restrict the label to contracts where the method has this meaning */
  only?: (receiverId: string) => boolean;
}

const registrar = (id: string) => id === "near" || id === "testnet" || id === "tg";

/**
 * Plain-language wording for common contract methods. Anything not listed
 * reads "called `method` on contract".
 */
export const METHOD_LABELS: Record<string, MethodLabel> = {
  deposit_and_stake: {
    badge: "Stake", kind: "stake", past: "staked", inf: "stake",
    amount: "deposit", prep: "with", only: isStakingPool,
  },
  stake: {
    badge: "Stake", kind: "stake", past: "staked", inf: "stake",
    amount: "arg", prep: "with", only: isStakingPool,
  },
  stake_all: {
    badge: "Stake", kind: "stake", past: "staked their unstaked balance", inf: "stake their unstaked balance",
    prep: "with", only: isStakingPool,
  },
  unstake: {
    badge: "Unstake", kind: "stake", past: "started unstaking", inf: "unstake",
    amount: "arg", prep: "from", only: isStakingPool,
  },
  unstake_all: {
    badge: "Unstake", kind: "stake", past: "started unstaking everything", inf: "unstake everything",
    prep: "from", only: isStakingPool,
  },
  withdraw: {
    badge: "Withdraw", kind: "stake", past: "withdrew", inf: "withdraw",
    amount: "arg", prep: "from", only: isStakingPool,
  },
  withdraw_all: {
    badge: "Withdraw", kind: "stake", past: "withdrew", inf: "withdraw",
    amount: "received", prep: "from", only: isStakingPool,
  },
  near_deposit: {
    badge: "Wrap", kind: "swap", past: "wrapped", inf: "wrap",
    amount: "deposit", only: isWrappedNear,
  },
  near_withdraw: {
    badge: "Unwrap", kind: "swap", past: "unwrapped", inf: "unwrap",
    amount: "arg", only: isWrappedNear,
  },
  storage_deposit: {
    badge: "Register", kind: "call", past: "registered with", inf: "register with",
    prep: "",
  },
  create_account: {
    badge: "New account", kind: "account", past: "created account", inf: "create account",
    argAccount: "new_account_id", only: registrar,
  },
};

export function methodLabel(
  method: string | undefined,
  receiverId: string
): MethodLabel | undefined {
  if (!method) return undefined;
  if (!Object.prototype.hasOwnProperty.call(METHOD_LABELS, method)) return undefined;
  const label = METHOD_LABELS[method];
  return !label.only || label.only(receiverId) ? label : undefined;
}
