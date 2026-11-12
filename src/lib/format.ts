import { Amount, usdcDecimalsFor } from '@/onchain-money'
import { ARC_CHAIN_ID } from '@/contracts/arcCheckout'

export const shortAddress = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`

/** Formats a raw ERC-20 USDC amount (6-decimal view) for display, e.g. "12.50". */
export function usdcText(raw: bigint | undefined): string {
  if (raw === undefined) return '0.00'
  const [whole, fraction = ''] = Amount.fromRaw(raw, usdcDecimalsFor(ARC_CHAIN_ID)).toString().split('.')
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${grouped}.${fraction.padEnd(2, '0')}`
}

export function parseOnchainError(error: unknown): string | null {
  const err = error as { message?: string; code?: number; shortMessage?: string } | undefined
  const message = (err?.shortMessage ?? err?.message ?? '').toLowerCase()
  if (!message) return 'Something went wrong. Please try again.'
  if (message.includes('user rejected') || message.includes('user denied') || err?.code === 4001) return null
  if (message.includes('insufficient funds') || message.includes('exceeds balance') || message.includes('transfer amount exceeds')) {
    return 'Insufficient USDC balance. Get test USDC from the sidebar and try again.'
  }
  if (message.includes('invoicenotopen')) return 'This invoice is no longer open.'
  if (message.includes('selfpayment')) return 'You cannot pay your own invoice. Open the link with a different wallet.'
  if (message.includes('memotoolong')) return 'Memo is too long (140 bytes max).'
  if (message.includes('reverted')) return 'Transaction failed. Please try again.'
  if (message.includes('network') || message.includes('timeout')) return 'Network issue. Check your connection and retry.'
  return 'Something went wrong. Please try again.'
}

export function formatDate(seconds: bigint): string {
  return new Date(Number(seconds) * 1000).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
