# Sigil — Instructions For Any AI Agent Joining This Build

1. **Read `Sigil_Instruction.md` at the repo root first, in full.** It is the single source of
   truth for scope, format, and rules. This `docs/` directory tracks state; it does not
   override the instruction file.
2. **Read [PROGRESS.md](./PROGRESS.md) and [TASKS.md](./TASKS.md) next** to see what phase the
   build is in and what remains.
3. **Do not simplify, stub, or mock.** Section 23 of the instruction file ("Critical Rules")
   applies to every session, not just the first one.
4. **Never generate or guess secrets.** RPC API keys, the miner private key, and any other
   credential are supplied by the human builder into `.env` (gitignored) or directly into the
   Render dashboard. Never invent placeholder-looking real values; use `.env.example`'s
   explicit placeholder style.
5. **All work stays inside this folder** (`Sigil_Telegraph/`). Do not create files outside it.
6. **TypeScript strict mode, zero `any`, everywhere.** `npm run typecheck` and `npm run lint`
   must both be clean before considering any unit of work done.
7. **Canonical format is the #1 priority.** `chain|tx_hash|status|block_number|from|to|value_wei`,
   all lowercase hex/addresses. Any change to `src/core/canonical.ts` must be re-verified
   against the Veyctum/Verity shared fixture in Section 9 of the instruction file.
8. **Hosting is Render, not Railway**, per the builder's explicit choice. Deployment login and
   env var entry into the Render dashboard are done by the human builder — an AI agent should
   never attempt to create hosting accounts or handle credentials on the builder's behalf. See
   [HANDOFF.md](./HANDOFF.md) for the exact steps to hand the builder.
9. **Update the relevant `docs/` file(s) after every meaningful change** — at minimum
   `PROGRESS.md`, and `TASKS.md`/`PLAN.md` when a phase task completes.
10. **Before ending a session, leave `HANDOFF.md` accurate** so the next agent (or the builder)
    knows exactly what to run and what is still blocked.
