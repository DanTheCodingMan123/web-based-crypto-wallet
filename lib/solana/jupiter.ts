import {
  Connection,
  Keypair,
  VersionedTransaction,
  PublicKey,
} from "@solana/web3.js";
import { connection } from "./connection";
import { getOrcaQuote, executeOrcaSwap, DEVNET_USDC_MINT } from "./orca";

const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);

const USDC_MINT_MAINNET = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const USDC_MINT_DEVNET = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
const SOL_MINT = "So11111111111111111111111111111111111111112";

const JUPITER_API_BASE =
  process.env.NEXT_PUBLIC_JUPITER_API_BASE || "https://lite-api.jup.ag/swap/v1";

const getUSDCMint = (): string => {
  const endpoint = (connection as any)._rpcEndpoint || "";
  const isDevnet = /devnet/i.test(endpoint);
  return isDevnet ? USDC_MINT_DEVNET : USDC_MINT_MAINNET;
};

export interface SwapQuote {
  inputMint: string;
  outputMint: string;
  inputAmount: string;
  outputAmount: string;
  priceImpactPct: string;
  routePlan: Array<{
    swapInfo: {
      ammKey: string;
      label: string;
      inputMint: string;
      outputMint: string;
    };
    percent: number;
  }>;
}

export const getSwapQuote = async (
  inputAmount: number,
  inputMint: string = SOL_MINT,
  outputMint?: string
): Promise<SwapQuote | null> => {
  const endpoint = (connection as any)._rpcEndpoint || "";
  const isDevnet = /devnet/i.test(endpoint);

  if (isDevnet) {
    const inputMintPubkey = new PublicKey(inputMint);
    const outputMintPubkey = outputMint
      ? new PublicKey(outputMint)
      : DEVNET_USDC_MINT;

    const orcaQuote = await getOrcaQuote(
      inputAmount,
      inputMintPubkey,
      outputMintPubkey
    );

    if (!orcaQuote) {
      return null;
    }

    return {
      inputMint,
      outputMint: outputMintPubkey.toString(),
      inputAmount: orcaQuote.estimatedAmountIn,
      outputAmount: orcaQuote.estimatedAmountOut,
      priceImpactPct: "0",
      routePlan: [],
    };
  }

  const usdcMint = outputMint || getUSDCMint();
  try {
    const inputLamports = Math.floor(inputAmount * 1e9);

    if (inputLamports <= 0) {
      console.error("Invalid amount: must be greater than 0");
      return null;
    }

    const params = new URLSearchParams({
      inputMint,
      outputMint: usdcMint,
      amount: inputLamports.toString(),
      slippageBps: "50",
      swapMode: "ExactIn",
    });

    const response = await fetch(
      `${JUPITER_API_BASE}/quote?${params.toString()}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      throw new Error(`Quote API error: ${response.status} ${errorText}`);
    }

    const quote = await response.json();
    return quote;
  } catch (error) {
    console.error("Error fetching swap quote:", error);
    return null;
  }
};

export const executeSwap = async (
  keypair: Keypair,
  inputAmount: number,
  inputMint: string = SOL_MINT,
  outputMint?: string
): Promise<{ success: boolean; signature?: string; error?: string }> => {
  const endpoint = (connection as any)._rpcEndpoint || "";
  const isDevnet = /devnet/i.test(endpoint);

  if (isDevnet) {
    const inputMintPubkey = new PublicKey(inputMint);
    const outputMintPubkey = outputMint
      ? new PublicKey(outputMint)
      : DEVNET_USDC_MINT;
    return await executeOrcaSwap(
      keypair,
      inputAmount,
      inputMintPubkey,
      outputMintPubkey
    );
  }

  const usdcMint = outputMint || getUSDCMint();
  try {
    const balanceLamports = await connection.getBalance(keypair.publicKey);
    const balanceSOL = balanceLamports / 1e9;
    const inputLamports = Math.floor(inputAmount * 1e9);
    const feeBuffer = 50000;

    if (balanceLamports < inputLamports + feeBuffer) {
      return {
        success: false,
        error: `Insufficient balance. You have ${balanceSOL.toFixed(
          2
        )} SOL but trying to trade ${inputAmount} SOL (plus fees)`,
      };
    }

    const quote = await getSwapQuote(inputAmount, inputMint, usdcMint);

    if (!quote) {
      return {
        success: false,
        error: "Failed to get swap quote from Jupiter",
      };
    }

    const swapResponse = await fetch(`${JUPITER_API_BASE}/swap`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        quoteResponse: quote,
        userPublicKey: keypair.publicKey.toString(),
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: "auto",
      }),
    });

    if (!swapResponse.ok) {
      const error = await swapResponse.text();
      throw new Error(`Swap API error: ${error}`);
    }

    const { swapTransaction } = await swapResponse.json();

    const swapTransactionBuf = Buffer.from(swapTransaction, "base64");
    const transaction = VersionedTransaction.deserialize(swapTransactionBuf);

    transaction.sign([keypair]);

    const signature = await connection.sendTransaction(transaction, {
      skipPreflight: false,
      maxRetries: 2,
    });

    const confirmed = await connection.confirmTransaction(
      signature,
      "confirmed"
    );

    if (confirmed.value.err) {
      return {
        success: false,
        error: "Transaction failed",
      };
    }

    return {
      success: true,
      signature,
    };
  } catch (error) {
    console.error("Error executing swap:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      error: `Swap failed: ${errorMessage}`,
    };
  }
};

export const getUSDCBalance = async (
  walletAddress: string
): Promise<number> => {
  try {
    const publicKey = new PublicKey(walletAddress);
    const usdcMint = getUSDCMint();

    try {
      const allTokenAccounts = await connection.getParsedTokenAccountsByOwner(
        publicKey,
        {
          programId: TOKEN_PROGRAM_ID,
        }
      );

      const usdcAccount = allTokenAccounts.value.find((account) => {
        const accountMint = account.account.data.parsed?.info?.mint;
        return accountMint === usdcMint;
      });

      if (usdcAccount) {
        const balance =
          usdcAccount.account.data.parsed.info.tokenAmount.uiAmount || 0;
        return balance;
      }

      return 0;
    } catch (error) {
      console.warn("Error fetching token accounts:", error);
      return 0;
    }
  } catch (error) {
    console.error("Error fetching USDC balance:", error);
    return 0;
  }
};
