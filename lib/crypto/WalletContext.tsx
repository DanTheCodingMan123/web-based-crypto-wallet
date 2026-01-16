"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { WalletKeys } from "./keypair";

interface WalletContextType {
     walletKeys: WalletKeys | null;
     setWalletKeys: (keys: WalletKeys) => void;
     clearWallet: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: ReactNode }> = ({
     children,
}) => {
     const [walletKeys, setWalletKeys] = useState<WalletKeys | null>(null);

     const clearWallet = () => {
          setWalletKeys(null);
     };

     return (
          <WalletContext.Provider value={{ walletKeys, setWalletKeys, clearWallet }}>
               {children}
          </WalletContext.Provider>
     );
};

export const useWallet = () => {
     const context = useContext(WalletContext);
     if (!context) {
          throw new Error("useWallet must be used within WalletProvider");
     }
     return context;
};
