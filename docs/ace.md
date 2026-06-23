# ACE premium access setup

ACE is the planned replacement for AWS KMS in premium report encryption. It lets the browser encrypt content so ACE workers release decryption shares only after `registry_v2::on_ace_decryption_request` returns `true` on-chain.

ACE is currently marked by Aptos Labs as a prototype, so keep this behind the paid-upload feature gate until the full upload, purchase, and reader flow is tested.

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
- `src/lib/ace/reports.ts` contains the initial report encryption/decryption helpers.

## Values required from the project owner

For testing with Aptos Labs' public ACE preview:

```txt
NEXT_PUBLIC_REGISTRY_V2_ADDRESS=0x...
NEXT_PUBLIC_ACE_APP_ORIGIN=https://shelby-hub-iota.vercel.app
NEXT_PUBLIC_ACE_DEPLOYMENT_NAME=preview20260610
```

For a self-managed ACE deployment:

```txt
NEXT_PUBLIC_REGISTRY_V2_ADDRESS=0x...
NEXT_PUBLIC_ACE_APP_ORIGIN=https://shelby-hub-iota.vercel.app
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
aptos move run --function-id YOUR_REGISTRY_ADDRESS::registry_v2::update_ace_origin --args string:https://shelby-hub-iota.vercel.app
```

## Remaining implementation before enabling paid uploads

1. Replace premium KMS encryption in `UploadModal` with `encryptReportWithAce`.
2. Store ACE ciphertext metadata instead of KMS-wrapped keys.
3. Replace `/api/reports/:id/key` with an ACE browser decryption session.
4. Update the reader to ask the wallet to sign the ACE decryption request.
5. Keep Registry V2 purchase confirmation and indexing; ACE uses that on-chain state as the permission source.
6. Run end-to-end tests for owner decrypt, unpaid denial, purchase decrypt, wrong-origin denial, and second-session decrypt.
