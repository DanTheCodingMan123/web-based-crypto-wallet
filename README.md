# Crypto Web Wallet

This is a web wallet for Solana that I built as a candidate for head of engineering of Cornell Blockchain!

## Installing Dependencies

Execute the following in the terminal

```bash
npm install
```

## Running the website

```bash
npm run dev
```

Then, open `http://localhost:3000`.

## Implementation notes

On the wallet flow, the app generates an ed25519 keypair using Solana's `Keypair.generate()` API and creates the public/private keys. After that, the user is routed to a private dashboard that reads the stored keypair, shows balances, and acts as the main stage for their wallet actions.

Since this is set up for devnet by default, you fund the new wallet by airdropping SOL from the Solana faucet, then you can send SOL to another address or trade SOL for USDC. The trade quote in the dashboard uses Orca on devnet to fetch pool pricing and calculate the estimated USDC output before executing the swap.

Here are a few implementation/design decisions I made:

- I chose to use a next.js framework for its simple structure and App Router which makes building the frontend much easier.
- I used a centralized solana connection and rpc config so that all the features would share the same endpoint
- Another big trade off I made was deciding between using jupiter vs Orca when implementing the trading feature. My experience with Jupiter is that it is much easier to integrate and work with in simple projects, the issue is however the features that I wanted to use would not work on devnet. On the other hand, I was much less familiar with Orca, but I found that it would support devnet swaps. I ended up choosing Orca for this website and accepted a more limited pool selection on devnet.

## Libraries used

Here are some of the libraries I used:

- App framework: `next`, `react`, `react-dom`, `typescript`
- Solana: `@solana/web3.js`, `@solana/spl-token`,
  `@solana/wallet-adapter-react`, `@solana/wallet-adapter-react-ui`
- Swap/SDKs: `@orca-so/common-sdk`, `@orca-so/whirlpools-sdk`,
  `@coral-xyz/anchor`, `@project-serum/anchor`
- Styling: `tailwindcss`, `eslint`
