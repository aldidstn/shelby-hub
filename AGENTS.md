<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project rules

- Read `DESIGN.md`, `docs/architecture.md`, and `docs/security.md` before changing UI or access-control behavior.
- Keep App Router pages thin; product behavior belongs under `src/features` and trusted infrastructure under `src/server`.
- Never persist plaintext premium data keys or the Vercel master key. Only authenticated wrapped data-key ciphertext may be stored.
- Never authorize premium access from client state, query parameters, or an unverified transaction hash.
- Preserve Registry V1 as a read-only legacy source. New writes target Registry V2.
- Run `npm run check` and `aptos move test --package-dir contract` before handoff.
