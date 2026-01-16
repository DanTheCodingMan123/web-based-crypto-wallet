"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { generateNewKeypair, exportWalletJSON } from "@/lib/crypto/keypair";
import { useWallet } from "@/lib/crypto/WalletContext";

export default function CreateWallet() {
     const router = useRouter();
     const { setWalletKeys } = useWallet();
     const [walletData, setWalletData] = useState<any>(null);
     const [showPrivateKey, setShowPrivateKey] = useState(false);
     const [copiedKey, setCopiedKey] = useState<string | null>(null);

     const handleGenerateWallet = () => {
          const keys = generateNewKeypair();
          setWalletData(keys);
          setWalletKeys(keys);
     };

     const handleCopy = (text: string, keyType: string) => {
          navigator.clipboard.writeText(text);
          setCopiedKey(keyType);
          setTimeout(() => setCopiedKey(null), 2000);
     };

     const handleDownload = () => {
          if (!walletData) return;
          const jsonData = exportWalletJSON(walletData);
          const url = `data:text/plain;charset=utf-8,${encodeURIComponent(jsonData)}`;
          const link = document.createElement("a");
          link.href = url;
          link.download = `solana_wallet_${Date.now()}.json`;
          link.click();
     };

     if (!walletData) {
          return (
               <div className="min-h-screen bg-white flex items-center justify-center px-4">
                    <div className="flex flex-col items-center gap-6 max-w-xl text-center">
                         <h1 className="text-4xl font-bold text-gray-900">Create Your Wallet</h1>
                         <p className="text-lg text-gray-600">
                              Generate a new ED25519 keypair to secure your Solana tokens.
                         </p>
                         <button
                              onClick={handleGenerateWallet}
                              className="bg-black text-white px-8 py-3 rounded-lg font-semibold text-lg hover:bg-gray-800 transition-colors"
                         >
                              Generate Wallet
                         </button>
                    </div>
               </div>
          );
     }

     return (
          <div className="min-h-screen bg-white px-4 py-8">
               <div className="max-w-2xl mx-auto">
                    <h1 className="text-4xl font-bold text-gray-900 mb-12">Your New Wallet</h1>

                    <div className="mb-12">
                         <h2 className="text-lg font-semibold text-gray-900 mb-4">Public Key (Wallet Address)</h2>
                         <div className="bg-white p-4 rounded-2xl border border-gray-300 mb-4 break-all font-mono text-sm text-gray-900">
                              {walletData.publicKey}
                         </div>
                         <button
                              onClick={() => handleCopy(walletData.publicKey, 'public')}
                              className="w-full px-4 py-2 rounded-lg border border-gray-900 text-gray-900 hover:bg-gray-50 transition-colors"
                         >
                              {copiedKey === 'public' ? "Copied!" : "Copy"}
                         </button>
                    </div>

                    <div className="mb-12">
                         <h2 className="text-lg font-semibold text-gray-900 mb-4">Private Key</h2>
                         {!showPrivateKey ? (
                              <button
                                   onClick={() => setShowPrivateKey(true)}
                                   className="w-full px-4 py-2 rounded-lg border border-gray-900 text-gray-900 hover:bg-gray-50 transition-colors font-semibold"
                              >
                                   Reveal Private Key
                              </button>
                         ) : (
                              <div>
                                   <div className="bg-white p-4 rounded-2xl border border-gray-300 mb-4 break-all font-mono text-sm max-h-32 overflow-y-auto text-gray-900">
                                        {walletData.privateKey}
                                   </div>
                                   <div className="flex gap-3">
                                        <button
                                             onClick={() => handleCopy(walletData.privateKey, 'private')}
                                             className="flex-1 px-4 py-2 rounded-lg border border-gray-900 text-gray-900 hover:bg-gray-50 transition-colors"
                                        >
                                             {copiedKey === 'private' ? "Copied!" : "Copy"}
                                        </button>
                                   </div>
                              </div>
                         )}
                    </div>

                    <button
                         onClick={() => router.push("/wallet/dashboard")}
                         className="block w-full text-center px-8 py-3 rounded-lg border border-gray-900 text-gray-900 hover:bg-gray-50 transition-colors font-semibold text-lg"
                    >
                         Go to Dashboard
                    </button>
               </div>
          </div>
     );
}
