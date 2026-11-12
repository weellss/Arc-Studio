import { isAddress, type Address } from 'viem'
import { arcTestnet } from 'viem/chains'
import { getUsdc } from '@/onchain-facts'
import { arcCheckoutAbi } from './arcCheckoutAbi'

export { arcCheckoutAbi }

export const ARC_CHAIN_ID = arcTestnet.id

const rawAddress = import.meta.env.VITE_ARC_CHECKOUT_ADDRESS as string | undefined

export const CHECKOUT_ADDRESS: Address | undefined =
  rawAddress && isAddress(rawAddress) ? rawAddress : undefined

const usdcFact = getUsdc(ARC_CHAIN_ID)
if (!usdcFact) {
  throw new Error('USDC is not registered for Arc Testnet')
}
export const USDC_ADDRESS: Address = usdcFact.address as Address

export const MEMO_MAX_BYTES = 140

export type InvoiceStatus = 'open' | 'paid' | 'cancelled'

export interface Invoice {
  id: bigint
  merchant: Address
  amount: bigint
  memo: string
  createdAt: bigint
  paidBy: Address
  paidAt: bigint
  status: InvoiceStatus
}

const STATUS_BY_INDEX: InvoiceStatus[] = ['open', 'paid', 'cancelled']

export function toInvoice(
  id: bigint,
  raw: {
    merchant: Address
    amount: bigint
    memo: string
    createdAt: bigint
    paidBy: Address
    paidAt: bigint
    status: number
  },
): Invoice {
  return { ...raw, id, status: STATUS_BY_INDEX[raw.status] ?? 'open' }
}
