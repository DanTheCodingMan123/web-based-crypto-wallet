"use client";

import { useRouter } from "next/navigation";

export default function Home() {
     const router = useRouter();

     const handleCreateWallet = () => {
          router.push("/wallet");
     };

     return (
          <div className="min-h-screen bg-white flex items-center justify-center">
               <main className="flex flex-col items-center justify-center gap-8 px-8 text-center max-w-2xl">
                    <div className="space-y-4">
                         <h1 className="text-5xl font-bold text-gray-900 tracking-tight">
                              Dan's Crypto Web Wallet
                         </h1>
                         <p className="text-xl text-gray-600 leading-relaxed">
                              A simple web wallet on the Solana blockchain.
                         </p>
                         <p className="text-xl text-gray-600 leading-relaxed">
                              My application for Cornell Blockchain head of engineering!
                         </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full py-8 border-t border-b border-gray-200">
                         <div className="flex flex-col items-center gap-2">
                              <h3 className="font-semibold text-gray-900">Create Secure Keys</h3>
                         </div>
                         <div className="flex flex-col items-center gap-2">
                              <h3 className="font-semibold text-gray-900">Send & Receive Tokens</h3>
                         </div>
                         <div className="flex flex-col items-center gap-2">
                              <h3 className="font-semibold text-gray-900">Trade</h3>
                         </div>
                    </div>

                    <button
                         onClick={handleCreateWallet}
                         className="bg-black text-white px-8 py-3 rounded-lg font-semibold text-lg hover:bg-gray-800 transition-colors duration-200 w-full md:w-auto"
                    >
                         Create Wallet
                    </button>

                    <p className="text-sm text-gray-500 pt-4">
                         Your private keys are generated using the ED25519 cryptography algorithm.
                    </p>
               </main>
          </div>
     );
}
