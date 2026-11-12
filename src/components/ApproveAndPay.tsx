import { useEffect } from 'react'
import { erc20Abi } from 'viem'
import { useAccount } from 'wagmi'
import { ShieldCheck } from 'lucide-react'
import { ARC_CHAIN_ID, CHECKOUT_ADDRESS, USDC_ADDRESS, arcCheckoutAbi } from '@/contracts/arcCheckout'
import { useContractTx } from '@/hooks/useContractTx'
import { useCheckoutAllowance, useUsdcBalance } from '@/hooks/useUsdc'
import { usdcText } from '@/lib/format'
import { ReceiptLink, TxButtonLabel, WalletGate } from './ui'

interface Props {
  /** Raw USDC amount (6-decimal ERC-20 view). Undefined disables the button. */
  amount: bigint | undefined
  functionName: 'pay' | 'tip'
  args: readonly unknown[]
  /** Text shown on the final action button, e.g. "Pay". */
  actionLabel: string
  /** Why the action cannot run yet (invalid input, own invoice, ...). */
  blockedReason?: string
  onDone?: () => void
}

/**
 * Two honest steps: approve the exact USDC amount, then call the checkout contract.
 * The approval step disappears once the wallet's allowance already covers the amount.
 */
export function ApproveAndPay({ amount, functionName, args, actionLabel, blockedReason, onDone }: Props) {
  const { isConnected, chainId } = useAccount()
  const balance = useUsdcBalance()
  const allowance = useCheckoutAllowance()

  const approve = useContractTx(() => {
    void allowance.refetch()
  })
  const action = useContractTx(() => {
    void balance.refetch()
    void allowance.refetch()
    onDone?.()
  })

  // A fresh amount or target means any earlier receipt no longer applies.
  const argsKey = JSON.stringify(args, (_k, v: unknown) => (typeof v === 'bigint' ? v.toString() : v))
  const { reset: resetAction } = action
  useEffect(() => {
    resetAction()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [argsKey, functionName])

  if (!CHECKOUT_ADDRESS) {
    return <p className="text-sm" style={{ color: 'var(--danger)' }}>Checkout contract address is not configured.</p>
  }

  const checkout: `0x${string}` = CHECKOUT_ADDRESS
  const needsApproval = amount !== undefined && allowance.data !== undefined && allowance.data < amount
  const insufficient = amount !== undefined && balance.data !== undefined && balance.data < amount
  const wrongChain = isConnected && chainId !== ARC_CHAIN_ID
  const blocked = blockedReason ?? (insufficient ? `You need ${usdcText(amount)} USDC. Your balance is ${usdcText(balance.data)} USDC.` : undefined)
  const busy = approve.isWaitingForWallet || approve.isConfirming || action.isWaitingForWallet || action.isConfirming
  const ready = amount !== undefined && amount > 0n && !blocked && allowance.data !== undefined

  if (action.isConfirmed && action.hash) {
    return <ReceiptLink hash={action.hash} label="Payment confirmed" />
  }

  return (
    <div className="space-y-3">
      {blocked && (
        <p className="text-xs font-medium" style={{ color: 'var(--danger)' }}>
          {blocked}
        </p>
      )}
      <WalletGate>
        {needsApproval ? (
          <>
            <p className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--muted)' }}>
              <ShieldCheck className="size-3.5" /> Step 1 of 2: allow the checkout to move exactly {usdcText(amount)} USDC.
            </p>
            <button
              type="button"
              className="btn-primary"
              disabled={!ready || busy}
              onClick={() =>
                amount !== undefined &&
                void approve.send({
                  address: USDC_ADDRESS,
                  abi: erc20Abi,
                  functionName: 'approve',
                  args: [checkout, amount],
                })
              }
            >
              <TxButtonLabel
                waiting={approve.isWaitingForWallet}
                confirming={approve.isConfirming}
                idle={wrongChain ? 'Switch to Arc Testnet' : `Approve ${usdcText(amount)} USDC`}
              />
            </button>
          </>
        ) : (
          <button
            type="button"
            className="btn-primary"
            disabled={!ready || busy}
            onClick={() =>
              void action.send({
                address: checkout,
                abi: arcCheckoutAbi,
                functionName,
                args,
              })
            }
          >
            <TxButtonLabel
              waiting={action.isWaitingForWallet}
              confirming={action.isConfirming}
              idle={wrongChain ? 'Switch to Arc Testnet' : `${actionLabel}${amount ? ` ${usdcText(amount)} USDC` : ''}`}
            />
          </button>
        )}
      </WalletGate>
    </div>
  )
}
