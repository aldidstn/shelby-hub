export interface TradeAttributes {
  block_number: number
  tx_hash: string
  tx_from_address: string
  from_token_amount: string
  to_token_amount: string
  price_from_in_usd: string
  price_to_in_usd: string
  block_timestamp: string
  kind: 'buy' | 'sell'
  volume_in_usd: string
  from_token_address: string
  to_token_address: string
}

export interface Trade { id: string; type: 'trade'; attributes: TradeAttributes }
export type FilterKind = 'all' | 'buy' | 'sell'
