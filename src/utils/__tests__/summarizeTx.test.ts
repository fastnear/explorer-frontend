import { describe, expect, test } from "vitest";
import type { TransactionDetail } from "../../api/types";
import { parseTransaction, type TransferInfo } from "../parseTransaction";
import { netFlows, summarizeTx, summaryText } from "../summarizeTx";

// Real mainnet transactions captured from /v0/transactions
const fixtures = import.meta.glob<{ default: TransactionDetail }>(
  "../../../res/fixtures/*.json",
  { eager: true }
);
const samples = import.meta.glob<{ default: { transactions: TransactionDetail[] } }>(
  "../../../res/tx_*.json",
  { eager: true }
);

function fixture(name: string): TransactionDetail {
  const mod = fixtures[`../../../res/fixtures/${name}.json`];
  if (!mod) throw new Error(`no fixture ${name}`);
  return mod.default;
}

function sample(file: string, hashPrefix: string): TransactionDetail {
  const mod = samples[`../../../${file}`];
  const tx = mod?.default.transactions.find((t) =>
    t.transaction.hash.startsWith(hashPrefix)
  );
  if (!tx) throw new Error(`no ${hashPrefix} in ${file}`);
  return tx;
}

const TOKENS: Record<string, { symbol: string; decimals: number }> = {
  "usdt.tether-token.near": { symbol: "USDt", decimals: 6 },
  "wrap.near": { symbol: "wNEAR", decimals: 24 },
  "zec.omft.near": { symbol: "ZEC", decimals: 8 },
  "token.sweat": { symbol: "SWEAT", decimals: 18 },
  "game.hot.tg": { symbol: "HOT", decimals: 6 },
};
const lookup = (asset: TransferInfo) => TOKENS[asset.contractId ?? ""];

function describeTx(tx: TransactionDetail, viewer?: string) {
  const summary = summarizeTx(parseTransaction(tx), viewer);
  return {
    badge: summary.badge,
    text: summaryText(summary, lookup),
    note: summary.note,
    app: summary.app?.name,
    status: summary.status,
  };
}

const LONG_A = "5755e2586c8b0433049a1140315396d83a895103a45d32f97001454e95a20b59";
const LONG_B = "78b2dd1cf74f990f9d114e78de30dc3b8cc054c32af31e4d3245021090ac6c5b";

describe("transfers", () => {
  test("native NEAR send", () => {
    expect(describeTx(fixture("near-send"))).toMatchObject({
      badge: "Send",
      text: "holderspot.near sent 0.0174 NEAR to adrianr.near",
      status: "success",
    });
  });

  test("token send", () => {
    expect(describeTx(fixture("ft-send"))).toMatchObject({
      badge: "Send",
      text: "tx-bench.near sent 0.000001 USDt to tx-bench-buddy.near",
    });
  });

  test("token send is told from the recipient's side on their page", () => {
    expect(describeTx(fixture("ft-send"), "tx-bench-buddy.near")).toMatchObject({
      badge: "Receive",
      text: "tx-bench-buddy.near received 0.000001 USDt from tx-bench.near",
    });
  });

  test("storage deposit alongside a token send is not reported as a second payment", () => {
    expect(describeTx(fixture("ft-send-with-storage"))).toMatchObject({
      badge: "Send",
      text: `${LONG_A} sent 98.381 USDt to ${LONG_B}`,
    });
  });

  test("token without events is read from its plain-text log", () => {
    expect(describeTx(fixture("wnear-send-legacy-log"))).toMatchObject({
      badge: "Send",
      text: "wx-cruce.near sent 28.1364 wNEAR to u-cexdex.near",
    });
  });

  test("relayed token send names the real sender, not the relayer", () => {
    expect(describeTx(sample("res/tx_examples.json", "8atrNKVj"))).toMatchObject({
      badge: "Send",
      text: "dec9ffda1a8c8f58362372ae5f2f97720f05fecb66027b288f6796fd41630b6b sent 2.1488 SWEAT to fees.sweat",
    });
  });
});

describe("swaps", () => {
  test("NEAR in, token out: the wrap step does not show as a separate movement", () => {
    expect(describeTx(fixture("swap-near-for-usdt"))).toMatchObject({
      badge: "Swap",
      text: "da9df2b2ac045742a47edb75b5aa2542be8a1aafc2a265f8278745c46652bf69 swapped 3.5 NEAR for 10.0384 USDt",
      app: "Rhea Finance (Ref)",
    });
  });

  test("token for token through a pool", () => {
    expect(describeTx(fixture("swap-dcl"))).toMatchObject({
      badge: "Swap",
      text: "closemeat6237.near swapped 3 wNEAR for 8.6041 USDt",
    });
  });

  test("swap inside an exchange balance is read from the exchange log", () => {
    expect(describeTx(fixture("swap-internal-balance"))).toMatchObject({
      badge: "Swap",
      text: "closemeat6237.near swapped 0.014 ZEC for 3.5917 wNEAR",
      note: "inside their exchange balance",
    });
  });

  test("failed swap is worded as an attempt", () => {
    expect(describeTx(fixture("swap-failed-slippage"))).toMatchObject({
      badge: "Call",
      text: "tinykoala595.near tried to call swap on v2.ref-finance.near",
      status: "failed",
    });
  });

  test("refunded ft_transfer_call reports neither a send nor a swap", () => {
    expect(describeTx(fixture("ft-transfer-call-refunded"))).toMatchObject({
      badge: "Call",
      text: "ayoublaf.near called ft_transfer_call on token.rhealab.near",
      note: "a step failed and tokens were returned",
      status: "success",
    });
  });

  test("depositing to an exchange is a send", () => {
    expect(describeTx(fixture("wnear-deposit-to-dex"))).toMatchObject({
      badge: "Send",
      text: "via-trading.near sent 71.7186 wNEAR to v2.ref-finance.near",
    });
  });
});

describe("wrapping", () => {
  test("unwrapping reads as one step: the wNEAR burnt and the NEAR paid out cancel", () => {
    const tx = fixture("unwrap-near");
    expect(describeTx(tx)).toMatchObject({
      badge: "Unwrap",
      text: "walrus1.near unwrapped 0.0322 NEAR",
    });
    // Parsed from wrap.near's plain-text "Withdraw … NEAR from …" log
    const mine = netFlows(parseTransaction(tx).transfers).get("walrus1.near")!;
    const near = mine.get("near")!.amount;
    expect(near > 0n).toBe(true);
    // wrap.near also hands back the 1 yoctoNEAR attached to the call
    expect(near + mine.get("ft:wrap.near")!.amount).toBe(1n);
  });
});

describe("staking", () => {
  const signer = (name: string) => fixture(name).transaction.signer_id;

  test("deposit and stake", () => {
    expect(describeTx(fixture("stake-deposit"))).toMatchObject({
      badge: "Stake",
      text: `${signer("stake-deposit")} staked 675.45 NEAR with zavodil.poolv1.near`,
    });
  });

  test("unstake", () => {
    expect(describeTx(fixture("stake-unstake"))).toMatchObject({
      badge: "Unstake",
      text: `${signer("stake-unstake")} started unstaking 11 NEAR from zavodil.poolv1.near`,
    });
  });

  test("withdraw", () => {
    expect(describeTx(fixture("stake-withdraw"))).toMatchObject({
      badge: "Withdraw",
      text: "c1mp3ng.near withdrew 218.4663 NEAR from zavodil.poolv1.near",
    });
  });
});

describe("accounts and NFTs", () => {
  test("account creation through the registrar", () => {
    expect(describeTx(fixture("account-create"))).toMatchObject({
      badge: "New account",
      text: "free-name.herewallet.near created account valerianbiko.near",
    });
  });

  test("account creation whose inner step failed is not reported as done", () => {
    const tx = fixture("account-create-failed");
    expect(parseTransaction(tx).has_failed_receipts).toBe(true);
    expect(describeTx(tx)).toMatchObject({
      badge: "New account",
      text: "meteor-relayer.near tried to create account smoothyam9421.near",
    });
  });

  test("NFT transfer", () => {
    expect(describeTx(fixture("nft-transfer"))).toMatchObject({
      badge: "NFT send",
      text: "zvalza.tg sent NFT #554:1328 (mint.sharddog.near) to pedarrii.tg",
    });
    expect(describeTx(fixture("nft-transfer"), "pedarrii.tg")).toMatchObject({
      badge: "NFT receive",
      text: "pedarrii.tg received NFT #554:1328 (mint.sharddog.near) from zvalza.tg",
    });
  });

  test("relayed NFT transfer", () => {
    expect(describeTx(fixture("nft-transfer-relayed"))).toMatchObject({
      badge: "NFT send",
      text: "vitvit203.tg sent NFT #410:3078 (mint.sharddog.near) to vitvit203-hot.tg",
    });
  });

  test("contract minting to many accounts falls back to the call, with a count", () => {
    expect(describeTx(fixture("nft-batch-mint"))).toMatchObject({
      badge: "Call",
      text: "nftsairdrop.near called nft_batch_mint on nftsairdrop.near",
      note: "70 token movements",
    });
  });
});

describe("cases where balances would mislead", () => {
  test("batch payout: the signer's small share is not the headline", () => {
    expect(describeTx(sample("res/tx_examples.json", "DmBi9D9K"))).toMatchObject({
      badge: "Call",
      text: "oracle.sweat called defer_batch on token.sweat",
      note: "2 token movements",
    });
  });

  test("a small share is still the story on the recipient's own page", () => {
    // A referral cut of someone else's claim: under a tenth of what was minted
    expect(describeTx(sample("res/tx_examples.json", "3eWyQXxC"), "i1391355443.tg")).toMatchObject({
      badge: "Receive",
      text: "i1391355443.tg received 0.0179 HOT",
    });
  });

  test("claim that mints to the caller", () => {
    expect(describeTx(sample("res/tx_examples.json", "3eWyQXxC"))).toMatchObject({
      badge: "Claim",
      text: "manhcoi83.tg claimed 0.0898 HOT",
    });
  });

  test("a contract executing its own intents falls back to the call", () => {
    expect(describeTx(sample("res/tx_intents.json", "FKniviB1"))).toMatchObject({
      badge: "Call",
      text: "intents.near called execute_intents on intents.near",
      app: "NEAR Intents",
    });
  });
});

describe("whose side the story is told from", () => {
  test("an exchange's page shows the user's swap, not its mirror image", () => {
    expect(describeTx(fixture("swap-near-for-usdt"), "v2.ref-finance.near")).toMatchObject({
      badge: "Swap",
      text: "da9df2b2ac045742a47edb75b5aa2542be8a1aafc2a265f8278745c46652bf69 swapped 3.5 NEAR for 10.0384 USDt",
    });
  });

  test("a staking pool's page shows the delegator staking", () => {
    const tx = fixture("stake-deposit");
    expect(describeTx(tx, "zavodil.poolv1.near")).toMatchObject({
      badge: "Stake",
      text: `${tx.transaction.signer_id} staked 675.45 NEAR with zavodil.poolv1.near`,
    });
  });
});

describe("transactions that are still executing", () => {
  // The swap's result is known before the payout to the user has run
  function withoutPayout(): TransactionDetail {
    const tx = structuredClone(fixture("swap-near-for-usdt"));
    const payout = tx.receipts.findIndex(
      (r) => r.receipt.receiver_id === "usdt.tether-token.near"
    );
    expect(payout).toBeGreaterThan(-1);
    tx.receipts = tx.receipts.slice(0, payout);
    return tx;
  }

  test("are pending until every spawned receipt has run", () => {
    expect(parseTransaction(fixture("swap-near-for-usdt")).is_success).toBe(true);
    expect(parseTransaction(withoutPayout()).is_success).toBe(null);
  });

  test("are described by intent, never as a completed transfer", () => {
    expect(describeTx(withoutPayout())).toMatchObject({
      badge: "Call",
      status: "pending",
      text: "da9df2b2ac045742a47edb75b5aa2542be8a1aafc2a265f8278745c46652bf69 is trying to call near_deposit and ft_transfer_call on wrap.near with 3.5 NEAR",
    });
  });
});

describe("parser", () => {
  test("every fixture is fully executed", () => {
    for (const [path, mod] of Object.entries(fixtures)) {
      expect(parseTransaction(mod.default).is_success, path).not.toBe(null);
    }
  });


  test("transfers logged by a failed receipt are ignored", () => {
    const parsed = parseTransaction(fixture("swap-failed-slippage"));
    expect(parsed.is_success).toBe(false);
    expect(parsed.transfers).toEqual([]);
  });

  test("gas refunds from `system` are not transfers", () => {
    const parsed = parseTransaction(fixture("near-send"));
    expect(parsed.transfers).toHaveLength(1);
    expect(parsed.transfers[0]).toMatchObject({
      from: "holderspot.near",
      to: "adrianr.near",
      tokenType: "near",
    });
  });

  test("fee is the sum burnt by the transaction and its receipts", () => {
    const tx = fixture("near-send");
    const expected =
      BigInt(tx.execution_outcome.outcome.tokens_burnt) +
      tx.receipts.reduce(
        (sum, r) => sum + BigInt(r.execution_outcome.outcome.tokens_burnt),
        0n
      );
    expect(parseTransaction(tx).fee).toBe(expected.toString());
  });
});
