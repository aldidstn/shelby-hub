# Architecture

The browser signs Aptos transactions, encrypts premium files, and uploads blobs directly to Shelby. Registry V2 stores canonical report and purchase state in Aptos tables and emits indexable events. PostgreSQL provides searchable projections, wallet libraries, sessions, and wrapped data keys. Next.js route handlers authenticate wallets, release authorized keys, verify receipts, and run idempotent indexing.

New paid uploads use envelope encryption. After wallet authentication, the server creates a canonical report ID and generates a unique AES-256 data key. It wraps that data key with AES-256-GCM using the active versioned master key held only in Vercel, binding the envelope to the canonical report ID. Only the wrapped key is persisted. The browser encrypts the file with AES-256-GCM, uploads ciphertext to Shelby, and registers the ciphertext hash as encryption version 1 in Registry V2. The report becomes active only after the registration event is verified.

For reading, the browser fetches the canonical report, verifies the Shelby ciphertext hash, and requests the data key through an authenticated route. The server releases the unwrapped key only to the report owner or a purchaser proven by an indexed receipt or the Registry V2 `has_purchased` view. Existing encryption-version-2 ACE reports and any AWS-wrapped encryption-version-1 records retain legacy read paths, but new uploads use the Vercel-held wrapping key.

The client keeps a small local metadata cache only as a catalog convenience. It is never an access-control source.

The database is a projection, not the payment authority. Any access decision involving a purchase must originate from a verified Registry V2 purchase event or `has_purchased` view result.

## Network selection

The workspace network dropdown selects a complete storage and settlement environment. Reports are filtered by their immutable `network` metadata, and uploads, purchases, downloads, Registry V2 verification, and purchase authorization all use the network recorded on the report or selected during upload. Premium authorization never trusts a query parameter or a mutable browsing preference.

Registry V2 is deployed independently on Aptos Testnet and ShelbyNet. Before a report transaction, the client asks the wallet to switch to the report's paired Aptos network. The backend verifies the resulting transaction against that network's Registry V2 module, and the indexer stores independent cursors for both chains. Downloads always use the report's canonical Shelby network. Wallet authentication remains a network-independent proof of wallet control; it does not grant report access by itself.

ShelbyNet uploads use the current Shelby chunkset protocol: resolve an active write location, register the encrypted blob, upload chunksets, and commit the object with storage-provider acknowledgements. The retired Shelby Testnet write protocol remains isolated behind the legacy SDK for compatibility with the existing Testnet catalog. Before either path starts database preparation, the browser verifies that the selected-network wallet has APT for gas and ShelbyUSD for storage.
