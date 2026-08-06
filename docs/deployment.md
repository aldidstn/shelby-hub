# Deployment and rollout

## Order

1. Provision PostgreSQL and run `npm run db:migrate`.
2. Generate a 32-byte wrapping key with `openssl rand -base64 32` and add it to Vercel as the sensitive production variable `PREMIUM_MASTER_KEY_V1`. Do not save it in Git, chat, logs, or the database.
3. Publish and initialize `registry_v2` separately on Aptos Testnet and ShelbyNet. Set `NEXT_PUBLIC_REGISTRY_V2_ADDRESS` and `NEXT_PUBLIC_REGISTRY_V2_SHELBYNET_ADDRESS` to their respective account addresses.
4. Configure all variables from `.env.example` in Vercel.
5. Deploy the application and invoke `/api/internal/indexer` with `Authorization: Bearer $CRON_SECRET`.
6. Confirm that nine V1 entries were imported as `source=v1`, `access=free`.
7. Enable new uploads and purchases.

## Required premium-upload variables

- `DATABASE_URL`: TLS PostgreSQL connection string.
- `PREMIUM_MASTER_KEY_VERSION`: active wrapping-key version, initially `1`.
- `PREMIUM_MASTER_KEY_V1`: base64-encoded 32-byte wrapping key, added as a Vercel sensitive variable.
- `NEXT_PUBLIC_REGISTRY_V2_ADDRESS`: Registry V2 account address on Aptos Testnet.
- `NEXT_PUBLIC_REGISTRY_V2_SHELBYNET_ADDRESS`: Registry V2 account address on ShelbyNet.

Paid uploads stay disabled unless PostgreSQL, Registry V2, and a valid active wrapping key are configured. After configuring a fresh database, run `npm run db:migrate` before enabling traffic. Environment-variable changes require a new deployment.

Keep the production master key out of Preview deployments. Preview paid uploads should remain disabled unless Preview has both an isolated database and its own wrapping key, so unreviewed preview code cannot access production premium keys.

## Rollback

Disable new uploads and purchases at the deployment layer, retain the database and every referenced `PREMIUM_MASTER_KEY_V*` secret, and deploy the prior application version. Do not delete V2 records or wrapped-key ciphertext. Registry events are replayable per network by resetting the applicable `registry_v2_testnet_event_version` or `registry_v2_shelbynet_event_version` row in `indexer_state`.

## Key rotation

Generate a new 32-byte key, add it as `PREMIUM_MASTER_KEY_V2`, then set `PREMIUM_MASTER_KEY_VERSION=2` and redeploy. New reports use V2 automatically. Keep `PREMIUM_MASTER_KEY_V1` configured while any database row references `vercel-env:v1`; deleting it makes those reports permanently unreadable unless they are re-wrapped first.

## Legacy AWS-wrapped reports

The key route retains a read-only AWS KMS compatibility path for records whose wrapping-key ID is an AWS key ARN. Keep the matching AWS region and credentials only while those records exist. New reports never use AWS KMS.
