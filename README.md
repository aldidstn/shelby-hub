# Shelby Research

Wallet-native research publishing and purchasing on Aptos, with report blobs stored on Shelby. Premium files are encrypted in the browser and their unique data keys are wrapped by a versioned server-only key held in Vercel.

## Local development

1. Copy `.env.example` to `.env.local`, configure PostgreSQL and Aptos, then generate `PREMIUM_MASTER_KEY_V1` with `openssl rand -base64 32`.
2. Run `npm ci`.
3. Run `npm run db:migrate`.
4. Run `npm run dev`.

Quality gates:

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
aptos move test --package-dir contract
```

## Architecture

- `src/app`: thin Next.js routes and route handlers.
- `src/features`: report, purchase, profile, and authentication behavior.
- `src/server`: PostgreSQL, sessions, key wrapping, indexing, and authorization.
- `src/styles`: design tokens, shared layout modules, and a frozen legacy compatibility sheet; Tailwind is not used.
- `contract`: the legacy registry and table-backed Registry V2.
- `docs`: product, architecture, security, and deployment decisions.

Registry V1 remains read-only for migration. New reports and purchases use Registry V2. See `docs/architecture.md` and `docs/security.md` before changing access-control behavior.
