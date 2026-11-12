import { ConnectKitButton } from 'connectkit'
import { TokenUSDC } from '@web3icons/react'
import { useAccount } from 'wagmi'
import { useUsdcBalance } from '@/hooks/useUsdc'
import { shortAddress, usdcText } from '@/lib/format'

function BalanceChip() {
  const { isConnected } = useAccount()
  const { data, isLoading } = useUsdcBalance()
  if (!isConnected) return null
  return (
    <span
      className="inner hidden items-center gap-1.5 rounded-full py-1.5 pl-2 pr-3 text-xs font-semibold tabular-nums sm:inline-flex"
      aria-label="USDC balance"
    >
      <TokenUSDC variant="branded" size={16} />
      {isLoading ? '…' : usdcText(data)}
    </span>
  )
}

export function Header() {
  return (
    <header className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <span
          className="flex size-9 items-center justify-center rounded-xl text-sm font-bold text-white display"
          style={{ background: 'var(--accent)' }}
        >
          A
        </span>
        <div className="leading-tight">
          <p className="display text-base font-bold">ArcPay</p>
          <p className="text-[11px]" style={{ color: 'var(--subtle)' }}>
            USDC checkout on Arc Testnet
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <BalanceChip />
        <ConnectKitButton.Custom>
          {({ isConnected, show, address }) => (
            <button type="button" className="btn-ghost" onClick={show}>
              {isConnected && address ? <span className="mono">{shortAddress(address)}</span> : 'Connect'}
            </button>
          )}
        </ConnectKitButton.Custom>
      </div>
    </header>
  )
}
