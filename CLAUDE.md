# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

NEAR blockchain explorer frontend (near.rocks). React 18 + TypeScript + Tailwind CSS v4 + Vite. Uses react-router-dom for routing.

The UI is written for ordinary Web3 users first: every transaction is described in one plain-language sentence, and developer detail (receipts, arguments, logs, gas, raw JSON) is collapsed by default.

## Build & Development

- `yarn install` — install dependencies
- `yarn dev` — start dev server
- `yarn build` — typecheck and build (`tsc -b && vite build`)
- `yarn preview` — preview production build
- `yarn test` — run unit tests (vitest)
- `npx tsc -b` — typecheck only (no linter configured)

## Architecture

### Routing

Routes are defined in `src/App.tsx`, all wrapped in a shared `Layout`:
- `/` — Home dashboard (search, network stats, latest transactions and blocks)
- `/blocks` — Block list with infinite scroll and filters
- `/block/:blockId` — Block detail with its transactions
- `/tx/:txHash` — Transaction detail (a receipt ID in place of the hash redirects to its transaction)
- `/account/:accountId` — Account page with tabs (`?tab=tokens|nfts|staking|details`; activity is the default)
- anything else — `NotFound`

### Data sources

- **Transaction API** (`src/api/client.ts`, `src/api/endpoints.ts`): POST `/v0/{endpoint}` on a fastnear backend (`VITE_API_BASE_URL`, defaults to `https://tx.main.fastnear.com`). Endpoints: `getBlocks`, `getBlock`, `getTransactions` (max 20 hashes), `getAccount`, `getReceipt`.
- **RPC** (`src/api/rpc.ts`): `viewAccount`, `viewAccessKeys`, `viewPoolBalance`, generic `viewCall`.
- **api.fastnear.com** (`src/api/fastnearApi.ts`): an account's tokens, NFT collections and staking pools.
- Token metadata via RPC (`useTokenMetadata`, `useMultiTokenMetadata`), spot prices (`useTokenPrices`), spam lists (`useSpamTokens`, `useSpamNfts`).

There is no network-wide "latest transactions" endpoint; `useLatestActivity` assembles the home feed from the newest blocks, a few blocks behind the tip.

### Two-tier transaction model

- **`BlockTx` / `AccountTx`** — lightweight rows from the block/account endpoints. They carry no actions or transfers, so feeds use them only for placeholders. The API reports unfinished transactions as `is_success: false`; trust the status only when `is_completed` is set (`AccountTx` has no such field).
- **`TransactionDetail`** — full structure with receipts, outcomes and logs (from `getTransactions`).

`src/utils/parseTransaction.ts` normalizes `TransactionDetail` into `ParsedTx`: delegate/relayer unwrapping, overall status (following the `SuccessReceiptId` chain), `has_failed_receipts`, total `fee`, and token movements. Movements come only from receipts that succeeded: NEAR from receipt actions (not `system` refunds), NEP-141/245/171 events, plain-text logs of pre-event tokens such as `wrap.near`, and `ft_transfer` arguments as a last resort.

### Plain-language summaries

`src/utils/summarizeTx.ts` is the single source of the sentence shown in feed rows, the transaction headline and account pages: `summarizeTx(parsedTx, viewer?)` returns a kind, badge and typed sentence parts.

- Classification is based on **net balance changes per account**, not method-name lists. NEAR and wrapped NEAR cancel out within a transaction.
- Falls back to "called `method` on contract" when balances would mislead (a contract calling itself, or the signer receiving only a small share).
- Failed or pending transactions are worded as attempts and never claim a transfer.
- `viewer` (account pages) tells the story from that account's side.
- `src/data/methodLabels.ts` holds wording for well-known methods (staking, wrapping, account creation); `src/data/knownContracts.ts` is a hand-kept list of app names.
- Tests in `src/utils/__tests__/` run against real transactions in `res/fixtures/`. Add a fixture when adding a rule.

`src/utils/describeFailure.ts` turns a `Failure` status into a readable reason.

### Developer mode

`useDevMode` is one remembered flag (header "Dev" switch). It only changes defaults: `Collapsible` sections marked `dev` start open, and gas shows in rows. There is no separate developer layout.

### Custom hooks

- `useTxDetails` — batches hashes into `getTransactions` calls, returns `Map<hash, ParsedTx>`, and refetches transactions that are still pending.
- `useInfiniteScroll` — cursor pagination with one page prefetched ahead.
- `useAccountFilters` / `useBlockFilters` — filters stored in the URL query.
- `useAccountActivity`, `useStakingBalances`, `useAccountOverview`, `useAccountState`, `useAccessKeys` — account page data. `useAccessKeys` loads the key list once per account; the header badges (Locked, Quantum-safe) and the Details tab share it.

### Widget system (`src/widgets/`)

`registry.ts` lists widgets with a `match(tx, parsed)` function and a `type`: `explanation` widgets render under the transaction summary (for protocol-specific detail), `utility` widgets in the advanced area. Every match is rendered. The only widget today is the raw-JSON one; the general summary comes from `summarizeTx`.

### Components (`src/components/`)

- Feed: `TxFeed` (sentence rows with placeholders and expandable details), `TxSummary` (renders sentence parts), `KindBadge`, `StatusBadge`.
- Transaction: `BalanceChanges`, `Action` (`ActionLine` plain wording, `ActionExpanded` for receipts), `ReceiptCard`, `ReceiptPopup`, `Base64Data`.
- Account: `account/AccountHeader`, `TokensTab`, `NftsTab`, `StakingTab`, `DetailsTab`, `AccountFilterBar`.
- Entities: `AccountId`, `TransactionHash`, `PublicKey`, `BlockHeight`, `BlockHash`, `NearAmount`, `GasAmount`, `TimeAgo`, `TransferSummary` (`TransferAmount`, `TokenAmount`).
- Primitives: `Collapsible`, `Tabs`, `StatTile`, `Skeleton`, `CopyButton`, `SearchBar`, `InfiniteScrollSentinel`, `Layout`.

### Utilities (`src/utils/`)

- `format.ts` — `formatUnits`, ID shortening, base58
- `time.ts` — date formatting

## Conventions

- Use shared display components in `src/components/` for blockchain entities instead of inline JSX
- Tailwind utility classes directly in JSX; no CSS modules. Theme tokens (including the `accent` gold) and dark-mode overrides live in `src/index.css`; `dark:` follows the `.dark` class
- Monospace only for hashes, keys and code; account IDs and amounts use the normal font
- Default exports for pages and components
- Icons from `lucide-react`
- JSON display via `@uiw/react-json-view`
