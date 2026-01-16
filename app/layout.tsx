import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/lib/crypto/WalletContext";

const geistSans = Geist({
     variable: "--font-geist-sans",
     subsets: ["latin"],
});

const geistMono = Geist_Mono({
     variable: "--font-geist-mono",
     subsets: ["latin"],
});

export const metadata: Metadata = {
     title: "Solana Web Wallet",
     description: "Secure web-based wallet for Solana tokens",
};

export default function RootLayout({
     children,
}: Readonly<{
     children: React.ReactNode;
}>) {
     return (
          <html lang="en">
               <body
                    className={`${geistSans.variable} ${geistMono.variable} antialiased`}
               >
                    <WalletProvider>{children}</WalletProvider>
               </body>
          </html>
     );
}
