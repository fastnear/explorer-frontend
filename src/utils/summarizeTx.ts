import type {
  ParsedAction,
  ParsedTx,
  TransferInfo,
  NftTransferInfo,
} from "./parseTransaction";
import { decodeArgs } from "./parseTransaction";
import { formatUnits, NEAR_DECIMALS } from "./format";
import { knownContract, isWrappedNear } from "../data/knownContracts";
import { methodLabel } from "../data/methodLabels";

export type TxKind =
  | "send"
  | "receive"
  | "swap"
  | "mint"
  | "burn"
  | "nft"
  | "stake"
  | "account"
  | "key"
  | "deploy"
  | "call";

/** A token amount: only the asset identity and amount of the TransferInfo are used */
export type AmountPart = { t: "amount"; asset: TransferInfo };

export type SummaryPart =
  | { t: "text"; text: string }
  | { t: "account"; id: string }
  | AmountPart
  | { t: "nft"; contractId: string; tokenId: string; count: number }
  | { t: "method"; name: string };

export interface TxSummary {
  kind: TxKind;
  /** Badge text, e.g. "Send", "Swap", "Unstake" */
  badge: string;
  /** The sentence, as typed pieces a UI can render with links, icons and prices */
  parts: SummaryPart[];
  /** Well-known app involved, if any */
  app?: { id: string; name: string };
  /** Short qualifier shown after the sentence, e.g. "7 token movements" */
  note?: string;
  status: "success" | "failed" | "pending";
}

const BADGE: Record<TxKind, string> = {
  send: "Send",
  receive: "Receive",
  swap: "Swap",
  mint: "Mint",
  burn: "Burn",
  nft: "NFT",
  stake: "Stake",
  account: "Account",
  key: "Access key",
  deploy: "Deploy",
  call: "Call",
};

/* ------------------------------------------------------------------ */
/* Net flows                                                           */
/* ------------------------------------------------------------------ */

interface Flow {
  key: string;
  asset: TransferInfo;
  amount: bigint; // positive = received, negative = sent
}

function assetKey(t: TransferInfo): string {
  if (t.tokenType === "near") return "near";
  if (t.tokenType === "nep141") return `ft:${t.contractId}`;
  return `mt:${t.contractId}:${t.tokenId}`;
}

/** Net change per account and asset across all transfers of a transaction */
export function netFlows(transfers: TransferInfo[]): Map<string, Map<string, Flow>> {
  const byAccount = new Map<string, Map<string, Flow>>();
  const add = (account: string | null, t: TransferInfo, delta: bigint) => {
    if (!account) return;
    let flows = byAccount.get(account);
    if (!flows) byAccount.set(account, (flows = new Map()));
    const key = assetKey(t);
    const flow = flows.get(key);
    if (flow) flow.amount += delta;
    else flows.set(key, { key, asset: t, amount: delta });
  };
  for (const t of transfers) {
    if (t.from === t.to) continue;
    let amount: bigint;
    try {
      amount = BigInt(t.amount);
    } catch {
      continue;
    }
    add(t.from, t, -amount);
    add(t.to, t, amount);
  }
  return byAccount;
}

// NEAR below this is treated as incidental (storage deposits and their refunds)
// when the same account also moved tokens or NFTs.
const INCIDENTAL_NEAR = 5n * 10n ** 22n; // 0.05 NEAR

const NEAR_DUST = 10n ** 18n; // 0.000001 NEAR

const abs = (n: bigint) => (n < 0n ? -n : n);

interface AccountFlows {
  ins: Flow[];
  outs: Flow[];
  nftIn: NftTransferInfo[];
  nftOut: NftTransferInfo[];
}

function flowsFor(tx: ParsedTx, account: string, requireShare: boolean): AccountFlows {
  const all = netFlows(tx.transfers);
  const mine = new Map(all.get(account) ?? []);

  // NEAR and wrapped NEAR are the same thing to a reader: let a wrap or unwrap
  // inside the transaction cancel out instead of showing as two movements.
  const near = mine.get("near");
  const wrappedKey = [...mine.keys()].find(
    (k) => k.startsWith("ft:") && isWrappedNear(k.slice(3))
  );
  const wrapped = wrappedKey ? mine.get(wrappedKey) : undefined;
  if (near && wrapped && near.amount < 0n !== wrapped.amount < 0n) {
    const sum = near.amount + wrapped.amount;
    const keep = abs(near.amount) >= abs(wrapped.amount) ? near : wrapped;
    mine.delete("near");
    mine.delete(wrappedKey!);
    if (sum !== 0n) mine.set(keep.key, { ...keep, amount: sum });
  }

  const nftIn = tx.nftTransfers.filter((n) => n.to === account && n.from !== account);
  const nftOut = tx.nftTransfers.filter((n) => n.from === account && n.to !== account);

  // Leftover yoctoNEAR (the 1-yocto deposits contracts hand back) is never the story
  let flows = [...mine.values()].filter(
    (f) => f.amount !== 0n && !(f.key === "near" && abs(f.amount) < NEAR_DUST)
  );
  const hasOther =
    flows.some((f) => f.key !== "near") || nftIn.length > 0 || nftOut.length > 0;
  if (hasOther) {
    flows = flows.filter((f) => f.key !== "near" || abs(f.amount) >= INCIDENTAL_NEAR);
  }

  // Share of each asset's total movement that belongs to this account. If the
  // account only took a small cut of everything, describing the transaction
  // through it would mislead (e.g. a batch payout signed by an oracle). On an
  // account's own page its cut is exactly what the reader wants, however small.
  if (requireShare && flows.length > 0) {
    const significant = flows.some((f) => {
      let total = 0n;
      for (const other of all.values()) {
        const o = other.get(f.key);
        if (o && o.amount > 0n === f.amount > 0n) total += abs(o.amount);
      }
      return total === 0n || (abs(f.amount) * 100n) / total >= 30n;
    });
    if (!significant) flows = [];
  }

  return {
    ins: flows.filter((f) => f.amount > 0n),
    outs: flows.filter((f) => f.amount < 0n),
    nftIn,
    nftOut,
  };
}

/* ------------------------------------------------------------------ */
/* Sentence building                                                   */
/* ------------------------------------------------------------------ */

const text = (t: string): SummaryPart => ({ t: "text", text: t });
const account = (id: string): SummaryPart => ({ t: "account", id });
const method = (name: string): SummaryPart => ({ t: "method", name });

function amountPart(asset: TransferInfo, amount: bigint | string): AmountPart {
  return {
    t: "amount",
    asset: { ...asset, from: null, to: null, amount: abs(BigInt(amount)).toString() },
  };
}

const nearAmount = (yocto: bigint | string): AmountPart =>
  amountPart({ from: null, to: null, amount: "0", tokenType: "near" }, yocto);

/** "X", "X and Y", or "X, Y and 2 more" */
function listParts(items: SummaryPart[], max = 2): SummaryPart[] {
  const shown = items.slice(0, max);
  const out: SummaryPart[] = [];
  shown.forEach((item, i) => {
    if (i > 0) out.push(text(i === shown.length - 1 && items.length <= max ? "and" : ","));
    out.push(item);
  });
  if (items.length > max) out.push(text(`and ${items.length - max} more`));
  return out;
}

function nftParts(nfts: NftTransferInfo[]): SummaryPart[] {
  const byContract = new Map<string, NftTransferInfo[]>();
  for (const n of nfts) {
    const list = byContract.get(n.contractId);
    if (list) list.push(n);
    else byContract.set(n.contractId, [n]);
  }
  return listParts(
    [...byContract.values()].map((list) => ({
      t: "nft" as const,
      contractId: list[0].contractId,
      tokenId: list[0].tokenId,
      count: list.length,
    }))
  );
}

function uniq<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function counterpartyParts(
  preposition: string,
  ids: (string | null)[]
): SummaryPart[] {
  const named = uniq(ids.filter((id): id is string => !!id));
  if (named.length === 0) return [];
  if (named.length === 1) return [text(preposition), account(named[0])];
  return [text(`${preposition} ${named.length} accounts`)];
}

function findApp(tx: ParsedTx, actor: string): TxSummary["app"] {
  const direct = knownContract(tx.receiver_id);
  if (direct && direct.category !== "token") {
    return { id: tx.receiver_id, name: direct.name };
  }
  for (const t of tx.transfers) {
    for (const id of [t.to, t.from]) {
      if (!id || id === actor) continue;
      const known = knownContract(id);
      if (known && known.category !== "token") return { id, name: known.name };
    }
  }
  return undefined;
}

type Mode = "done" | "failed" | "pending";

/** "staked" / "tried to stake" / "is trying to stake" */
function verb(mode: Mode, past: string, inf: string): SummaryPart {
  return text(
    mode === "done" ? past : mode === "failed" ? `tried to ${inf}` : `is trying to ${inf}`
  );
}

function isCall(a: ParsedAction): boolean {
  return a.type === "FunctionCall";
}

function totalDeposit(actions: ParsedAction[]): bigint {
  let total = 0n;
  for (const a of actions) {
    if (a.deposit && /^\d+$/.test(a.deposit)) total += BigInt(a.deposit);
  }
  return total;
}

/* ------------------------------------------------------------------ */
/* Rules                                                               */
/* ------------------------------------------------------------------ */

type Draft = Pick<TxSummary, "kind" | "parts"> & { badge?: string; note?: string };

/** A single well-known method call, e.g. staking or wrapping */
function labelSummary(tx: ParsedTx, mode: Mode): Draft | null {
  if (tx.actions.length !== 1 || !isCall(tx.actions[0])) return null;
  const action = tx.actions[0];
  const label = methodLabel(action.method_name, tx.receiver_id);
  if (!label) return null;

  const parts: SummaryPart[] = [account(tx.signer_id), verb(mode, label.past, label.inf)];
  const args = decodeArgs(action.args);

  if (label.amount === "deposit" && action.deposit && action.deposit !== "0") {
    parts.push(nearAmount(action.deposit));
  } else if (label.amount === "arg" && args && typeof args.amount === "string" && /^\d+$/.test(args.amount)) {
    parts.push(nearAmount(args.amount));
  } else if (label.amount === "received" && mode === "done") {
    const got = netFlows(tx.transfers).get(tx.signer_id)?.get("near");
    if (got && got.amount > 0n) parts.push(nearAmount(got.amount));
  }
  if (label.argAccount && args && typeof args[label.argAccount] === "string") {
    parts.push(account(args[label.argAccount] as string));
  }
  if (label.prep !== undefined) {
    if (label.prep) parts.push(text(label.prep));
    parts.push(account(tx.receiver_id));
  }
  return { kind: label.kind, badge: label.badge, parts };
}

/** What the transaction did to one account's balances */
function flowSummary(tx: ParsedTx, who: string, isViewer: boolean): Draft | null {
  const calls = tx.actions.filter(isCall);
  // A contract calling itself (relayers, solvers, bots) moves other people's
  // tokens around; its own balance changes do not describe the transaction.
  if (!isViewer && who === tx.receiver_id && calls.length > 0) return null;

  const { ins, outs, nftIn, nftOut } = flowsFor(tx, who, !isViewer);
  if (ins.length + outs.length + nftIn.length + nftOut.length === 0) return null;

  const subject = account(who);
  const inParts = ins.map((f) => amountPart(f.asset, f.amount));
  const outParts = outs.map((f) => amountPart(f.asset, f.amount));
  const keys = (flows: Flow[]) => new Set(flows.map((f) => f.key));

  // Token for token
  if (ins.length > 0 && outs.length > 0) {
    return {
      kind: "swap",
      parts: [subject, text("swapped"), ...listParts(outParts), text("for"), ...listParts(inParts)],
    };
  }
  // NFT trades
  if (nftIn.length > 0 && outs.length > 0) {
    return {
      kind: "nft",
      badge: "NFT buy",
      parts: [subject, text("bought"), ...nftParts(nftIn), text("for"), ...listParts(outParts)],
    };
  }
  if (nftOut.length > 0 && ins.length > 0) {
    return {
      kind: "nft",
      badge: "NFT sale",
      parts: [subject, text("sold"), ...nftParts(nftOut), text("for"), ...listParts(inParts)],
    };
  }

  if (outs.length > 0) {
    const outKeys = keys(outs);
    const direct = tx.transfers.filter(
      (t) => t.from === who && t.to !== who && outKeys.has(assetKey(t))
    );
    if (direct.length > 0 && direct.every((t) => t.to === null)) {
      return { kind: "burn", parts: [subject, text("burned"), ...listParts(outParts)] };
    }
    const recipients = direct.map((t) => t.to);
    // NEAR attached to a contract call reads better as a call than as a payment
    const onlyNear = outs.length === 1 && outs[0].key === "near";
    if (!isViewer && onlyNear && calls.length > 0 && uniq(recipients).length === 1 && recipients[0] === tx.receiver_id) {
      return {
        kind: "call",
        parts: [...callParts(tx, "done"), text("with"), outParts[0]],
      };
    }
    return {
      kind: "send",
      parts: [subject, text("sent"), ...listParts(outParts), ...counterpartyParts("to", recipients)],
    };
  }

  if (ins.length > 0) {
    const inKeys = keys(ins);
    const direct = tx.transfers.filter(
      (t) => t.to === who && t.from !== who && inKeys.has(assetKey(t))
    );
    const minted = direct.length > 0 && direct.every((t) => t.from === null);
    if (minted && !isViewer) {
      const claimed = calls.some((a) => /claim|harvest|reward/i.test(a.method_name ?? ""));
      return {
        kind: "mint",
        badge: claimed ? "Claim" : "Mint",
        parts: [subject, text(claimed ? "claimed" : "minted"), ...listParts(inParts)],
      };
    }
    return {
      kind: "receive",
      parts: [
        subject,
        text("received"),
        ...listParts(inParts),
        ...counterpartyParts("from", direct.map((t) => t.from)),
      ],
    };
  }

  if (nftOut.length > 0) {
    if (nftOut.every((n) => n.to === null)) {
      return { kind: "nft", badge: "NFT burn", parts: [subject, text("burned"), ...nftParts(nftOut)] };
    }
    return {
      kind: "nft",
      badge: "NFT send",
      parts: [subject, text("sent"), ...nftParts(nftOut), ...counterpartyParts("to", nftOut.map((n) => n.to))],
    };
  }
  if (nftIn.every((n) => n.from === null)) {
    return { kind: "nft", badge: "NFT mint", parts: [subject, text(isViewer ? "received" : "minted"), ...nftParts(nftIn)] };
  }
  return {
    kind: "nft",
    badge: "NFT receive",
    parts: [subject, text("received"), ...nftParts(nftIn), ...counterpartyParts("from", nftIn.map((n) => n.from))],
  };
}

/** A swap reported only in an exchange's log (tokens stayed inside the exchange) */
function swapLogSummary(tx: ParsedTx): Draft | null {
  const mine = tx.swapLogs.filter(
    (s) => s.account === tx.signer_id && s.contractId === tx.receiver_id
  );
  if (mine.length === 0) return null;
  const first = mine[0];
  const last = mine[mine.length - 1];
  const token = (contractId: string, amount: string): AmountPart =>
    amountPart({ from: null, to: null, amount, tokenType: "nep141", contractId }, amount);
  return {
    kind: "swap",
    parts: [
      account(tx.signer_id),
      text("swapped"),
      token(first.tokenIn, first.amountIn),
      text("for"),
      token(last.tokenOut, last.amountOut),
    ],
    note: "inside their exchange balance",
  };
}

function callParts(tx: ParsedTx, mode: Mode): SummaryPart[] {
  const names = uniq(tx.actions.filter(isCall).map((a) => a.method_name ?? "call"));
  const shown = names.slice(0, 2).map(method);
  const parts: SummaryPart[] = [
    account(tx.signer_id),
    verb(mode, "called", "call"),
    ...listParts(shown, 2),
  ];
  if (names.length > 2) parts.push(text(`and ${names.length - 2} more`));
  parts.push(text("on"), account(tx.receiver_id));
  return parts;
}

/** Wording taken from the actions alone, used when balances say nothing */
function actionSummary(tx: ParsedTx, mode: Mode): Draft {
  const actor = account(tx.signer_id);
  const target = account(tx.receiver_id);
  const actions = tx.actions;
  const types = new Set(actions.map((a) => a.type));
  const self = tx.signer_id === tx.receiver_id;

  if (actions.length === 0) {
    return { kind: "call", parts: [actor, text("sent an empty transaction to"), target] };
  }

  if (types.has("CreateAccount")) {
    const funded = totalDeposit(actions.filter((a) => a.type === "Transfer"));
    const parts = [actor, verb(mode, "created account", "create account"), target];
    if (funded > 0n) parts.push(text("with"), nearAmount(funded));
    return { kind: "account", badge: "New account", parts };
  }

  if (types.has("DeleteAccount")) {
    const beneficiary = actions.find((a) => a.type === "DeleteAccount")?.beneficiary_id;
    const parts = [actor, verb(mode, "deleted account", "delete account"), target];
    if (beneficiary) parts.push(text("and sent the remaining balance to"), account(beneficiary));
    return { kind: "account", badge: "Delete account", parts };
  }

  if (types.has("DeployContract")) {
    const parts = [actor, verb(mode, "deployed a contract", "deploy a contract")];
    if (!self) parts.push(text("to"), target);
    return { kind: "deploy", parts };
  }

  if (actions.every((a) => a.type === "AddKey" || a.type === "DeleteKey")) {
    const where: SummaryPart[] = self ? [] : [text("on"), target];
    if (actions.length === 1) {
      const a = actions[0];
      if (a.type === "DeleteKey") {
        return { kind: "key", parts: [actor, verb(mode, "removed an access key", "remove an access key"), ...where] };
      }
      if (a.access_key_contract) {
        return {
          kind: "key",
          badge: "App access",
          parts: [
            actor,
            verb(mode, "gave limited access to", "give limited access to"),
            account(a.access_key_contract),
            ...where,
          ],
        };
      }
      return {
        kind: "key",
        parts: [actor, verb(mode, "added a full-access key", "add a full-access key"), ...where],
      };
    }
    return {
      kind: "key",
      parts: [actor, verb(mode, `changed ${actions.length} access keys`, `change ${actions.length} access keys`), ...where],
    };
  }

  if (types.has("Stake")) {
    const stake = actions.find((a) => a.type === "Stake")?.stake;
    if (stake === "0") {
      return { kind: "stake", badge: "Unstake", parts: [actor, verb(mode, "stopped validating", "stop validating")] };
    }
    const parts = [actor, verb(mode, "set a validator stake", "set a validator stake")];
    if (stake) parts.push(text("of"), nearAmount(stake));
    return { kind: "stake", parts };
  }

  if (actions.every((a) => a.type === "Transfer")) {
    return {
      kind: "send",
      parts: [actor, verb(mode, "sent", "send"), nearAmount(totalDeposit(actions)), text("to"), target],
    };
  }

  const calls = actions.filter(isCall);
  if (calls.length > 0) {
    const parts = callParts(tx, mode);
    const attached = totalDeposit(calls);
    if (attached >= INCIDENTAL_NEAR) parts.push(text("with"), nearAmount(attached));
    return { kind: "call", parts };
  }

  const names = uniq(actions.map((a) => a.type)).join(", ");
  return { kind: "call", parts: [actor, verb(mode, `ran ${names} on`, `run ${names} on`), target] };
}

function movementNote(tx: ParsedTx): string | undefined {
  // NEAR sent along with calls is not counted: it is rarely the point of the transaction
  const count =
    tx.transfers.filter((t) => t.tokenType !== "near").length + tx.nftTransfers.length;
  if (count === 0) return undefined;
  return count === 1 ? "1 token movement" : `${count} token movements`;
}

/** Did this account execute a function call as part of the transaction? */
function ranContractCode(tx: ParsedTx, accountId: string): boolean {
  return tx.receipts.some((r) => {
    if (r.receipt.receiver_id !== accountId) return false;
    const action = (r.receipt.receipt as Record<string, unknown>)?.Action as
      | { actions?: unknown[] }
      | undefined;
    return (action?.actions ?? []).some(
      (a) => !!a && typeof a === "object" && "FunctionCall" in (a as object)
    );
  });
}

/**
 * Describe a transaction in one plain-language sentence.
 *
 * `viewer` is the account whose page the sentence is shown on: when that
 * account's own balance changed, the sentence is written from its side.
 */
export function summarizeTx(tx: ParsedTx, viewer?: string): TxSummary {
  const actor = tx.signer_id;
  const status: TxSummary["status"] =
    tx.is_success === null ? "pending" : tx.is_success ? "success" : "failed";
  const finish = (draft: Draft): TxSummary => ({
    kind: draft.kind,
    badge: draft.badge ?? BADGE[draft.kind],
    parts: draft.parts,
    note: draft.note,
    app: findApp(tx, actor),
    status,
  });

  // Nothing is known to have happened yet (or nothing did): describe the intent only
  if (status !== "success") {
    const mode: Mode = status === "failed" ? "failed" : "pending";
    return finish(labelSummary(tx, mode) ?? actionSummary(tx, mode));
  }

  // On someone else's page, tell it from their side — unless they took part as
  // a contract (a pool, an exchange, a token): then their balance changes are
  // the mirror image of what the user did, and the user's sentence is the story.
  if (viewer && viewer !== actor && !ranContractCode(tx, viewer)) {
    const theirs = flowSummary(tx, viewer, true);
    if (theirs) return finish(theirs);
  }

  // A well-known method names an intent ("create account"). If a step failed
  // we cannot claim the intent was carried out, so word it as an attempt.
  const draft =
    labelSummary(tx, tx.has_failed_receipts ? "failed" : "done") ??
    flowSummary(tx, actor, false) ??
    swapLogSummary(tx) ??
    actionSummary(tx, "done");

  if (!draft.note && draft.kind === "call") {
    const refunded =
      tx.has_failed_receipts && tx.transfers.some((t) => t.tokenType !== "near");
    draft.note = refunded ? "a step failed and tokens were returned" : movementNote(tx);
  }
  return finish(draft);
}

/* ------------------------------------------------------------------ */
/* Plain text (page titles, tests)                                     */
/* ------------------------------------------------------------------ */

export type TokenInfoLookup = (
  asset: TransferInfo
) => { symbol: string; decimals: number } | undefined;

function amountText(asset: TransferInfo, lookup?: TokenInfoLookup): string {
  if (asset.tokenType === "near") {
    return `${formatUnits(asset.amount, NEAR_DECIMALS)} NEAR`;
  }
  const info = lookup?.(asset);
  if (info) return `${formatUnits(asset.amount, info.decimals)} ${info.symbol}`;
  const id = asset.tokenType === "nep245" ? `${asset.contractId}:${asset.tokenId}` : asset.contractId;
  return `${asset.amount} units of ${id}`;
}

/** The sentence as a plain string. Token symbols come from `lookup` when given. */
export function summaryText(summary: TxSummary, lookup?: TokenInfoLookup): string {
  const words = summary.parts.map((p) => {
    switch (p.t) {
      case "text":
        return p.text;
      case "account":
        return p.id;
      case "method":
        return p.name;
      case "amount":
        return amountText(p.asset, lookup);
      case "nft":
        return p.count > 1
          ? `${p.count} NFTs (${p.contractId})`
          : `NFT #${p.tokenId} (${p.contractId})`;
    }
  });
  return words.join(" ").replace(/ ,/g, ",");
}
