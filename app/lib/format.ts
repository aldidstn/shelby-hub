/**
 * Truncates a blockchain address to "0x1234…5678" form.
 */
export function truncateAddress(addr: string, startChars = 6, endChars = 4): string {
  if (addr.length <= startChars + endChars) return addr
  return `${addr.slice(0, startChars)}…${addr.slice(-endChars)}`
}

/**
 * Truncates a transaction hash to "0x12345678…abcdef" form.
 */
export function truncateHash(hash: string, startChars = 8, endChars = 6): string {
  if (hash.length <= startChars + endChars) return hash
  return `${hash.slice(0, startChars)}…${hash.slice(-endChars)}`
}
