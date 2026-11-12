import { useAccount, useReadContract, useReadContracts } from 'wagmi'
import { ArrowDownLeft, Link2 } from 'lucide-react'
import { ARC_CHAIN_ID, CHECKOUT_ADDRESS, arcCheckoutAbi, toInvoice, type Invoice } from '@/contracts/arcCheckout'
import { useContractTx } from '@/hooks/useContractTx'
import { useShareBase } from '@/hooks/useShareBase'
import { formatDate, shortAddress, usdcText } from '@/lib/format'
import { CopyButton, StatusPill, WalletGate } from './ui'

export function Dashboard() {
  const { address } = useAccount()
  const base = useShareBase()

  const received = useReadContract({
    address: CHECKOUT_ADDRESS,
    abi: arcCheckoutAbi,
    functionName: 'merchantReceived',
    args: address ? [address] : undefined,
    chainId: ARC_CHAIN_ID,
    query: { enabled: Boolean(address && CHECKOUT_ADDRESS), refetchInterval: 10000 },
  })

  const ids = useReadContract({
    address: CHECKOUT_ADDRESS,
    abi: arcCheckoutAbi,
    functionName: 'getMerchantInvoiceIds',
    args: address ? [address] : undefined,
    chainId: ARC_CHAIN_ID,
    query: { enabled: Boolean(address && CHECKOUT_ADDRESS), refetchInterval: 10000 },
  })

  const idList = [...(ids.data ?? [])].reverse()
  const details = useReadContracts({
    contracts: idList.map((id) => ({
      address: CHECKOUT_ADDRESS!,
      abi: arcCheckoutAbi,
      functionName: 'getInvoice' as const,
      args: [id] as const,
      chainId: ARC_CHAIN_ID,
    })),
    query: { enabled: idList.length > 0 && Boolean(CHECKOUT_ADDRESS), refetchInterval: 10000 },
  })

  const invoices: Invoice[] = []
  details.data?.forEach((entry, index) => {
    if (entry.status === 'success' && entry.result) invoices.push(toInvoice(idList[index], entry.result))
  })

  const tipLink = base && address ? `${base}/?tip=${address}` : undefined

  const refreshAll = () => {
    void ids.refetch()
    void details.refetch()
  }

  return (
    <div className="space-y-4">
      <WalletGate>
        <section className="inner rounded-2xl p-5">
          <div className="mb-2 flex items-center gap-1.5">
            <span
              className="flex size-5 items-center justify-center rounded-md"
              style={{ background: 'rgba(26,128,71,0.12)' }}
            >
              <ArrowDownLeft className="size-3" style={{ color: 'var(--success)' }} />
            </span>
            <span className="label">Total received</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="display text-5xl font-bold tabular-nums">
              {received.isLoading ? '…' : usdcText(received.data)}
            </span>
            <span className="text-lg font-medium" style={{ color: 'var(--subtle)' }}>
              USDC
            </span>
          </div>
          <p className="mt-1.5 text-xs" style={{ color: 'var(--muted)' }}>
            Invoices and tips paid to {address ? shortAddress(address) : 'your wallet'} through this checkout.
          </p>
        </section>

        <section className="inner rounded-2xl p-4">
          <div className="flex items-center gap-1.5">
            <Link2 className="size-3.5" style={{ color: 'var(--subtle)' }} />
            <span className="label">Your tip link</span>
          </div>
          <p className="mono mt-2 break-all text-xs" style={{ color: 'var(--ink-2)' }}>
            {tipLink ?? 'Preparing link…'}
          </p>
          <div className="mt-3">
            <CopyButton text={tipLink} disabled={!tipLink} />
          </div>
        </section>

        <section className="space-y-2.5">
          <h2 className="label px-1">Your invoices</h2>
          {ids.isLoading && <div className="inner h-20 animate-pulse rounded-2xl" aria-label="Loading invoices" />}
          {!ids.isLoading && idList.length === 0 && (
            <p className="inner rounded-2xl p-5 text-center text-sm" style={{ color: 'var(--muted)' }}>
              No invoices yet. Create one and send the link to a customer.
            </p>
          )}
          {invoices.map((invoice) => (
            <InvoiceRow key={invoice.id.toString()} invoice={invoice} base={base} onChanged={refreshAll} />
          ))}
        </section>
      </WalletGate>
    </div>
  )
}

function InvoiceRow({ invoice, base, onChanged }: { invoice: Invoice; base: string | undefined; onChanged: () => void }) {
  const cancel = useContractTx(onChanged)
  const link = base ? `${base}/?invoice=${invoice.id.toString()}` : undefined
  const busy = cancel.isWaitingForWallet || cancel.isConfirming

  return (
    <article className="inner rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs" style={{ color: 'var(--subtle)' }}>
            #{invoice.id.toString()} · {formatDate(invoice.createdAt)}
          </p>
          <p className="mt-0.5 truncate text-sm font-medium" style={{ color: 'var(--ink-2)' }}>
            {invoice.memo || 'No description'}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="display text-xl font-bold tabular-nums">{usdcText(invoice.amount)}</p>
          <div className="mt-1">
            <StatusPill status={invoice.status} />
          </div>
        </div>
      </div>

      {invoice.status === 'paid' && (
        <p className="mono mt-3 text-[11px]" style={{ color: 'var(--muted)' }}>
          Paid by {shortAddress(invoice.paidBy)} · {formatDate(invoice.paidAt)}
        </p>
      )}

      {invoice.status === 'open' && (
        <div className="mt-3 flex gap-2">
          <CopyButton text={link} disabled={!link} />
          <button
            type="button"
            className="btn-ghost"
            disabled={busy || !CHECKOUT_ADDRESS}
            onClick={() =>
              CHECKOUT_ADDRESS &&
              void cancel.send({
                address: CHECKOUT_ADDRESS,
                abi: arcCheckoutAbi,
                functionName: 'cancelInvoice',
                args: [invoice.id],
              })
            }
          >
            {cancel.isWaitingForWallet ? 'Confirm in wallet…' : cancel.isConfirming ? 'Cancelling…' : 'Cancel invoice'}
          </button>
        </div>
      )}
    </article>
  )
}
