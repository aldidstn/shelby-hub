# Security model

- Premium files use AES-256-GCM with a fresh 96-bit IV.
- AWS KMS is the current production-ready key protection path. ACE is being prepared as the Web3-native replacement; until the ACE end-to-end flow is verified, paid uploads must stay feature-gated when the secure backend is unavailable.
- Wallet sessions use Sign in with Aptos, single-use nonces, secure HttpOnly cookies, and server-side expiry.
- Key delivery requires an active report and an authenticated author or verified purchaser.
- Blob coordinates from client query parameters are never trusted.
- Transaction confirmation verifies success, sender, report, amount, module, and event type.
- A purchaser can copy plaintext after authorized decryption; DRM is explicitly out of scope.
