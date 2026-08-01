import { z } from 'zod'
import { REPORT_ACCESS, REPORT_TYPES, SHELBY_NETWORKS } from '../types/report'

export const prepareReportSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).default(''),
  reportType: z.enum(REPORT_TYPES),
  access: z.enum(REPORT_ACCESS),
  priceOctas: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  fileType: z.string().trim().min(1).max(32),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  network: z.enum(SHELBY_NETWORKS).default('testnet'),
}).superRefine((value, context) => {
  if (value.access === 'free' && value.priceOctas !== 0) context.addIssue({ code: 'custom', path: ['priceOctas'], message: 'Free reports must have zero price' })
  if (value.access === 'premium' && value.priceOctas <= 0) context.addIssue({ code: 'custom', path: ['priceOctas'], message: 'Premium reports require a positive price' })
})

export const finalizeReportSchema = z.object({
  blobName: z.string().trim().min(1).max(512),
  transactionHash: z.string().regex(/^0x[0-9a-fA-F]+$/),
  cipherHash: z.string().regex(/^[A-Za-z0-9+/]{43}=$/).optional(),
  encryptionIv: z.string().regex(/^[A-Za-z0-9+/]{16}$/).optional(),
})
