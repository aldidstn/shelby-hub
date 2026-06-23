export async function confirmPurchase(reportId: string, transactionHash: string) {
  let error: unknown
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      const response = await fetch('/api/purchases/confirm', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, transactionHash }),
      })
      const result = await response.json() as { data?: { purchased: boolean }; error?: string }
      if (!response.ok || !result.data?.purchased) throw new Error(result.error ?? `HTTP ${response.status}`)
      return result.data
    } catch (caught) {
      error = caught
      await new Promise((resolve) => setTimeout(resolve, 1250))
    }
  }
  throw error
}
