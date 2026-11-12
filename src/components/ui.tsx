import { useState, type ReactNode } from 'react'
import { ConnectKitButton } from 'connectkit'
import { useAccount } from 'wagmi'
import { Check, Copy, ExternalLink, Loader2, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { buildTxExplorerUrl } from '@/onchain-facts'
import { ARC_CHAIN_ID } from '@/contracts/arcCheckout'

export function AmountField({
  value,
  onChange,
  label = 'Amount',
}: {
  value: string
  onChange: (next: string) => void
  label?: string
}) {
  return (
    <div className="inner rounded-2xl p-4">
      <label className="label" htmlFor="amount-input">
        {label}
      </label>
      <div className="mt-1 flex items-baseline gap-2">
        <input
          id="amount-input"
          inputMode="decimal"
          autoComplete="off"
          value={value}
          onChange={(event) => {
            const next = event.target.value.replace(/[^0-9.]/g, '')
            if (next === '' || /^\d*\.?\d{0,6}$/.test(next)) onChange(next)
          }}
          placeholder="0.00"
          className="display w-full bg-transparent text-4xl font-bold tabular-nums outline-none placeholder:text-slate-300"
          style={{ color: 'var(--ink)' }}
        />
        <span className="text-base font-medium" style={{ color: 'var(--subtle)' }}>
          USDC
        </span>
      </div>
    </div>
  )
}

/** Shows Connect when no wallet is connected, otherwise the children. */
export function WalletGate({ children }: { children: ReactNode }) {
  const { isConnected } = useAccount()
  if (isConnected) return <>{children}</>
  return (
    <ConnectKitButton.Custom>
      {({ show, isConnecting }) => (
        <button type="button" className="btn-primary" onClick={show} disabled={isConnecting}>
          <Wallet className="size-4" />
          {isConnecting ? 'Connecting…' : 'Connect wallet'}
        </button>
      )}
    </ConnectKitButton.Custom>
  )
}

export function TxButtonLabel({
  waiting,
  confirming,
  idle,
}: {
  waiting: boolean
  confirming: boolean
  idle: ReactNode
}) {
  if (waiting) {
    return (
      <>
        <Loader2 className="size-4 animate-spin" /> Confirm in wallet…
      </>
    )
  }
  if (confirming) {
    return (
      <>
        <Loader2 className="size-4 animate-spin" /> Confirming onchain…
      </>
    )
  }
  return <>{idle}</>
}

export function ReceiptLink({ hash, label = 'Confirmed' }: { hash: `0x${string}`; label?: string }) {
  return (
    <div className="inner flex items-center justify-between rounded-2xl p-4">
      <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--success)' }}>
        <Check className="size-4" /> {label}
      </span>
      <a
        href={buildTxExplorerUrl(ARC_CHAIN_ID, hash)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs font-semibold"
        style={{ color: 'var(--accent-hover)' }}
      >
        View on explorer <ExternalLink className="size-3" />
      </a>
    </div>
  )
}

export function CopyButton({
  text,
  label = 'Copy link',
  disabled,
}: {
  text: string | undefined
  label?: string
  disabled?: boolean
}) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      className="btn-ghost"
      disabled={disabled || !text}
      onClick={() => {
        if (!text) return
        navigator.clipboard.writeText(text).then(
          () => {
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          },
          () => toast.error('Could not copy. Select the link and copy it manually.'),
        )
      }}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? 'Copied' : label}
    </button>
  )
}

export function StatusPill({ status }: { status: 'open' | 'paid' | 'cancelled' }) {
  const styles = {
    open: { bg: 'rgba(16,97,166,0.1)', fg: 'var(--accent-hover)', text: 'Open' },
    paid: { bg: 'rgba(26,128,71,0.12)', fg: 'var(--success)', text: 'Paid' },
    cancelled: { bg: 'rgba(138,132,156,0.16)', fg: 'var(--muted)', text: 'Cancelled' },
  }[status]
  return (
    <span
      className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
      style={{ background: styles.bg, color: styles.fg }}
    >
      {styles.text}
    </span>
  )
}
