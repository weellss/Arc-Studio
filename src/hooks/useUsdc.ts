import { erc20Abi } from 'viem'
import { useAccount, useReadContract } from 'wagmi'
import { ARC_CHAIN_ID, CHECKOUT_ADDRESS, USDC_ADDRESS } from '@/contracts/arcCheckout'

/** USDC balance in the 6-decimal ERC-20 view. On Arc this is the same pool as native gas. */
export function useUsdcBalance() {
  const { address } = useAccount()
  return useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: ARC_CHAIN_ID,
    query: { enabled: Boolean(address), refetchInterval: 8000 },
  })
}

/** How much USDC the checkout contract may currently pull from the connected wallet. */
export function useCheckoutAllowance() {
  const { address } = useAccount()
  return useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address && CHECKOUT_ADDRESS ? [address, CHECKOUT_ADDRESS] : undefined,
    chainId: ARC_CHAIN_ID,
    query: { enabled: Boolean(address && CHECKOUT_ADDRESS) },
  })
}
