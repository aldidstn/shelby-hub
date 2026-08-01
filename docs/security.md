# Security model

- New premium files are encrypted in the browser with a unique AES-256-GCM data key before ciphertext is sent to Shelby.
- AWS KMS generates each data key. PostgreSQL stores only the KMS-wrapped key; the plaintext key is returned once to the authenticated uploader and is never persisted.
- Wallet sessions use Sign in with Aptos, single-use nonces, secure HttpOnly cookies, and server-side expiry.
- KMS key delivery requires an active Registry V2 report and an authenticated author or verified purchaser. A missing indexed receipt is checked against `has_purchased` on-chain.
- Existing ACE-encrypted reports remain on a legacy read-only path. New uploads do not depend on the ACE preview workers.
- Blob coordinates from client query parameters are never trusted.
- Transaction confirmation verifies success, sender, report, amount, module, and event type.
- A purchaser can copy plaintext after authorized decryption; DRM is explicitly out of scope.
