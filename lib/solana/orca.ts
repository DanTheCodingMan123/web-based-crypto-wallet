import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  VersionedTransaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  WhirlpoolContext,
  buildWhirlpoolClient,
  ORCA_WHIRLPOOL_PROGRAM_ID,
  swapQuoteByInputToken,
  IGNORE_CACHE,
} from "@orca-so/whirlpools-sdk";
import { Percentage } from "@orca-so/common-sdk";
import BN from "bn.js";
import type { Wallet } from "@coral-xyz/anchor";
import { connection } from "./connection";

export const DEVNET_USDC_MINT = new PublicKey(
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
);
const SOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");

const DEVNET_SOL_USDC_WHIRLPOOL = new PublicKey(
  "3KBZiL2g8C7tiJ32hTv5v3KM7aK9htpqTw4cTXz1HvPt"
);

function createWalletFromKeypair(keypair: Keypair): Wallet {
  return {
    publicKey: keypair.publicKey,
    signTransaction: async (tx: Transaction | VersionedTransaction | any) => {
      console.log(
        "Wallet signTransaction called with type:",
        tx?.constructor?.name
      );
      if (tx instanceof VersionedTransaction) {
        console.log(
          "Signing VersionedTransaction with keypair:",
          keypair.publicKey.toString()
        );
        tx.sign([keypair]);
        console.log("After signing, signatures count:", tx.signatures.length);
        return tx;
      } else if (tx instanceof Transaction) {
        console.log(
          "Signing Transaction with keypair:",
          keypair.publicKey.toString()
        );
        tx.sign(keypair);
        return tx;
      } else {
        console.log("Unknown transaction type, attempting to find inner tx");
        if ((tx as any).tx instanceof VersionedTransaction) {
          console.log("Found tx.tx, signing it");
          (tx as any).tx.sign([keypair]);
        } else if ((tx as any).transaction instanceof VersionedTransaction) {
          console.log("Found tx.transaction, signing it");
          (tx as any).transaction.sign([keypair]);
        }
        return tx;
      }
    },
    signAllTransactions: async (
      txs: (Transaction | VersionedTransaction | any)[]
    ) => {
      console.log(
        "Wallet signAllTransactions called with",
        txs.length,
        "transactions"
      );
      return txs.map((tx) => {
        if (tx instanceof VersionedTransaction) {
          tx.sign([keypair]);
        } else if (tx instanceof Transaction) {
          tx.sign(keypair);
        } else if ((tx as any).tx instanceof VersionedTransaction) {
          (tx as any).tx.sign([keypair]);
        } else if ((tx as any).transaction instanceof VersionedTransaction) {
          (tx as any).transaction.sign([keypair]);
        }
        return tx;
      });
    },
  };
}

export const getOrcaQuote = async (
  inputAmount: number,
  inputMint: PublicKey = SOL_MINT,
  outputMint: PublicKey = DEVNET_USDC_MINT
): Promise<{
  estimatedAmountIn: string;
  estimatedAmountOut: string;
  priceImpact?: string;
  _quoteInternal: any;
} | null> => {
  try {
    const endpoint = (connection as any)._rpcEndpoint || "";
    const isDevnet = /devnet/i.test(endpoint);

    if (!isDevnet) {
      console.warn("Orca quotes are only available on devnet");
      return null;
    }

    const inputLamports = Math.floor(inputAmount * 1e9);

    if (inputLamports <= 0 || inputAmount <= 0) {
      console.error("Invalid amount: must be greater than 0");
      return null;
    }

    const dummyKeypair = Keypair.generate();
    const wallet = createWalletFromKeypair(dummyKeypair);
    const programId = ORCA_WHIRLPOOL_PROGRAM_ID.devnet;
    const ctx = WhirlpoolContext.from(connection, wallet, programId);
    const client = buildWhirlpoolClient(ctx);

    const whirlpool = await client.getPool(
      DEVNET_SOL_USDC_WHIRLPOOL,
      IGNORE_CACHE
    );
    const poolData = await whirlpool.getData();

    const inputIsA = poolData.tokenMintA.equals(inputMint);

    const inputAmountBN = new BN(inputLamports);

    const quote = await swapQuoteByInputToken(
      whirlpool,
      inputIsA ? poolData.tokenMintA : poolData.tokenMintB,
      inputAmountBN,
      Percentage.fromFraction(100, 10_000),
      ctx.program.programId,
      ctx.fetcher,
      IGNORE_CACHE
    );

    const outputAmountRaw = quote.estimatedAmountOut.toString();

    return {
      estimatedAmountIn: quote.estimatedAmountIn.toString(),
      estimatedAmountOut: outputAmountRaw,
      _quoteInternal: quote,
    };
  } catch (error) {
    console.error("Error fetching Orca quote:", error);
    return null;
  }
};

export const executeOrcaSwap = async (
  keypair: Keypair,
  inputAmount: number,
  inputMint: PublicKey = SOL_MINT,
  outputMint: PublicKey = DEVNET_USDC_MINT
): Promise<{ success: boolean; signature?: string; error?: string }> => {
  try {
    const endpoint = (connection as any)._rpcEndpoint || "";
    const isDevnet = /devnet/i.test(endpoint);

    if (!isDevnet) {
      return {
        success: false,
        error: "Orca swaps are only available on devnet",
      };
    }

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

    const quote = await getOrcaQuote(inputAmount, inputMint, outputMint);

    if (!quote || !quote._quoteInternal) {
      return {
        success: false,
        error: "Failed to get swap quote from Orca",
      };
    }

    const wallet = createWalletFromKeypair(keypair);

    console.log(
      "Executing swap with keypair public key:",
      keypair.publicKey.toString()
    );
    console.log("Wallet adapter public key:", wallet.publicKey.toString());

    const programId = ORCA_WHIRLPOOL_PROGRAM_ID.devnet;
    const ctx = WhirlpoolContext.from(connection, wallet, programId);
    const client = buildWhirlpoolClient(ctx);

    const whirlpool = await client.getPool(
      DEVNET_SOL_USDC_WHIRLPOOL,
      IGNORE_CACHE
    );

    console.log("Starting swap build...");
    const swapTx = await whirlpool.swap(quote._quoteInternal);
    console.log("Swap object created, building...");
    const builtTx = await swapTx.build();
    console.log("Build complete, checking transaction type...");

    let tx: VersionedTransaction;
    if (builtTx instanceof VersionedTransaction) {
      console.log("Built transaction is VersionedTransaction");
      tx = builtTx;
    } else if ((builtTx as any).tx instanceof VersionedTransaction) {
      console.log(
        "Built transaction has .tx property that is VersionedTransaction"
      );
      tx = (builtTx as any).tx;
    } else if ((builtTx as any).transaction instanceof VersionedTransaction) {
      console.log(
        "Built transaction has .transaction property that is VersionedTransaction"
      );
      tx = (builtTx as any).transaction;
    } else {
      console.log("Built transaction properties:", Object.keys(builtTx || {}));
      throw new Error(
        `Unable to extract VersionedTransaction from build result. Type: ${
          builtTx?.constructor?.name || typeof builtTx
        }, Keys: ${Object.keys(builtTx || {}).join(", ")}`
      );
    }

    console.log(
      "Extracted transaction, signatures before send:",
      tx.signatures.length
    );
    tx.signatures.forEach((sig, i) => {
      console.log(
        `  Signature ${i}:`,
        "sig structure:",
        typeof sig,
        "keys:",
        typeof sig === "object" ? Object.keys(sig) : "not-an-object"
      );
      if (Buffer.isBuffer(sig)) {
        console.log(`    Buffer length: ${sig.length}`);
      }
    });

    console.log(
      "Signing transaction with keypair:",
      keypair.publicKey.toString()
    );
    tx.sign([keypair]);
    console.log("After signing, signatures count:", tx.signatures.length);

    const serialized = tx.serialize();
    console.log("Sending serialized transaction...");

    const signature = await connection.sendRawTransaction(serialized, {
      skipPreflight: true,
      maxRetries: 3,
    });

    console.log("Transaction sent:", signature);

    await connection.confirmTransaction(signature, "confirmed");
    console.log("Swap transaction confirmed:", signature);

    return {
      success: true,
      signature,
    };
  } catch (error) {
    console.error("Error executing Orca swap:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      error: `Swap failed: ${errorMessage}`,
    };
  }
};
