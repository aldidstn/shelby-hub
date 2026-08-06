import { bigint, boolean, index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'

export const reports = pgTable('reports', {
  id: text('id').primaryKey(),
  ownerAddress: text('owner_address').notNull(),
  blobAccount: text('blob_account').notNull(),
  blobName: text('blob_name'),
  network: text('network').notNull().default('testnet'),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  reportType: text('report_type').notNull(),
  access: text('access').notNull(),
  priceOctas: bigint('price_octas', { mode: 'number' }).notNull().default(0),
  fileType: text('file_type').notNull(),
  tags: jsonb('tags').$type<string[]>().notNull().default([]),
  cipherHash: text('cipher_hash'),
  encryptionVersion: text('encryption_version'),
  encryptionIv: text('encryption_iv'),
  source: text('source').notNull().default('v2'),
  status: text('status').notNull().default('pending'),
  active: boolean('active').notNull().default(true),
  chainVersion: bigint('chain_version', { mode: 'number' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('reports_owner_idx').on(table.ownerAddress),
  index('reports_status_created_idx').on(table.status, table.createdAt),
])

export const purchases = pgTable('purchases', {
  id: uuid('id').primaryKey().defaultRandom(),
  reportId: text('report_id').notNull().references(() => reports.id),
  buyerAddress: text('buyer_address').notNull(),
  sellerAddress: text('seller_address').notNull(),
  network: text('network').notNull().default('testnet'),
  amountOctas: bigint('amount_octas', { mode: 'number' }).notNull(),
  transactionHash: text('transaction_hash').notNull(),
  transactionVersion: bigint('transaction_version', { mode: 'number' }).notNull(),
  eventIndex: bigint('event_index', { mode: 'number' }).notNull(),
  purchasedAt: timestamp('purchased_at', { withTimezone: true }).notNull(),
}, (table) => [
  uniqueIndex('purchases_buyer_report_idx').on(table.buyerAddress, table.reportId),
  uniqueIndex('purchases_chain_event_idx').on(table.network, table.transactionVersion, table.eventIndex),
])

export const encryptionKeys = pgTable('encryption_keys', {
  reportId: text('report_id').primaryKey().references(() => reports.id, { onDelete: 'cascade' }),
  wrappedKey: text('wrapped_key').notNull(),
  wrappingKeyId: text('kms_key_id').notNull(),
  keyVersion: text('key_version').notNull().default('1'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const authNonces = pgTable('auth_nonces', {
  nonce: text('nonce').primaryKey(),
  domain: text('domain').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const sessions = pgTable('sessions', {
  tokenHash: text('token_hash').primaryKey(),
  walletAddress: text('wallet_address').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index('sessions_wallet_idx').on(table.walletAddress)])

export const indexerState = pgTable('indexer_state', {
  key: text('key').primaryKey(),
  cursor: text('cursor').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
