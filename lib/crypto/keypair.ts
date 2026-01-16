import { Keypair } from "@solana/web3.js";

export interface WalletKeys {
  publicKey: string;
  privateKey: string;
  keypairData: number[];
}

export const generateNewKeypair = (): WalletKeys => {
  const keypair = Keypair.generate();

  return {
    publicKey: keypair.publicKey.toString(),
    privateKey: Buffer.from(keypair.secretKey).toString("base64"),
    keypairData: Array.from(keypair.secretKey),
  };
};

export const reconstructKeypair = (keypairData: number[]): Keypair => {
  const secretKey = new Uint8Array(keypairData);
  return Keypair.fromSecretKey(secretKey);
};

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
