import { networkId } from "../config";

export type ContractCategory =
  | "dex"
  | "lending"
  | "staking"
  | "bridge"
  | "nft"
  | "token"
  | "wallet"
  | "infra"
  | "app";

export interface KnownContract {
  name: string;
  category: ContractCategory;
}

/**
 * Hand-kept names for well-known mainnet contracts. This list is small on
 * purpose: unknown contracts simply show their account ID. Add entries here.
 */
const MAINNET: Record<string, KnownContract> = {
  "v2.ref-finance.near": { name: "Rhea Finance (Ref)", category: "dex" },
  "dclv2.ref-labs.near": { name: "Rhea Finance (Ref)", category: "dex" },
  "contract.main.burrow.near": { name: "Burrow", category: "lending" },
  "intents.near": { name: "NEAR Intents", category: "dex" },
  "wrap.near": { name: "Wrapped NEAR", category: "token" },
  "meta-pool.near": { name: "Meta Pool", category: "staking" },
  "linear-protocol.near": { name: "LiNEAR", category: "staking" },
  "token.sweat": { name: "Sweat Economy", category: "token" },
  "game.hot.tg": { name: "HOT", category: "app" },
  "v2_1.omni.hot.tg": { name: "HOT Omni", category: "bridge" },
  "omni.bridge.near": { name: "Omni Bridge", category: "bridge" },
  "contract.portalbridge.near": { name: "Portal Bridge", category: "bridge" },
  "aurora": { name: "Aurora", category: "bridge" },
  "near": { name: "NEAR account registrar", category: "infra" },
  "tg": { name: "Telegram account registrar", category: "infra" },
  "social.near": { name: "NEAR Social", category: "app" },
  "v1.signer": { name: "Chain Signatures", category: "infra" },
  "x.paras.near": { name: "Paras", category: "nft" },
  "marketplace.paras.near": { name: "Paras", category: "nft" },
  "market.tradeport.near": { name: "Tradeport", category: "nft" },
  "mint.sharddog.near": { name: "ShardDog", category: "nft" },
  "nft.herewallet.near": { name: "HOT Wallet", category: "nft" },
  "asac.near": { name: "Antisocial Ape Club", category: "nft" },
};

export function knownContract(accountId: string): KnownContract | undefined {
  return networkId === "mainnet" ? MAINNET[accountId] : undefined;
}

/** Validator staking pools follow a fixed naming scheme on each network */
export function isStakingPool(accountId: string): boolean {
  return /\.pool(v1)?\.near$|\.pool\.f863973\.m0$|\.pool\.[a-z0-9]+\.testnet$/.test(
    accountId
  );
}

export function isWrappedNear(contractId: string | undefined): boolean {
  return contractId === "wrap.near" || contractId === "wrap.testnet";
}
