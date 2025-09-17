# Somnia Dev Dashboard

![Somnia Dev Dashboard](public/zzz.png)

## 📋 Description

**Somnia Dev Dashboard** is a professional web application for blockchain transaction inspection and smart contract analysis on the Somnia Network. This application provides an intuitive interface for developers and blockchain users to analyze, monitor, and interact with smart contracts on Somnia Testnet.

## ✨ Key Features

### 🔍 Transaction Inspector
- **Real-time Transaction Analysis**: Enter transaction hash to view complete details
- **Decode Event Logs**: Automatically decode ERC-20 and ERC-721 events
- **Gas Fee Tracking**: Visualize gas fee history with interactive charts
- **Explorer Integration**: Direct links to Somnia Explorer

### 🏗️ Contract Inspector
- **Real-time Monitoring**: Monitor contracts in real-time with automatic polling
- **Token Information**: Display ERC-20 token information (name, symbol, decimals, total supply)
- **Event Streaming**: Stream event logs from monitored contracts
- **Address Profiling**: Click addresses to view profile and balance

### ✅ Contract Verification
- **Source Code Verification**: Verify contracts with Solidity source code
- **Compiler Options**: Support for various compiler versions (0.8.18, 0.8.19, 0.8.20)
- **Optimization Settings**: Configure optimization and runs
- **License Management**: License options (MIT, GPL-3.0, Apache-2.0)

### 📝 Contract Interaction
- **Read Functions**: Read contract data (name, symbol, decimals, total supply, balance)
- **Write Functions**: Interact with contracts (ERC-20 transfer)
- **Wallet Integration**: Connect wallet through RainbowKit
- **Transaction Management**: Manage transactions with real-time feedback

## 🛠️ Technologies Used

### Frontend
- **Next.js 14.2.16** - React framework with App Router
- **TypeScript** - Type safety and developer experience
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible UI components
- **Recharts** - Chart library for data visualization

### Blockchain Integration
- **Wagmi** - React hooks for Ethereum
- **RainbowKit** - Wallet connection UI
- **Viem** - TypeScript interface for Ethereum
- **Ethers.js** - Library for blockchain interaction

### Development Tools
- **ESLint** - Code linting
- **PostCSS** - CSS processing
- **Vercel Analytics** - Analytics and monitoring

## 🚀 Installation and Setup

### Prerequisites
- Node.js 18+ 
- npm or pnpm
- Browser wallet (MetaMask, WalletConnect, etc.)

### 1. Clone Repository
```bash
git clone <repository-url>
cd somtod-fixed
```

### 2. Install Dependencies
```bash
npm install
# or
pnpm install
```

### 3. Environment Variables
Create `.env.local` file in root directory:
```env
# WalletConnect Project ID (get from https://cloud.walletconnect.com/)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# Optional: Notification services
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id
DISCORD_WEBHOOK_URL=your_discord_webhook_url
```

### 4. Run Development Server
```bash
npm run dev
# or
pnpm dev
```

Application will run at `http://localhost:3000`

### 5. Build for Production
```bash
npm run build
npm start
```

## 🌐 Network Configuration

Application is configured for **Somnia Testnet**:

- **Chain ID**: 50312
- **RPC URL**: https://dream-rpc.somnia.network
- **Explorer**: https://explorer.somnia.network
- **Native Token**: STT (Somnia Test Token)
- **Decimals**: 18

## 📱 How to Use

### 1. Connect Wallet
- Click "Connect Wallet" button in header
- Select supported wallet (MetaMask, WalletConnect, etc.)
- Approve connection in your wallet

### 2. Analyze Transaction
- Select "🔍 Transaction Inspector" tab
- Enter transaction hash (0x...)
- Click "🔎 Analyze Transaction"
- View transaction details and event logs

### 3. Monitor Contract
- Select "🏗️ Contract Inspector" tab
- Enter contract address (0x...)
- Click "▶️ Start Monitoring"
- View real-time events and token information

### 4. Verify Contract
- Select "✅ Verify Contract" tab
- Enter contract address and source code
- Configure compiler settings
- Click "✅ Verify Contract"

### 5. Interact with Contract
- After successful verification, select "📝 Read/Write Contract" tab
- Read contract data (name, symbol, balance, etc.)
- Perform ERC-20 token transfer

## 🏗️ Project Structure

```
somtod-fixed/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout with providers
│   ├── page.tsx           # Main dashboard page
│   ├── providers.tsx      # Wallet and query providers
│   └── globals.css        # Global styles
├── components/            # Reusable components
│   ├── ui/               # Radix UI components
│   └── theme-provider.tsx
├── lib/                  # Utility libraries
│   ├── somniaClient.ts   # Blockchain client setup
│   ├── decodeHelpers.ts  # Event log decoders
│   ├── notifier.ts       # Notification services
│   └── utils.ts          # General utilities
├── public/               # Static assets
│   ├── zzz.png          # Application logo
│   └── favicon.png       # App icon
└── scripts/              # Utility scripts
    └── monitor.ts        # Monitoring script
```

## 🔧 Configuration

### WalletConnect Setup
1. Register at [WalletConnect Cloud](https://cloud.walletconnect.com/)
2. Create new project
3. Copy Project ID to environment variables
4. Configure allowed domains

### Custom Network (Optional)
To use another network, edit `app/providers.tsx`:

```typescript
export const customChain: Chain = {
  id: YOUR_CHAIN_ID,
  name: "Your Network",
  nativeCurrency: {
    name: "Your Token",
    symbol: "YTK",
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ["YOUR_RPC_URL"] },
  },
  blockExplorers: {
    default: {
      name: "Your Explorer",
      url: "YOUR_EXPLORER_URL",
    },
  },
  testnet: true,
};
```

## 🚨 Troubleshooting

### Common Issues

**1. Wallet Connection Failed**
- Ensure wallet is installed
- Check network in wallet (must be Somnia Testnet)
- Refresh page and try again

**2. Transaction Not Found**
- Ensure transaction hash is valid
- Check if transaction exists on Somnia Testnet
- Ensure RPC endpoint is active

**3. Contract Interaction Failed**
- Ensure wallet is connected
- Check STT balance for gas fees
- Ensure contract address is valid

**4. Build Errors**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

## 🤝 Contributing

1. Fork repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Create Pull Request

## 📄 License

This project uses MIT license. See `LICENSE` file for details.

## 🔗 Links

- **Somnia Network**: https://somnia.network
- **Somnia Explorer**: https://explorer.somnia.network
- **Documentation**: https://docs.somnia.network
- **Discord**: https://discord.gg/somnia

## 👨‍💻 Developer

Made with ❤️ for the Somnia Network community

---

**Note**: This application is specifically designed for Somnia Testnet. Please ensure you use testnet for development and testing.
