# Sigil — Post-Hackathon Roadmap

Source: `Sigil_Instruction.md`, Section 18 ("Roadmap"). Kept separate from `PLAN.md` (which
tracks the hackathon build) so post-hackathon ambitions don't get mixed into active task
tracking.

1. **ERC-721 / ERC-1155 transfer detection** — extend `src/core/effects.ts` beyond ERC-20
   `Transfer` to NFT standards (`TransferSingle`, `TransferBatch`, ERC-721 `Transfer`).
2. **Solana transaction support** — a parallel non-EVM lookup path; would require a second
   provider abstraction alongside `rpc-client.ts` since Solana RPC shape differs entirely from
   `eth_getTransactionReceipt`.
3. **Internal transaction (trace) decoding** — surface internal calls via `debug_traceTransaction`
   or `trace_transaction` where the RPC provider supports it, to catch value moved through
   contract-internal calls that never appear as top-level logs.
4. **Mainnet deployment** — move from Base Sepolia testnet registration to mainnet once
   Telegraph Protocol itself moves to production.
5. **Track 3 consumer SDK** — a small TypeScript client package wrapping `/lookup` calls for
   other agents to integrate without hand-rolling HTTP requests.
