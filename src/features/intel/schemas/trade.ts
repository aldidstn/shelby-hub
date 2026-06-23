import { z } from 'zod'

export const tradeSchema = z.object({
  id: z.string(),
  type: z.literal('trade'),
  attributes: z.object({
    block_number: z.number(), tx_hash: z.string(), tx_from_address: z.string(),
    from_token_amount: z.string(), to_token_amount: z.string(), price_from_in_usd: z.string(),
    price_to_in_usd: z.string(), block_timestamp: z.string(), kind: z.enum(['buy', 'sell']),
    volume_in_usd: z.string(), from_token_address: z.string(), to_token_address: z.string(),
  }),
})

export const tradeResponseSchema = z.object({ data: z.array(tradeSchema) })
