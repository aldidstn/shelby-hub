const ADDRESS = process.env.NEXT_PUBLIC_REGISTRY_V2_ADDRESS ?? ''

export function purchaseReportPayload(reportId: string) {
  if (!ADDRESS) throw new Error('Registry V2 is not configured')
  return {
    function: `${ADDRESS}::registry_v2::purchase_report` as `${string}::${string}::${string}`,
    typeArguments: [], functionArguments: [ADDRESS, reportId],
  }
}
