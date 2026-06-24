# Security model

- Premium files uploaded through the current paid flow use ACE IBE encryption in the browser before the ciphertext is sent to Shelby.
- Legacy AES-256-GCM/KMS reports remain readable through the authenticated key route, but new paid uploads use ACE when Registry V2 and ACE are configured.
- Wallet sessions use Sign in with Aptos, single-use nonces, secure HttpOnly cookies, and server-side expiry.
- ACE decryption requires an active Registry V2 report and an on-chain owner, free-report, or purchaser authorization from `on_ace_decryption_request`.
- Legacy KMS key delivery requires an active report and an authenticated author or verified purchaser.
- Blob coordinates from client query parameters are never trusted.
- Transaction confirmation verifies success, sender, report, amount, module, and event type.
- A purchaser can copy plaintext after authorized decryption; DRM is explicitly out of scope.
