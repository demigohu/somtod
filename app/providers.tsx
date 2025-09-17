"use client";

import "@rainbow-me/rainbowkit/styles.css";
import {
  getDefaultConfig,
  RainbowKitProvider,
} from "@rainbow-me/rainbowkit";
import { WagmiProvider, Chain } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// 🔹 Definisi Somnia Testnet
export const somniaTestnet: Chain = {
  id: 50312,
  name: "Somnia Testnet",
  nativeCurrency: {
    name: "Somnia Test Token",
    symbol: "STT",
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ["https://dream-rpc.somnia.network"] },
    public: { http: ["https://dream-rpc.somnia.network"] },
  },
  blockExplorers: {
    default: {
      name: "Somnia Explorer",
      url: "https://explorer.somnia.network",
    },
  },
  testnet: true,
  // opsional → kalau punya link logo
  // iconUrl: "https://somnia.network/logo.png",
};

// 🔹 RainbowKit Config
const config = getDefaultConfig({
  appName: "Somnia Dev Dashboard",
  projectId: "0e0f865f2e43c787cf6610f5f80fe5f1", // project ID kamu
  chains: [somniaTestnet],
  ssr: true,
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
