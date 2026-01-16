import { Keypair } from "@solana/web3.js";

export interface WalletKeys {
  publicKey: string;
  privateKey: string;
  keypairData: number[];
}

/**
 * Generates a new ed25519 keypair using Solana's Keypair.generate()
 * The keypair uses the ed25519 cryptographic algorithm
 */
export const generateNewKeypair = (): WalletKeys => {
  const keypair = Keypair.generate();

  return {
    publicKey: keypair.publicKey.toString(),
    privateKey: Buffer.from(keypair.secretKey).toString("base64"),
    keypairData: Array.from(keypair.secretKey),
  };
};

/**
 * Reconstruct a keypair from the private key (stored as array)
 */
export const reconstructKeypair = (keypairData: number[]): Keypair => {
  const secretKey = new Uint8Array(keypairData);
  return Keypair.fromSecretKey(secretKey);
};

/**
 * Export wallet data as JSON
 */
export const exportWalletJSON = (walletKeys: WalletKeys): string => {
  return JSON.stringify(
    {
      publicKey: walletKeys.publicKey,
      privateKey: walletKeys.privateKey,
      exportedAt: new Date().toISOString(),
      warning:
        "KEEP THIS FILE SAFE. Anyone with access to your private key can control your wallet.",
    },
    null,
    2
  );
};
