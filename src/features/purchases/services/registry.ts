import { aptos, normalizeAddress } from '@/lib/aptos/client'

const ADDRESS = process.env.NEXT_PUBLIC_REGISTRY_V2_ADDRESS ?? ''

export function purchaseReportPayload(reportId: string) {
  if (!ADDRESS) throw new Error('Registry V2 is not configured')
  return {
    function: `${ADDRESS}::registry_v2::purchase_report` as `${string}::${string}::${string}`,
    typeArguments: [], functionArguments: [ADDRESS, reportId],
  }
}

export async function verifyPurchaseTransaction(input: {
  transactionHash: string
  reportId: string
  buyerAddress: string
  sellerAddress: string
  amountOctas: number
}) {
  if (!ADDRESS) throw new Error('Registry V2 is not configured')
  const transaction = await aptos.waitForTransaction({ transactionHash: input.transactionHash })
  if (!('success' in transaction) || !transaction.success || !('events' in transaction)) {
    throw new Error('Purchase transaction failed')
  }
  const eventType = `${normalizeAddress(ADDRESS)}::registry_v2::ReportPurchased`
  const event = transaction.events.find((item) => item.type === eventType)
  if (!event) throw new Error('Purchase event was not emitted')
  const data = event.data as {
    report_id?: string
    buyer?: string
    seller?: string
    amount?: string | number
  }
  const matches =
    data.report_id === input.reportId
    && normalizeAddress(data.buyer ?? '0x0') === normalizeAddress(input.buyerAddress)
    && normalizeAddress(data.seller ?? '0x0') === normalizeAddress(input.sellerAddress)
    && Number(data.amount ?? 0) === input.amountOctas

  if (!matches) throw new Error('Purchase event does not match this report')
}
