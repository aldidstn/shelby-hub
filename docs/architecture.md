# Architecture

The browser signs Aptos transactions, encrypts premium files, and uploads blobs directly to Shelby. Registry V2 stores canonical report and purchase state in Aptos tables and emits indexable events. PostgreSQL provides searchable projections, wallet libraries, sessions, and wrapped data keys. Next.js route handlers authenticate wallets, release authorized keys, verify receipts, and run idempotent indexing.

New paid uploads use envelope encryption. After wallet authentication, the server creates a canonical report ID and generates a unique AES-256 data key. It wraps that data key with AES-256-GCM using the active versioned master key held only in Vercel, binding the envelope to the canonical report ID. Only the wrapped key is persisted. The browser encrypts the file with AES-256-GCM, uploads ciphertext to Shelby, and registers the ciphertext hash as encryption version 1 in Registry V2. The report becomes active only after the registration event is verified.

For reading, the browser fetches the canonical report, verifies the Shelby ciphertext hash, and requests the data key through an authenticated route. The server releases the unwrapped key only to the report owner or a purchaser proven by an indexed receipt or the Registry V2 `has_purchased` view. Existing encryption-version-2 ACE reports and any AWS-wrapped encryption-version-1 records retain legacy read paths, but new uploads use the Vercel-held wrapping key.

The client keeps a small local metadata cache only as a catalog convenience. It is never an access-control source.

The database is a projection, not the payment authority. Any access decision involving a purchase must originate from a verified Registry V2 purchase event or `has_purchased` view result.

## Network selection

The workspace network dropdown selects the Shelby storage catalog. Reports are filtered by their immutable `network` metadata, and downloads always use the network recorded on the report rather than trusting the current dropdown value. The selection is a local browsing preference and is never used for premium authorization.

Registry V2, wallet authentication, and purchase settlement currently remain on Aptos Testnet. Shelby Testnet supports uploads and downloads. ShelbyNet is available for browsing and downloading existing records, but new uploads remain disabled there until Registry V2 is separately deployed and indexed on ShelbyNet. This distinction prevents a storage-network choice from being mistaken for an Aptos settlement-chain switch.
