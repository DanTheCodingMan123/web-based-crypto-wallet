import {
  Connection,
  clusterApiUrl,
  PublicKey,
  Keypair,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

// Use devnet for development (free test SOL from faucet)
const RPC_ENDPOINT =
  process.env.NEXT_PUBLIC_SOLANA_RPC_ENDPOINT || clusterApiUrl("devnet");

export const connection = new Connection(RPC_ENDPOINT, "confirmed");

/**
 * Fetch the SOL balance for a given wallet address
 * Returns balance in SOL (not lamports)
 */
export const getBalance = async (publicKeyString: string): Promise<number> => {
  try {
    const publicKey = new PublicKey(publicKeyString);
    const balanceLamports = await connection.getBalance(publicKey);
    // Convert lamports to SOL (1 SOL = 1 billion lamports)
    return balanceLamports / 1e9;
  } catch (error) {
    console.error("Error fetching balance:", error);
    return 0;
  }
};

/**
 * Get recent transactions for a wallet
 */
export const getTransactionHistory = async (
  publicKeyString: string,
  limit: number = 10
) => {
  try {
    const publicKey = new PublicKey(publicKeyString);
    const signatures = await connection.getSignaturesForAddress(publicKey, {
      limit,
    });
    return signatures;
  } catch (error) {
    console.error("Error fetching transaction history:", error);
    return [];
  }
};

/**
 * Send SOL from one wallet to another
 * Returns transaction signature if successful
 */
export const sendSOL = async (
  senderKeypair: Keypair,
  recipientAddress: string,
  amountSOL: number
): Promise<{ success: boolean; signature?: string; error?: string }> => {
  try {
    // Validate recipient address
    const recipientPublicKey = new PublicKey(recipientAddress);

    // Convert SOL to lamports
    const amountLamports = Math.floor(amountSOL * 1e9);

    // Check sender balance
    const senderBalance = await getBalance(senderKeypair.publicKey.toString());
    if (senderBalance < amountSOL) {
      return {
        success: false,
        error: `Insufficient balance. You have ${senderBalance.toFixed(
          2
        )} SOL but trying to send ${amountSOL} SOL`,
      };
    }

    // Create transaction
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: senderKeypair.publicKey,
        toPubkey: recipientPublicKey,
        lamports: amountLamports,
      })
    );

    // Send and confirm transaction
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [senderKeypair],
      { commitment: "confirmed" }
    );

    return {
      success: true,
      signature,
    };
  } catch (error) {
    console.error("Error sending SOL:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      error: `Transaction failed: ${errorMessage}`,
    };
  }
};

export interface TransactionInfo {
  signature: string;
  timestamp: number | null;
  amount: number;
  type: "sent" | "received" | "unknown";
  counterparty: string | null;
  status: "confirmed" | "failed" | "unknown";
}

/**
 * Get detailed transaction history with parsed amounts and types
 */
export const getDetailedTransactionHistory = async (
  publicKeyString: string,
  limit: number = 10
): Promise<TransactionInfo[]> => {
  try {
    const publicKey = new PublicKey(publicKeyString);
    const signatures = await connection.getSignaturesForAddress(publicKey, {
      limit,
    });

    const transactions: TransactionInfo[] = [];

    for (const sig of signatures) {
      try {
        const tx = await connection.getTransaction(sig.signature, {
          maxSupportedTransactionVersion: 0,
        });

        if (!tx) continue;

        const instructions = tx.transaction.message.instructions;
        let amount = 0;
        let counterparty: string | null = null;
        let type: "sent" | "received" | "unknown" = "unknown";

        // Look for transfer instructions
        for (const instruction of instructions) {
          if (
            instruction.programId.toString() ===
            "11111111111111111111111111111111"
          ) {
            // System program (transfers)
            const data = instruction.data;
            if (data.length >= 12) {
              // Extract amount (at bytes 4-12 for SystemProgram.transfer)
              amount = Number(data.readBigUInt64LE(4)) / 1e9;
            }

            // Determine if sent or received
            if (instruction.keys[0]?.pubkey.toString() === publicKeyString) {
              type = "sent";
              counterparty = instruction.keys[1]?.pubkey.toString() || null;
            } else if (
              instruction.keys[1]?.pubkey.toString() === publicKeyString
            ) {
              type = "received";
              counterparty = instruction.keys[0]?.pubkey.toString() || null;
            }
            break;
          }
        }

        transactions.push({
          signature: sig.signature,
          timestamp: tx.blockTime || null,
          amount,
          type,
          counterparty,
          status:
            sig.confirmationStatus === "confirmed" ? "confirmed" : "unknown",
        });
      } catch (err) {
        console.error(`Error parsing transaction ${sig.signature}:`, err);
      }
    }

    return transactions;
  } catch (error) {
    console.error("Error fetching detailed transaction history:", error);
    return [];
  }
};
