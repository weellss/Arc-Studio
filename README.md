# ArcPay Checkout

A USDC checkout on Arc Testnet. Merchants create invoices and share a payment link, customers pay from their own wallet, and the USDC goes straight to the merchant. Anyone can also send a tip to any wallet, and merchants get a dashboard of what they have been paid.

Built with [Arc Studio](https://studio.arc.io)

## Tech stack

- React, TypeScript, Vite, Tailwind CSS
- wagmi, viem and ConnectKit for wallet and chain access
- A Solidity contract (Foundry, OpenZeppelin) deployed on Arc Testnet

## Development

Prerequisites: [Bun](https://bun.sh) and [Foundry](https://getfoundry.sh) (only needed to rebuild the contract).

```bash
bun install
bun run dev
```

Other commands:

```bash
bun run check   # lint and typecheck
forge build     # compile the contract
```

### Environment variables

- `VITE_ARC_CHECKOUT_ADDRESS`: address of the deployed checkout contract on Arc Testnet.
- `RPC_PROXY_BASE_URL`, `RPC_PROXY_TOKEN`, `RPC_PROXY_CHAINS`: optional outside Arc Studio. Provisioned by Arc Studio for RPC access.

## Trying it

1. Connect a wallet on Arc Testnet and get test USDC from the Arc Studio sidebar.
2. Open **Get paid**, create an invoice and copy the link.
3. Open the link with a different wallet and pay it, then check the **Dashboard**.
