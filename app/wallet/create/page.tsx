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
     const [copied, setCopied] = useState(false);

     const handleGenerateWallet = () => {
          const keys = generateNewKeypair();
          setWalletData(keys);
          setWalletKeys(keys);
     };

     const handleCopyToClipboard = (text: string) => {
          navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
     };

     const handleDownloadKeys = () => {
          if (!walletData) return;
          const jsonData = exportWalletJSON(walletData);
          const element = document.createElement("a");
          element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(jsonData));
          element.setAttribute("download", `solana_wallet_${Date.now()}.json`);
          element.style.display = "none";
          document.body.appendChild(element);
          element.click();
          document.body.removeChild(element);
     };

     const handleProceedToDashboard = () => {
          if (walletData) {
               router.push("/wallet/dashboard");
          }
     };

     if (!walletData) {
          return (
               <div className="min-h-screen bg-white flex items-center justify-center px-4">
                    <div className="flex flex-col items-center justify-center gap-6 max-w-xl text-center">
                         <h1 className="text-4xl font-bold text-gray-900">Create Your Wallet</h1>
                         <p className="text-lg text-gray-600">
                              Generate a new ED25519 keypair to secure your Solana tokens.
                         </p>
                         <button
                              onClick={handleGenerateWallet}
                              className="bg-black text-white px-8 py-3 rounded-lg font-semibold text-lg hover:bg-gray-800 transition-colors duration-200"
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
                    <h1 className="text-4xl font-bold text-gray-900 mb-8">Your New Wallet</h1>

                    {/* Public Key Section */}
                    <div className="bg-gray-50 p-6 rounded-lg mb-6 border border-gray-200">
                         <h2 className="text-lg font-semibold text-gray-900 mb-3">Public Key (Wallet Address)</h2>
                         <p className="text-sm text-gray-600 mb-3">Share this address to receive tokens:</p>
                         <div className="bg-white p-4 rounded border border-gray-300 mb-3 break-all font-mono text-sm">
                              {walletData.publicKey}
                         </div>
                         <button
                              onClick={() => handleCopyToClipboard(walletData.publicKey)}
                              className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
                         >
                              {copied ? "Copied!" : "Copy Public Key"}
                         </button>
                    </div>

                    {/* Private Key Section - Warning */}
                    <div className="bg-red-50 border-2 border-red-300 p-6 rounded-lg mb-6">
                         <h2 className="text-lg font-semibold text-red-900 mb-3">⚠️ Private Key - Store Safely</h2>
                         <p className="text-red-800 mb-4">
                              Your private key gives complete access to your wallet. Never share it, and store it securely.
                              Anyone with this key can steal all your tokens.
                         </p>

                         {!showPrivateKey ? (
                              <button
                                   onClick={() => setShowPrivateKey(true)}
                                   className="w-full bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors font-semibold"
                              >
                                   Reveal Private Key
                              </button>
                         ) : (
                              <div>
                                   <div className="bg-white p-4 rounded border border-red-300 mb-3 break-all font-mono text-sm max-h-32 overflow-y-auto">
                                        {walletData.privateKey}
                                   </div>
                                   <div className="flex gap-3">
                                        <button
                                             onClick={() => handleCopyToClipboard(walletData.privateKey)}
                                             className="flex-1 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
                                        >
                                             {copied ? "Copied!" : "Copy Private Key"}
                                        </button>
                                        <button
                                             onClick={handleDownloadKeys}
                                             className="flex-1 bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
                                        >
                                             Download JSON File
                                        </button>
                                   </div>
                              </div>
                         )}
                    </div>

                    {/* Storage Options */}
                    <div className="bg-blue-50 p-6 rounded-lg mb-8 border border-blue-200">
                         <h3 className="font-semibold text-blue-900 mb-2">Recommended: Save Your Keys</h3>
                         <ul className="text-sm text-blue-800 space-y-2">
                              <li>✓ Download the JSON file and store it in a secure location</li>
                              <li>✓ Consider using a hardware wallet for long-term storage</li>
                              <li>✓ Never share your private key with anyone</li>
                              <li>✓ Back up your keys in multiple secure locations</li>
                         </ul>
                    </div>

                    {/* Proceed Button */}
                    <button
                         onClick={handleProceedToDashboard}
                         className="w-full bg-black text-white px-8 py-3 rounded-lg font-semibold text-lg hover:bg-gray-800 transition-colors duration-200"
                    >
                         Proceed to Wallet Dashboard
                    </button>
               </div>
          </div>
     );
}
