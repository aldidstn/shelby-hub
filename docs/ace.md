# ACE premium access setup

ACE is the active paid-upload encryption path. It lets the browser encrypt content so ACE workers release decryption shares only after `registry_v2::on_ace_decryption_request` returns `true` on-chain.

ACE is currently marked by Aptos Labs as a prototype, so keep the flow closely monitored and avoid removing the legacy KMS reader until older encrypted reports are migrated.

## Current repo setup

- `@aptos-labs/ace-sdk` is installed.
- `registry_v2` exposes `on_ace_decryption_request(label, account, origin)`.
- The ACE label is the canonical report ID.
- The hook allows:
  - the report owner,
  - free active reports,
  - buyers with a Registry V2 purchase receipt.
- The hook denies inactive reports, unknown reports, unpaid premium reports, and wrong app origins.
- `src/lib/ace/config.ts` resolves ACE deployment settings.
- `src/lib/ace/reports.ts` encrypts paid report files and creates wallet-signed decryption sessions.
- Paid uploads generate a report ID in the browser, ACE-encrypt the file, upload ciphertext to Shelby, register Registry V2 metadata, and verify the `ReportRegistered` event.
- Paid reads and downloads fetch ciphertext from Shelby, verify the stored hash, ask the wallet to sign the ACE decrypt request, and decrypt in the browser.
- Purchases verify the Registry V2 `ReportPurchased` event before the UI marks the report purchased. Database confirmation is best-effort when PostgreSQL is available.

## Values required from the project owner

For testing with Aptos Labs' public ACE preview:

```txt
NEXT_PUBLIC_REGISTRY_V2_ADDRESS=0x...
NEXT_PUBLIC_ACE_APP_ORIGIN=https://shelbyscribe.vercel.app
NEXT_PUBLIC_ACE_DEPLOYMENT_NAME=preview20260610
```

For a self-managed ACE deployment:

```txt
NEXT_PUBLIC_REGISTRY_V2_ADDRESS=0x...
NEXT_PUBLIC_ACE_APP_ORIGIN=https://shelbyscribe.vercel.app
NEXT_PUBLIC_ACE_API_ENDPOINT=https://...
NEXT_PUBLIC_ACE_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_ACE_KEYPAIR_ID=0x...
NEXT_PUBLIC_ACE_CHAIN_ID=2
NEXT_PUBLIC_ACE_API_KEY=...
```

The Registry V2 contract must also be published and initialized, then its ACE origin must match `NEXT_PUBLIC_ACE_APP_ORIGIN`.

```bash
aptos move publish --package-dir contract --named-addresses shelby_registry=YOUR_REGISTRY_ADDRESS
aptos move run --function-id YOUR_REGISTRY_ADDRESS::registry_v2::initialize
aptos move run --function-id YOUR_REGISTRY_ADDRESS::registry_v2::update_ace_origin --args string:https://shelbyscribe.vercel.app
```

## Remaining work

1. Add the PostgreSQL/indexer projection so Registry V2 paid reports remain searchable across sessions without relying on local optimistic state.
2. Run browser E2E tests for owner decrypt, unpaid denial, purchase decrypt, wrong-origin denial, and second-session decrypt.
3. Migrate or sunset older KMS-encrypted premium records after verifying there are no active users depending on that path.
