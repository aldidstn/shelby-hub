# ADR 0002: KMS envelope encryption

Premium blobs are encrypted in the browser with AES-256-GCM. AWS KMS generates a unique data key per report. PostgreSQL stores only the encrypted data-key blob and public encryption metadata.
