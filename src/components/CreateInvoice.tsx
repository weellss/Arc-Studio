import { useMemo, useState } from 'react'
import { parseEventLogs } from 'viem'
import { useAccount } from 'wagmi'
import { FileText } from 'lucide-react'
import { CHECKOUT_ADDRESS, MEMO_MAX_BYTES, arcCheckoutAbi } from '@/contracts/arcCheckout'
import { ARC_CHAIN_ID } from '@/contracts/arcCheckout'
import { useContractTx } from '@/hooks/useContractTx'
import { useShareBase } from '@/hooks/useShareBase'
import { parseAmount } from '@/onchain-money'
import { AmountField, CopyButton, ReceiptLink, TxButtonLabel, WalletGate } from './ui'

const encoder = new TextEncoder()

function safeParse(value: string): bigint | undefined {
  if (!value) return undefined
  try {
    const raw = parseAmount(ARC_CHAIN_ID, value).raw
    return raw > 0n ? raw : undefined
  } catch {
    return undefined
  }
}

export function CreateInvoice() {
  const { isConnected, chainId } = useAccount()
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')
  const tx = useContractTx()
  const base = useShareBase()

  const raw = safeParse(amount)
  const memoBytes = encoder.encode(memo).length
  const memoOk = memoBytes <= MEMO_MAX_BYTES
  const busy = tx.isWaitingForWallet || tx.isConfirming

  const createdId = useMemo(() => {
    if (!tx.receipt) return undefined
    const logs = parseEventLogs({ abi: arcCheckoutAbi, logs: tx.receipt.logs, eventName: 'InvoiceCreated' })
    return logs[0]?.args.id
  }, [tx.receipt])

  if (!CHECKOUT_ADDRESS) return null
  const checkout: `0x${string}` = CHECKOUT_ADDRESS

  if (tx.isConfirmed && tx.hash && createdId !== undefined) {
    const link = base ? `${base}/?invoice=${createdId.toString()}` : undefined
    return (
      <div className="space-y-4">
        {tx.hash && <ReceiptLink hash={tx.hash} label={`Invoice #${createdId.toString()} created`} />}
        <div className="inner rounded-2xl p-4">
          <p className="label">Payment link</p>
          <p className="mono mt-2 break-all text-xs" style={{ color: 'var(--ink-2)' }}>
            {link ?? 'Preparing link…'}
          </p>
          <div className="mt-3 flex gap-2">
            <CopyButton text={link} disabled={!link} />
            {link && (
              <a className="btn-ghost" href={link} target="_blank" rel="noopener noreferrer">
                Open
              </a>
            )}
          </div>
          <p className="mt-3 text-xs" style={{ color: 'var(--muted)' }}>
            Send this link to your customer. They pay from their own wallet and the USDC lands directly in yours.
          </p>
        </div>
        <button
          type="button"
          className="btn-ghost w-full"
          onClick={() => {
            tx.reset()
            setAmount('')
            setMemo('')
          }}
        >
          Create another invoice
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <AmountField value={amount} onChange={setAmount} label="Invoice amount" />

      <div>
        <label className="label" htmlFor="memo">
          What is it for?
        </label>
        <input
          id="memo"
          className="field mt-1.5"
          placeholder="Logo design, order #1042…"
          value={memo}
          onChange={(event) => setMemo(event.target.value)}
        />
        <p
          className="mt-1.5 text-right text-[11px] tabular-nums"
          style={{ color: memoOk ? 'var(--subtle)' : 'var(--danger)' }}
        >
          {memoBytes}/{MEMO_MAX_BYTES}
        </p>
      </div>

      <div className="inner flex items-start gap-2.5 rounded-2xl p-3.5 text-xs" style={{ color: 'var(--muted)' }}>
        <FileText className="mt-0.5 size-4 shrink-0" />
        <span>
          The invoice is recorded onchain under your connected wallet. Whoever pays it sends USDC straight to you, and
          nothing is held in between.
        </span>
      </div>

      <WalletGate>
        <button
          type="button"
          className="btn-primary"
          disabled={!raw || !memoOk || busy}
          onClick={() =>
            raw !== undefined &&
            void tx.send({
              address: checkout,
              abi: arcCheckoutAbi,
              functionName: 'createInvoice',
              args: [raw, memo.trim()],
            })
          }
        >
          <TxButtonLabel
            waiting={tx.isWaitingForWallet}
            confirming={tx.isConfirming}
            idle={isConnected && chainId !== ARC_CHAIN_ID ? 'Switch to Arc Testnet' : 'Create invoice'}
          />
        </button>
      </WalletGate>
    </div>
  )
}
