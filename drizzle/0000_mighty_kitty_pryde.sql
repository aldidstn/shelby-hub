CREATE TABLE "auth_nonces" (
	"nonce" text PRIMARY KEY NOT NULL,
	"domain" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "encryption_keys" (
	"report_id" text PRIMARY KEY NOT NULL,
	"wrapped_key" text NOT NULL,
	"kms_key_id" text NOT NULL,
	"key_version" text DEFAULT '1' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "indexer_state" (
	"key" text PRIMARY KEY NOT NULL,
	"cursor" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" text NOT NULL,
	"buyer_address" text NOT NULL,
	"seller_address" text NOT NULL,
	"amount_octas" bigint NOT NULL,
	"transaction_hash" text NOT NULL,
	"transaction_version" bigint NOT NULL,
	"event_index" bigint NOT NULL,
	"purchased_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_address" text NOT NULL,
	"blob_name" text,
	"network" text DEFAULT 'testnet' NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"report_type" text NOT NULL,
	"access" text NOT NULL,
	"price_octas" bigint DEFAULT 0 NOT NULL,
	"file_type" text NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"cipher_hash" text,
	"encryption_version" text,
	"encryption_iv" text,
	"source" text DEFAULT 'v2' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"chain_version" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"wallet_address" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "encryption_keys" ADD CONSTRAINT "encryption_keys_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "purchases_buyer_report_idx" ON "purchases" USING btree ("buyer_address","report_id");--> statement-breakpoint
CREATE UNIQUE INDEX "purchases_chain_event_idx" ON "purchases" USING btree ("transaction_version","event_index");--> statement-breakpoint
CREATE INDEX "reports_owner_idx" ON "reports" USING btree ("owner_address");--> statement-breakpoint
CREATE INDEX "reports_status_created_idx" ON "reports" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "sessions_wallet_idx" ON "sessions" USING btree ("wallet_address");