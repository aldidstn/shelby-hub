# Architecture

The browser signs Aptos transactions, encrypts premium files, and uploads blobs directly to Shelby. Registry V2 stores canonical report and purchase state in Aptos tables and emits indexable events. PostgreSQL provides searchable projections, wallet libraries, sessions, and legacy KMS-wrapped data keys. Next.js route handlers authenticate wallets, verify legacy receipts, and run idempotent indexing.

New paid uploads use ACE IBE encryption. The browser encrypts the file with the Registry V2 report ID as the ACE label, uploads the ciphertext to Shelby, and registers the ciphertext hash in Registry V2. Reading an ACE report asks the connected wallet to sign an ACE decrypt request; ACE calls Registry V2’s `on_ace_decryption_request` view, so access follows on-chain ownership and purchases across browsers and devices.

The database is a projection, not the payment authority. Any access decision involving a purchase must originate from a verified Registry V2 purchase event or `has_purchased` view result.
