export function formatAmount(raw: string, decimals = 4) {
  const number = Number.parseFloat(raw)
  if (Number.isNaN(number)) return raw
  if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(2)}M`
  if (number >= 1_000) return `${(number / 1_000).toFixed(2)}K`
  return number.toFixed(decimals)
}

export function formatUsd(raw: string) {
  const number = Number.parseFloat(raw)
  if (Number.isNaN(number)) return raw
  if (number >= 1_000_000) return `$${(number / 1_000_000).toFixed(2)}M`
  if (number >= 1_000) return `$${(number / 1_000).toFixed(2)}K`
  return `$${number.toFixed(2)}`
}

export function timeAgo(iso: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}
