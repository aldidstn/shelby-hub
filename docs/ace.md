# ACE legacy read support

ACE is retained only for reports previously registered with encryption version 2. New paid uploads use AWS KMS envelope encryption because the public ACE preview workers did not provide a production reliability guarantee.

ACE is currently marked by Aptos Labs as a prototype, so keep this compatibility path closely monitored until older ACE-encrypted reports are migrated or retired.

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
- Legacy paid reads and downloads fetch ciphertext from Shelby, verify the stored hash, ask the wallet to sign the ACE decrypt request, and decrypt in the browser.
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

## Retirement checklist

1. Identify every active encryption-version-2 report.
2. Keep owner decrypt, purchaser decrypt, and wrong-origin denial covered while those reports remain active.
3. Remove the ACE SDK and environment variables only after no active report depends on them.
