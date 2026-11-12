import { useCallback, useEffect, useState } from 'react'
import { useAccount, useSwitchChain, useWaitForTransactionReceipt, useWriteContract } from 'wagmi'
import type { Abi, Hash } from 'viem'
import { toast } from 'sonner'
import { ARC_CHAIN_ID } from '@/contracts/arcCheckout'
import { parseOnchainError } from '@/lib/format'

interface WriteParams {
  address: `0x${string}`
  abi: Abi
  functionName: string
  args?: readonly unknown[]
}

/**
 * One wallet write with real status: waiting for the wallet, confirming onchain, confirmed.
 * Switches the wallet to Arc Testnet first when it is on another chain.
 */
export function useContractTx(onConfirmed?: (hash: Hash) => void) {
  const { chainId } = useAccount()
  const { switchChainAsync } = useSwitchChain()
  const { writeContractAsync, isPending } = useWriteContract()
  const [hash, setHash] = useState<Hash | undefined>()
  const receipt = useWaitForTransactionReceipt({ hash, chainId: ARC_CHAIN_ID })

  const send = useCallback(
    async (params: WriteParams) => {
      try {
        setHash(undefined)
        if (chainId !== ARC_CHAIN_ID) {
          await switchChainAsync({ chainId: ARC_CHAIN_ID })
        }
        const txHash = await writeContractAsync({ ...params, chainId: ARC_CHAIN_ID })
        setHash(txHash)
      } catch (error) {
        const message = parseOnchainError(error)
        if (message) toast.error(message)
      }
    },
    [chainId, switchChainAsync, writeContractAsync],
  )

  const { isSuccess, isError } = receipt
  useEffect(() => {
    if (isSuccess && hash) onConfirmed?.(hash)
    // Only react to a newly confirmed hash.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess, hash])

  useEffect(() => {
    if (isError) toast.error('Transaction failed onchain. Please try again.')
  }, [isError])

  return {
    send,
    hash,
    isWaitingForWallet: isPending,
    isConfirming: Boolean(hash) && receipt.isLoading,
    isConfirmed: isSuccess,
    receipt: receipt.data,
    reset: () => setHash(undefined),
  }
}
