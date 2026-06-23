# Deployment and rollout

## Order

1. Provision PostgreSQL and run `npm run db:migrate`.
2. Create an AWS KMS symmetric key and grant the Vercel runtime only `kms:GenerateDataKey` and `kms:Decrypt` for that key.
3. Publish `registry_v2` from `contract/`, initialize it once, and set `NEXT_PUBLIC_REGISTRY_V2_ADDRESS`.
4. Configure all variables from `.env.example` in Vercel.
5. Deploy the application and invoke `/api/internal/indexer` with `Authorization: Bearer $CRON_SECRET`.
6. Confirm that nine V1 entries were imported as `source=v1`, `access=free`.
7. Enable new uploads and purchases.

## Rollback

Disable new uploads and purchases at the deployment layer, retain the database and KMS key, and deploy the prior application version. Do not delete V2 records or KMS ciphertext. Registry events are replayable by resetting only the `registry_v2_event_version` row in `indexer_state`.

## Key rotation

Create a new KMS key, update `AWS_KMS_KEY_ID`, and re-wrap existing data keys in a controlled migration. Keep the prior KMS key enabled until every `encryption_keys.kms_key_id` row references the replacement.
