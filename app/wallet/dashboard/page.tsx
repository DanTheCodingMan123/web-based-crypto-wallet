"use client";

import { useRouter } from "next/navigation";
import { useWallet } from "@/lib/crypto/WalletContext";
import { getBalance } from "@/lib/solana/connection";
import { sendSOL } from "@/lib/solana/connection";
import { reconstructKeypair } from "@/lib/crypto/keypair";
import { useState, useEffect } from "react";

export default function WalletDashboard() {
     const router = useRouter();
     const { walletKeys } = useWallet();
     const [mode, setMode] = useState<"view" | "send" | "receive">("view");
     const [copied, setCopied] = useState(false);
     const [recipient, setRecipient] = useState("");
     const [amount, setAmount] = useState("");
     const [balance, setBalance] = useState<number | null>(null);
     const [loading, setLoading] = useState(true);
     const [sending, setSending] = useState(false);
     const [error, setError] = useState<string | null>(null);

     useEffect(() => {
          if (!walletKeys) router.push("/");
     }, [walletKeys, router]);

     useEffect(() => {
          const fetchBalance = async () => {
               if (!walletKeys) return;
               setLoading(true);
               const bal = await getBalance(walletKeys.publicKey);
               setBalance(bal);
               setLoading(false);
          };

          fetchBalance();
          // Refresh every 15 seconds
          const interval = setInterval(fetchBalance, 15000);
          return () => clearInterval(interval);
     }, [walletKeys]);

     if (!walletKeys) return null;

     const handleCopy = () => {
          navigator.clipboard.writeText(walletKeys.publicKey);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
     };

     const handleSend = async () => {
          setError(null);

          // Validation
          if (!recipient.trim()) {
               setError("Please enter a recipient address");
               return;
          }

          if (!amount || parseFloat(amount) <= 0) {
               setError("Please enter a valid amount");
               return;
          }

          const amountNum = parseFloat(amount);

          // Check balance
          if (balance === null || amountNum > balance) {
               setError(
                    `Insufficient balance. You have ${balance?.toFixed(2) || "0"} SOL but trying to send ${amount} SOL`
               );
               return;
          }

          try {
               setSending(true);

               // Reconstruct keypair from stored data
               const keypair = reconstructKeypair(walletKeys.keypairData);

               // Send SOL
               const result = await sendSOL(keypair, recipient, amountNum);

               if (result.success) {
                    alert(`✓ Transaction successful!\nSignature: ${result.signature}`);
                    setRecipient("");
                    setAmount("");
                    setMode("view");
                    // Refresh balance
                    const newBalance = await getBalance(walletKeys.publicKey);
                    setBalance(newBalance);
               } else {
                    setError(result.error || "Failed to send transaction");
               }
          } catch (err) {
               setError(err instanceof Error ? err.message : "Unknown error occurred");
          } finally {
               setSending(false);
          }
     };

     const shortAddress = walletKeys.publicKey.slice(0, 8) + "..." + walletKeys.publicKey.slice(-8);

     return (
          <div className="min-h-screen bg-white">
               <header className="border-b border-gray-200 px-4 py-4">
                    <div className="max-w-4xl mx-auto flex justify-between items-center">
                         <h1 className="text-2xl font-bold text-gray-900">Solana Wallet</h1>
                         <a href="/" className="px-4 py-2 rounded border border-gray-900 text-gray-900 hover:bg-gray-50 transition-colors">
                              Exit
                         </a>
                    </div>
               </header>

               <div className="max-w-2xl mx-auto px-4 py-12">
                    {mode === "view" && (
                         <div className="space-y-8">
                              {/* Balance Display */}
                              <div className="text-center">
                                   <p className="text-gray-600 mb-2">Total Balance</p>
                                   <p className="text-7xl font-bold text-gray-900 mb-2">
                                        {loading ? "..." : balance?.toFixed(2) || "0.00"}
                                   </p>
                                   <p className="text-2xl text-gray-600">SOL</p>
                              </div>

                              {/* Wallet Address */}
                              <div className="bg-white p-6 rounded-2xl border border-gray-300">
                                   <p className="text-sm text-gray-600 mb-3">Wallet Address</p>
                                   <p className="font-mono text-sm text-gray-900 mb-4 break-all">{walletKeys.publicKey}</p>
                                   <button
                                        onClick={handleCopy}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-900 text-gray-900 hover:bg-gray-50 transition-colors"
                                   >
                                        {copied ? "Copied!" : "Copy Address"}
                                   </button>
                              </div>

                              {/* Action Buttons */}
                              <div className="grid grid-cols-2 gap-4">
                                   <button
                                        onClick={() => setMode("send")}
                                        className="px-6 py-3 rounded-lg border border-gray-900 text-gray-900 font-semibold hover:bg-gray-50 transition-colors"
                                   >
                                        Send
                                   </button>
                                   <button
                                        onClick={() => setMode("receive")}
                                        className="px-6 py-3 rounded-lg border border-gray-900 text-gray-900 font-semibold hover:bg-gray-50 transition-colors"
                                   >
                                        Receive
                                   </button>
                              </div>

                         </div>
                    )}

                    {mode === "send" && (
                         <div className="space-y-6">
                              <button
                                   onClick={() => {
                                        setMode("view");
                                        setError(null);
                                   }}
                                   className="text-gray-900 font-semibold hover:text-gray-600"
                              >
                                   ← Back
                              </button>
                              <h2 className="text-3xl font-bold text-gray-900">Send Tokens</h2>

                              {error && (
                                   <div className="p-4 rounded-lg bg-red-50 border border-red-300">
                                        <p className="text-red-900 text-sm">{error}</p>
                                   </div>
                              )}

                              <div className="space-y-4">
                                   <input
                                        type="text"
                                        placeholder="Recipient address"
                                        value={recipient}
                                        onChange={(e) => setRecipient(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-gray-900"
                                        disabled={sending}
                                   />
                                   <input
                                        type="number"
                                        placeholder="Amount (SOL)"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-gray-900"
                                        disabled={sending}
                                   />
                                   <button
                                        onClick={handleSend}
                                        disabled={sending}
                                        className="w-full px-6 py-3 rounded-lg border border-gray-900 text-gray-900 font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                   >
                                        {sending ? "Sending..." : "Send"}
                                   </button>
                              </div>
                         </div>
                    )}

                    {mode === "receive" && (
                         <div className="space-y-6">
                              <button
                                   onClick={() => setMode("view")}
                                   className="text-gray-900 font-semibold hover:text-gray-600"
                              >
                                   ← Back
                              </button>
                              <h2 className="text-3xl font-bold text-gray-900">Receive Tokens</h2>
                              <p className="text-gray-600">Share this address to receive tokens:</p>
                              <div className="bg-white p-6 rounded-2xl border border-gray-300">
                                   <p className="font-mono text-sm text-gray-900 break-all">{walletKeys.publicKey}</p>
                              </div>
                              <button
                                   onClick={handleCopy}
                                   className="w-full px-6 py-3 rounded-lg border border-gray-900 text-gray-900 font-semibold hover:bg-gray-50 transition-colors"
                              >
                                   {copied ? "Copied!" : "Copy Address"}
                              </button>
                         </div>
                    )}
               </div>
          </div>
     );
}
