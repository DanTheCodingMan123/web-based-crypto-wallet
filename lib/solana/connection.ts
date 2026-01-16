import {
  Connection,
  clusterApiUrl,
  PublicKey,
  Keypair,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

const RPC_ENDPOINT =
  process.env.NEXT_PUBLIC_SOLANA_RPC_ENDPOINT || clusterApiUrl("devnet");

export const connection = new Connection(RPC_ENDPOINT, "confirmed");

export const getBalance = async (publicKeyString: string): Promise<number> => {
  try {
    const publicKey = new PublicKey(publicKeyString);
    const balanceLamports = await connection.getBalance(publicKey);
    return balanceLamports / 1e9;
  } catch (error) {
    console.error("Error fetching balance:", error);
    return 0;
  }
};

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

export const sendSOL = async (
  senderKeypair: Keypair,
  recipientAddress: string,
  amountSOL: number
): Promise<{ success: boolean; signature?: string; error?: string }> => {
  try {
    const recipientPublicKey = new PublicKey(recipientAddress);

    const amountLamports = Math.floor(amountSOL * 1e9);

    const senderBalance = await getBalance(senderKeypair.publicKey.toString());
    if (senderBalance < amountSOL) {
      return {
        success: false,
        error: `Insufficient balance. You have ${senderBalance.toFixed(
          2
        )} SOL but trying to send ${amountSOL} SOL`,
      };
    }

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: senderKeypair.publicKey,
        toPubkey: recipientPublicKey,
        lamports: amountLamports,
      })
    );

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
        const parsedTx = await connection.getParsedTransaction(sig.signature, {
          maxSupportedTransactionVersion: 0,
        });

        if (!parsedTx) continue;

        let amount = 0;
        let counterparty: string | null = null;
        let type: "sent" | "received" | "unknown" = "unknown";

        const instructions = parsedTx.transaction.message.instructions || [];

        for (const instruction of instructions) {
          if ("parsed" in instruction && instruction.program === "system") {
            const parsed = instruction.parsed;
            if (parsed.type === "transfer") {
              amount = parsed.info.lamports / 1e9;

              const fromKey = parsed.info.source;
              const toKey = parsed.info.destination;

              if (fromKey === publicKeyString) {
                type = "sent";
                counterparty = toKey || null;
              } else if (toKey === publicKeyString) {
                type = "received";
                counterparty = fromKey || null;
              }
              break;
            }
          }
        }

        transactions.push({
          signature: sig.signature,
          timestamp: parsedTx.blockTime || null,
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
