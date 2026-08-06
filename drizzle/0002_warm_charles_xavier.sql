DROP INDEX "purchases_chain_event_idx";--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "network" text DEFAULT 'testnet' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "purchases_chain_event_idx" ON "purchases" USING btree ("network","transaction_version","event_index");