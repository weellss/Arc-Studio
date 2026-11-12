import { useState } from 'react'
import { isAddress } from 'viem'
import { useAccount, useReadContract } from 'wagmi'
import { Search } from 'lucide-react'
import { ARC_CHAIN_ID, CHECKOUT_ADDRESS, MEMO_MAX_BYTES, arcCheckoutAbi, toInvoice } from '@/contracts/arcCheckout'
import { formatDate, shortAddress, usdcText } from '@/lib/format'
import { parseAmount } from '@/onchain-money'
import { buildAddressExplorerUrl } from '@/onchain-facts'
import { ApproveAndPay } from './ApproveAndPay'
import { AmountField, StatusPill } from './ui'

type Mode = 'invoice' | 'tip'

export function PayView({ initialInvoice, initialTip }: { initialInvoice?: string; initialTip?: string }) {
  const [mode, setMode] = useState<Mode>(initialTip && !initialInvoice ? 'tip' : 'invoice')

  return (
    <div className="space-y-4">
      <div className="inner grid grid-cols-2 gap-1 rounded-2xl p-1" role="tablist" aria-label="Payment type">
        {(['invoice', 'tip'] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={mode === value}
            onClick={() => setMode(value)}
            className="min-h-10 rounded-xl text-sm font-semibold transition-colors"
            style={{
              background: mode === value ? 'var(--accent)' : 'transparent',
              color: mode === value ? '#fff' : 'var(--muted)',
            }}
          >
            {value === 'invoice' ? 'Pay an invoice' : 'Send a tip'}
          </button>
        ))}
      </div>
      {mode === 'invoice' ? <InvoicePay initialId={initialInvoice} /> : <TipForm initialRecipient={initialTip} />}
    </div>
  )
}

function InvoicePay({ initialId }: { initialId?: string }) {
  const { address } = useAccount()
  const [idText, setIdText] = useState(initialId && /^\d+$/.test(initialId) ? initialId : '')
  const id = /^\d{1,12}$/.test(idText) && BigInt(idText) > 0n ? BigInt(idText) : undefined

  const query = useReadContract({
    address: CHECKOUT_ADDRESS,
    abi: arcCheckoutAbi,
    functionName: 'getInvoice',
    args: id !== undefined ? [id] : undefined,
    chainId: ARC_CHAIN_ID,
    query: { enabled: id !== undefined && Boolean(CHECKOUT_ADDRESS), retry: false },
  })

  const invoice = id !== undefined && query.data ? toInvoice(id, query.data) : undefined
  const isOwn = invoice && address && invoice.merchant.toLowerCase() === address.toLowerCase()

  return (
    <div className="space-y-4">
      <div>
        <label className="label" htmlFor="invoice-id">
          Invoice number
        </label>
        <div className="relative mt-1.5">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2" style={{ color: 'var(--subtle)' }} />
          <input
            id="invoice-id"
            inputMode="numeric"
            className="field tabular-nums"
            style={{ paddingLeft: '2.5rem' }}
            placeholder="e.g. 1"
            value={idText}
            onChange={(event) => setIdText(event.target.value.replace(/\D/g, ''))}
          />
        </div>
      </div>

      {id === undefined && (
        <p className="text-center text-sm" style={{ color: 'var(--muted)' }}>
          Enter an invoice number or open a payment link to see what you owe.
        </p>
      )}

      {id !== undefined && query.isLoading && (
        <div className="inner h-40 animate-pulse rounded-2xl" aria-label="Loading invoice" />
      )}

      {id !== undefined && query.isError && (
        <p className="inner rounded-2xl p-4 text-sm" style={{ color: 'var(--danger)' }}>
          Invoice #{id.toString()} was not found on Arc Testnet.
        </p>
      )}

      {invoice && (
        <div className="inner space-y-4 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="label">Invoice #{invoice.id.toString()}</span>
            <StatusPill status={invoice.status} />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="display text-5xl font-bold tabular-nums">{usdcText(invoice.amount)}</span>
            <span className="text-lg font-medium" style={{ color: 'var(--subtle)' }}>
              USDC
            </span>
          </div>
          {invoice.memo && (
            <p className="text-pretty text-sm" style={{ color: 'var(--ink-2)' }}>
              {invoice.memo}
            </p>
          )}
          <dl className="space-y-1.5 border-t pt-3 text-xs" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
            <div className="flex justify-between">
              <dt>Pay to</dt>
              <dd>
                <a
                  className="mono"
                  href={buildAddressExplorerUrl(ARC_CHAIN_ID, invoice.merchant)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--accent-hover)' }}
                >
                  {shortAddress(invoice.merchant)}
                </a>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt>Created</dt>
              <dd>{formatDate(invoice.createdAt)}</dd>
            </div>
            {invoice.status === 'paid' && (
              <div className="flex justify-between">
                <dt>Paid by</dt>
                <dd className="mono">
                  {shortAddress(invoice.paidBy)} · {formatDate(invoice.paidAt)}
                </dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt>Network fee</dt>
              <dd>Paid in USDC on Arc</dd>
            </div>
          </dl>

          {invoice.status === 'open' ? (
            <ApproveAndPay
              amount={invoice.amount}
              functionName="pay"
              args={[invoice.id]}
              actionLabel="Pay"
              blockedReason={isOwn ? 'This is your own invoice. Open the link with a different wallet to pay it.' : undefined}
              onDone={() => void query.refetch()}
            />
          ) : (
            <p className="text-center text-sm font-medium" style={{ color: 'var(--muted)' }}>
              {invoice.status === 'paid' ? 'This invoice has been paid.' : 'The merchant cancelled this invoice.'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

const TIP_PRESETS = ['0.10', '0.25', '0.50', '1.00']

function TipForm({ initialRecipient }: { initialRecipient?: string }) {
  const { address: me } = useAccount()
  const [recipient, setRecipient] = useState(initialRecipient ?? '')
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')

  const validRecipient = isAddress(recipient) ? (recipient) : undefined
  let raw: bigint | undefined
  try {
    raw = amount ? parseAmount(ARC_CHAIN_ID, amount).raw : undefined
  } catch {
    raw = undefined
  }
  if (raw === 0n) raw = undefined
  const memoBytes = new TextEncoder().encode(memo).length
  const memoOk = memoBytes <= MEMO_MAX_BYTES

  let blocked: string | undefined
  if (recipient && !validRecipient) blocked = 'Enter a valid wallet address.'
  else if (!memoOk) blocked = `Message is too long (${MEMO_MAX_BYTES} bytes max).`
  else if (validRecipient && me && validRecipient.toLowerCase() === me.toLowerCase()) blocked = 'This is your own address.'

  return (
    <div className="space-y-4">
      <div>
        <label className="label" htmlFor="tip-to">
          Recipient wallet
        </label>
        <input
          id="tip-to"
          className="field mono mt-1.5 text-xs"
          placeholder="0x…"
          autoComplete="off"
          spellCheck={false}
          value={recipient}
          onChange={(event) => setRecipient(event.target.value.trim())}
        />
      </div>

      <AmountField value={amount} onChange={setAmount} label="Tip amount" />
      <div className="flex flex-wrap gap-2">
        {TIP_PRESETS.map((preset) => (
          <button key={preset} type="button" className="btn-ghost" onClick={() => setAmount(preset)}>
            ${preset}
          </button>
        ))}
      </div>

      <div>
        <label className="label" htmlFor="tip-memo">
          Message (optional)
        </label>
        <input
          id="tip-memo"
          className="field mt-1.5"
          placeholder="Thanks!"
          value={memo}
          onChange={(event) => setMemo(event.target.value)}
        />
      </div>

      <ApproveAndPay
        amount={validRecipient ? raw : undefined}
        functionName="tip"
        args={[validRecipient ?? '0x0000000000000000000000000000000000000000', raw ?? 0n, memo.trim()]}
        actionLabel="Send"
        blockedReason={blocked}
      />
    </div>
  )
}
