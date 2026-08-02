# Security model

- New premium files are encrypted in the browser with a unique AES-256-GCM data key before ciphertext is sent to Shelby.
- The server generates a unique random data key for each report and wraps it with AES-256-GCM using a versioned master key stored only as a Vercel sensitive environment variable. PostgreSQL stores only the authenticated wrapped-key envelope; the plaintext key is returned once to the authenticated uploader and is never persisted.
- Wallet sessions use Sign in with Aptos, single-use nonces, secure HttpOnly cookies, and server-side expiry.
- Data-key delivery requires an active Registry V2 report and an authenticated author or verified purchaser. A missing indexed receipt is checked against `has_purchased` on-chain.
- Wrapped keys are bound to the canonical report ID as AES-GCM additional authenticated data, so a database row cannot be substituted between reports.
- Master-key rotation is versioned. Old `PREMIUM_MASTER_KEY_V*` secrets remain configured while any report references them.
- Existing ACE-encrypted reports remain on a legacy read-only path. New uploads do not depend on the ACE preview workers.
- Blob coordinates from client query parameters are never trusted.
- Transaction confirmation verifies success, sender, report, amount, module, and event type.
- A purchaser can copy plaintext after authorized decryption; DRM is explicitly out of scope.
