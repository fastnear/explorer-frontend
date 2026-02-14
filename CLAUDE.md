# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

NEAR blockchain explorer frontend. React 18 + TypeScript + Tailwind CSS v4 + Vite. Uses react-router-dom for routing.

## Build & Development

- `yarn install` — install dependencies
- `yarn dev` — start dev server
- `yarn build` — typecheck and build (`tsc -b && vite build`)
- `yarn preview` — preview production build

## Testing

No test framework configured yet.

## Linting & Formatting

No linter configured yet. Use `npx tsc -b` to typecheck.

## Architecture

- `src/api/` — API client (`endpoints.ts`) and TypeScript types (`types.ts`)
- `src/components/` — reusable display components (`TransactionHash`, `AccountId`, `BlockHeight`, `BlockHash`, `SearchBar`, `Layout`)
- `src/pages/` — route pages (`Home`, `BlockDetail`, `TxDetail`, `AccountDetail`)
- `src/widgets/` — pluggable transaction detail widgets (`registry.ts`)

## Conventions

- Use the shared display components in `src/components/` for blockchain entities (tx hashes, account IDs, block heights, block hashes) instead of inline JSX
- Tailwind utility classes directly in JSX; no CSS modules or separate stylesheets
- Default exports for pages and components
