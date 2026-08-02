# ADR 0002: Versioned envelope encryption

Premium blobs are encrypted in the browser with AES-256-GCM. The server generates a unique data key per report and wraps it with AES-256-GCM using a versioned master key held as a Vercel sensitive environment variable. PostgreSQL stores only the authenticated wrapped-key envelope and public encryption metadata. Registry V2 remains the authorization authority; the database is not sufficient to unlock a report.
