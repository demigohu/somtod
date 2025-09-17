import { createPublicClient, http } from "viem";
import type { Chain } from "viem";
import { erc20Abi } from "viem"; // ✅ betul

export const somniaChain: Chain = {
  id: 50312,
  name: "Somnia Testnet",
  network: "somnia-testnet",
  nativeCurrency: {
    decimals: 18,
    name: "Somnia Test Token",
    symbol: "STT",
  },
  rpcUrls: {
    default: {
      http: ["https://dream-rpc.somnia.network"],
    },
    public: {
      http: ["https://dream-rpc.somnia.network"],
    },
  },
};

export const somniaClient = createPublicClient({
  chain: somniaChain,
  transport: http(),
});

// helper untuk fetch transaksi
export async function fetchTransactionData(hash: string) {
  try {
    const tx = await somniaClient.getTransaction({ hash: hash as `0x${string}` });
    const receipt = await somniaClient.getTransactionReceipt({ hash: hash as `0x${string}` });

    return {
      tx,
      receipt,
      logs: receipt?.logs || [],
    };
  } catch (e) {
    console.error("fetchTransactionData error", e);
    return { tx: null, receipt: null, logs: [] };
  }
}
