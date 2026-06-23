# Shelby Research

Wallet-native research publishing and purchasing on Aptos, with report blobs stored on Shelby. Premium files are encrypted in the browser and their data keys are protected by AWS KMS.

## Local development

1. Copy `.env.example` to `.env.local` and configure PostgreSQL, Aptos, and AWS KMS.
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
- `src/server`: PostgreSQL, sessions, KMS, indexing, and authorization.
- `src/styles`: design tokens, shared layout modules, and a frozen legacy compatibility sheet; Tailwind is not used.
- `contract`: the legacy registry and table-backed Registry V2.
- `docs`: product, architecture, security, and deployment decisions.

Registry V1 remains read-only for migration. New reports and purchases use Registry V2. See `docs/architecture.md` and `docs/security.md` before changing access-control behavior.
