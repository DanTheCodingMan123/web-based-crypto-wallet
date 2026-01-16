"use client";

import { useRouter } from "next/navigation";
import { useWallet } from "@/lib/crypto/WalletContext";
import { getBalance, sendSOL, connection } from "@/lib/solana/connection";
import { reconstructKeypair } from "@/lib/crypto/keypair";
import { executeSwap, getUSDCBalance, getSwapQuote } from "@/lib/solana/jupiter";
import { useState, useEffect } from "react";

export default function WalletDashboard() {
     const router = useRouter();
     const { walletKeys } = useWallet();
     const [mode, setMode] = useState<"view" | "send" | "receive" | "trade">("view");
     const [copied, setCopied] = useState(false);
     const [recipient, setRecipient] = useState("");
     const [amount, setAmount] = useState("");
     const [tradeAmount, setTradeAmount] = useState("");
     const [balance, setBalance] = useState<number | null>(null);
     const [usdcBalance, setUsdcBalance] = useState<number | null>(null);
     const [estimatedUsdc, setEstimatedUsdc] = useState<number | null>(null);
     const [loadingQuote, setLoadingQuote] = useState(false);
     const [loading, setLoading] = useState(true);
     const [sending, setSending] = useState(false);
     const [trading, setTrading] = useState(false);

     useEffect(() => {
          if (!walletKeys) router.push("/");
     }, [walletKeys, router]);

     useEffect(() => {
          const fetchBalances = async () => {
               if (!walletKeys) return;
               setLoading(true);
               const [solBal, usdcBal] = await Promise.all([
                    getBalance(walletKeys.publicKey),
                    getUSDCBalance(walletKeys.publicKey),
               ]);
               setBalance(solBal);
               setUsdcBalance(usdcBal);
               setLoading(false);
          };

          fetchBalances();
          const interval = setInterval(fetchBalances, 15000);
          return () => clearInterval(interval);
     }, [walletKeys]);

     useEffect(() => {
          const fetchQuote = async () => {
               if (!tradeAmount || !walletKeys) {
                    setEstimatedUsdc(null);
                    return;
               }

               const amountNum = parseFloat(tradeAmount);
               if (amountNum <= 0 || isNaN(amountNum)) {
                    setEstimatedUsdc(null);
                    return;
               }

               if (balance !== null && amountNum > balance) {
                    setEstimatedUsdc(null);
                    return;
               }

               setLoadingQuote(true);
               try {
                    const quote = await getSwapQuote(amountNum);
                    if (quote) {

                         const usdcAmount = parseFloat(quote.outputAmount) / 1e6;
                         setEstimatedUsdc(usdcAmount);
                    } else {
                         setEstimatedUsdc(null);
                    }
               } catch (error) {
                    console.error("Error fetching quote:", error);
                    setEstimatedUsdc(null);
               } finally {
                    setLoadingQuote(false);
               }
          };

          const timeoutId = setTimeout(fetchQuote, 500);
          return () => clearTimeout(timeoutId);
     }, [tradeAmount, balance, walletKeys]);

     if (!walletKeys) return null;

     const handleCopy = () => {
          navigator.clipboard.writeText(walletKeys.publicKey);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
     };

     const handleSend = async () => {
          if (!recipient.trim() || !amount || parseFloat(amount) <= 0) {
               return;
          }

          const amountNum = parseFloat(amount);

          if (balance === null || amountNum > balance) {
               return;
          }

          try {
               setSending(true);

               const keypair = reconstructKeypair(walletKeys.keypairData);

               const result = await sendSOL(keypair, recipient, amountNum);

               if (result.success) {
                    alert(`✓ Transaction successful!\nSignature: ${result.signature}`);
                    setRecipient("");
                    setAmount("");
                    setMode("view");
                    const [newBalance, newUsdcBalance] = await Promise.all([
                         getBalance(walletKeys.publicKey),
                         getUSDCBalance(walletKeys.publicKey),
                    ]);
                    setBalance(newBalance);
                    setUsdcBalance(newUsdcBalance);
               }
          } catch (err) {
          } finally {
               setSending(false);
          }
     };

     const handleTrade = async () => {
          if (!tradeAmount || parseFloat(tradeAmount) <= 0) {
               return;
          }

          const amountNum = parseFloat(tradeAmount);

          if (balance === null || amountNum > balance) {
               return;
          }

          try {
               setTrading(true);

               const keypair = reconstructKeypair(walletKeys.keypairData);

               const result = await executeSwap(keypair, amountNum);

               if (result.success) {
                    alert(`✓ Trade successful!\nSignature: ${result.signature}`);
                    setTradeAmount("");
                    setMode("view");
                    const [newBalance, newUsdcBalance] = await Promise.all([
                         getBalance(walletKeys.publicKey),
                         getUSDCBalance(walletKeys.publicKey),
                    ]);
                    setBalance(newBalance);
                    setUsdcBalance(newUsdcBalance);
               }
          } catch (err) {
               // Silently handle errors
          } finally {
               setTrading(false);
          }
     };

     const shortAddress = walletKeys.publicKey.slice(0, 8) + "..." + walletKeys.publicKey.slice(-8);

     return (
          <div className="min-h-screen bg-white">
               <header className="border-b border-gray-200 px-4 py-4">
                    <div className="max-w-4xl mx-auto flex justify-between items-center">
                         <h1 className="text-2xl font-bold text-gray-900">Dan's Solana Wallet</h1>
                         <a href="/" className="px-4 py-2 rounded border border-gray-900 text-gray-900 hover:bg-gray-50 transition-colors">
                              Exit
                         </a>
                    </div>
               </header>

               <div className="max-w-2xl mx-auto px-4 py-12">
                    {mode === "view" && (
                         <div className="space-y-8">
                              <div className="text-center">
                                   <p className="text-gray-600 mb-2">Total Balance</p>
                                   <p className="text-7xl font-bold text-gray-900 mb-2">
                                        {loading ? "..." : balance?.toFixed(2) || "0.00"}
                                   </p>
                                   <p className="text-2xl text-gray-600">SOL</p>
                              </div>

                              <div className="text-center">
                                   <p className="text-gray-600 mb-2">USDC Balance</p>
                                   <p className="text-4xl font-bold text-gray-900 mb-2">
                                        {loading ? "..." : usdcBalance?.toFixed(2) || "0.00"}
                                   </p>
                                   <p className="text-xl text-gray-600">USDC</p>
                              </div>

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

                              <div className="grid grid-cols-3 gap-4">
                                   <button
                                        onClick={() => setMode("send")}
                                        className="px-6 py-3 rounded-lg border border-gray-900 text-gray-900 font-semibold hover:bg-gray-50 transition-colors"
                                   >
                                        Send
                                   </button>
                                   <button
                                        onClick={() => setMode("trade")}
                                        className="px-6 py-3 rounded-lg border border-gray-900 text-gray-900 font-semibold hover:bg-gray-50 transition-colors"
                                   >
                                        Trade
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
                                   }}
                                   className="text-gray-900 font-semibold hover:text-gray-600"
                              >
                                   ← Back
                              </button>
                              <h2 className="text-3xl font-bold text-gray-900">Send Tokens</h2>

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

                    {mode === "trade" && (
                         <div className="space-y-6">
                              <button
                                   onClick={() => {
                                        setMode("view");
                                   }}
                                   className="text-gray-900 font-semibold hover:text-gray-600"
                              >
                                   ← Back
                              </button>
                              <h2 className="text-3xl font-bold text-gray-900">Trade SOL for USDC</h2>

                              <div className="space-y-4">
                                   <div>
                                        <label className="block text-sm text-gray-600 mb-2">
                                             Amount to trade (SOL)
                                        </label>
                                        <input
                                             type="number"
                                             placeholder="0.00"
                                             value={tradeAmount}
                                             onChange={(e) => setTradeAmount(e.target.value)}
                                             className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-gray-900"
                                             disabled={trading}
                                             step="0.01"
                                             min="0"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                             Available: {balance?.toFixed(4) || "0.00"} SOL
                                        </p>
                                   </div>
                                   <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                        <p className="text-sm text-gray-600 mb-1">You will receive approximately:</p>
                                        <p className="text-lg font-semibold text-gray-900">
                                             {loadingQuote
                                                  ? "Calculating..."
                                                  : estimatedUsdc !== null
                                                       ? estimatedUsdc.toFixed(2)
                                                       : "0.00"}{" "}
                                             USDC
                                        </p>

                                   </div>
                                   <button
                                        onClick={handleTrade}
                                        disabled={trading}
                                        className="w-full px-6 py-3 rounded-lg border border-gray-900 text-gray-900 font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                   >
                                        {trading ? "Trading..." : "Trade SOL for USDC"}
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
