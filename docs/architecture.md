# Architecture

The browser signs Aptos transactions, encrypts premium files, and uploads blobs directly to Shelby. Registry V2 stores canonical report and purchase state in Aptos tables and emits indexable events. PostgreSQL provides searchable projections, wallet libraries, sessions, and KMS-wrapped data keys. Next.js route handlers authenticate wallets, release authorized keys, verify receipts, and run idempotent indexing.

New paid uploads use KMS envelope encryption. After wallet authentication, the server creates a canonical report ID and asks AWS KMS for a unique AES-256 data key. Only the wrapped key is persisted. The browser encrypts the file with AES-256-GCM, uploads ciphertext to Shelby, and registers the ciphertext hash as encryption version 1 in Registry V2. The report becomes active only after the registration event is verified.

For reading, the browser fetches the canonical report, verifies the Shelby ciphertext hash, and requests the data key through an authenticated route. The server releases the unwrapped key only to the report owner or a purchaser proven by an indexed receipt or the Registry V2 `has_purchased` view. Existing encryption-version-2 ACE reports retain a legacy read path, but new uploads do not use ACE.

The client keeps a small local metadata cache only as a catalog convenience. It is never an access-control source.

The database is a projection, not the payment authority. Any access decision involving a purchase must originate from a verified Registry V2 purchase event or `has_purchased` view result.
