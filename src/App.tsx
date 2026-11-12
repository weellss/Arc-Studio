import { useState } from 'react'
import { CreditCard, LayoutList, PlusCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { Header } from '@/components/Header'
import { PayView } from '@/components/PayView'
import { CreateInvoice } from '@/components/CreateInvoice'
import { Dashboard } from '@/components/Dashboard'
import { CHECKOUT_ADDRESS } from '@/contracts/arcCheckout'

type Tab = 'pay' | 'create' | 'dashboard'

const TABS: { id: Tab; label: string; icon: typeof CreditCard }[] = [
  { id: 'pay', label: 'Pay', icon: CreditCard },
  { id: 'create', label: 'Get paid', icon: PlusCircle },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutList },
]

const params = new URLSearchParams(window.location.search)
const initialInvoice = params.get('invoice') ?? undefined
const initialTip = params.get('tip') ?? undefined

export default function App() {
  const [tab, setTab] = useState<Tab>(initialInvoice || initialTip ? 'pay' : 'create')

  return (
    <div className="mx-auto min-h-dvh w-full max-w-md px-4 pb-24 pt-6">
      <Header />

      <main className="mt-6">
        <h1 className="display text-balance text-3xl font-bold">
          {tab === 'pay' && 'Pay with USDC'}
          {tab === 'create' && 'Get paid in USDC'}
          {tab === 'dashboard' && 'Your payments'}
        </h1>
        <p className="mt-1.5 text-pretty text-sm" style={{ color: 'var(--muted)' }}>
          {tab === 'pay' && 'Settles in under a second on Arc. Fees are paid in USDC too.'}
          {tab === 'create' && 'Create an invoice and share the link. Funds go straight to your wallet.'}
          {tab === 'dashboard' && 'Track what you have been paid and manage open invoices.'}
        </p>

        <div className="inner mt-5 grid grid-cols-3 gap-1 rounded-2xl p-1" role="tablist" aria-label="Sections">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl text-sm font-semibold transition-colors"
              style={{
                background: tab === id ? 'var(--accent)' : 'transparent',
                color: tab === id ? '#fff' : 'var(--muted)',
              }}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>

        <motion.section
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          className="card mt-4 overflow-hidden rounded-3xl"
        >
          <div className="h-1" style={{ background: 'var(--spectral)' }} />
          <div className="p-5">
            {!CHECKOUT_ADDRESS ? (
              <p className="text-sm" style={{ color: 'var(--danger)' }}>
                The checkout contract address is not configured.
              </p>
            ) : (
              <>
                {tab === 'pay' && <PayView initialInvoice={initialInvoice} initialTip={initialTip} />}
                {tab === 'create' && <CreateInvoice />}
                {tab === 'dashboard' && <Dashboard />}
              </>
            )}
          </div>
        </motion.section>

        <p className="mt-4 text-center text-xs" style={{ color: 'var(--subtle)' }}>
          Testnet only. Need USDC to try it? Use Get test USDC in the Arc Studio sidebar.
        </p>
      </main>
    </div>
  )
}
