"use client"

import { useState, useEffect } from "react"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { useAccount, useReadContract, useWriteContract } from "wagmi"
import { formatUnits, parseAbiItem } from "viem"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"

// ✅ import helper untuk RPC dan decoder
import { fetchTransactionData, somniaClient } from "@/lib/somniaClient"
import { tryDecodeErc20Log, tryDecodeErc721Log } from "@/lib/decodeHelpers"

// ABI minimal untuk ERC20
const erc20Abi = [
  parseAbiItem("function name() view returns (string)"),
  parseAbiItem("function symbol() view returns (string)"),
  parseAbiItem("function decimals() view returns (uint8)"),
  parseAbiItem("function totalSupply() view returns (uint256)"),
  parseAbiItem("function balanceOf(address) view returns (uint256)"),
  parseAbiItem("function transfer(address to, uint256 value) returns (bool)"),
] as const

export default function Page() {
  const [tab, setTab] = useState<"tx" | "contract" | "verify" | "interact">("tx")
  const [txHash, setTxHash] = useState("")
  const [contractAddr, setContractAddr] = useState("")
  const [logs, setLogs] = useState<any[]>([])
  const [watching, setWatching] = useState(false)
  const [gasHistory, setGasHistory] = useState<any[]>([])

  const { address, isConnected } = useAccount()

  const [tokenInfo, setTokenInfo] = useState({
    name: "",
    symbol: "",
    decimals: 0,
    totalSupply: "",
  })

  // ✅ State untuk Address Profile
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null)
  const [balance, setBalance] = useState<string>("")

  // ✅ State untuk Verify Contract
  const [verifyContractAddr, setVerifyContractAddr] = useState("")
  const [sourceCode, setSourceCode] = useState("")
  const [compilerVersion, setCompilerVersion] = useState("0.8.20")
  const [optimization, setOptimization] = useState(false)
  const [runs, setRuns] = useState("200")
  const [license, setLicense] = useState("MIT")
  const [verificationStatus, setVerificationStatus] = useState<"idle" | "verifying" | "success" | "failed">("idle")

  // ✅ State untuk Interact Contract
  const [interactAddress, setInteractAddress] = useState("")
  const [transferTo, setTransferTo] = useState("")
  const [transferAmount, setTransferAmount] = useState("")

  // ✅ Fetch balance jika modal terbuka
  useEffect(() => {
    if (!selectedAddress) return
    ;(async () => {
      try {
        const bal = await somniaClient.getBalance({
          address: selectedAddress as `0x${string}`,
        })
        setBalance(formatUnits(bal, 18))
      } catch (err) {
        console.error("Failed to fetch balance", err)
      }
    })()
  }, [selectedAddress])

  // ✅ Ambil data transaksi real dari Somnia
  const handleLoadFromTx = async () => {
    setLogs([])
    if (!txHash) {
      alert("Please enter a transaction hash")
      return
    }

    try {
      const { tx, receipt, logs: fetchedLogs } = await fetchTransactionData(txHash)

      if (!tx && !receipt) {
        alert("Transaction not found on Somnia Testnet.")
        return
      }

      // simpan gas fee ke chart
      if (receipt && receipt.effectiveGasPrice && receipt.gasUsed) {
        const gasFee = Number(receipt.effectiveGasPrice) * Number(receipt.gasUsed)
        setGasHistory((prev) => [
          ...prev,
          {
            tx: txHash.slice(0, 8) + "...",
            gasFee: gasFee / 1e18,
          },
        ])
      }

      const normalized = (fetchedLogs || []).map((l: any) => {
        const decodedErc20 = tryDecodeErc20Log({ topics: l.topics, data: l.data })
        const decodedErc721 = tryDecodeErc721Log({ topics: l.topics, data: l.data })
        const decoded = decodedErc20 || decodedErc721
        const eventName = decoded
          ? decoded.name
          : l.topics && l.topics[0]
          ? l.topics[0].slice(0, 10)
          : "log"
        return {
          blockNumber: Number(l.blockNumber ?? l.block_number ?? 0),
          tx: l.transactionHash ?? txHash,
          address: l.address,
          event: eventName,
          args: decoded ? decoded.args : { topics: l.topics, data: l.data },
        }
      })

      setLogs(normalized)
    } catch (err) {
      console.error("fetch tx error", err)
      alert("Failed to fetch transaction: " + String(err))
    }
  }

  // ✅ Real-time contract monitoring dari Somnia
  useEffect(() => {
    if (!watching || !contractAddr) return
    let cancelled = false
    let latestSeen = new Set<string>()

    async function poll() {
      try {
        // 🔥 Ambil info token ERC20
        try {
          const [name, symbol, decimals, totalSupply] = await Promise.all([
            somniaClient.readContract({
              address: contractAddr as `0x${string}`,
              abi: [parseAbiItem("function name() view returns (string)")],
              functionName: "name",
            }),
            somniaClient.readContract({
              address: contractAddr as `0x${string}`,
              abi: [parseAbiItem("function symbol() view returns (string)")],
              functionName: "symbol",
            }),
            somniaClient.readContract({
              address: contractAddr as `0x${string}`,
              abi: [parseAbiItem("function decimals() view returns (uint8)")],
              functionName: "decimals",
            }),
            somniaClient.readContract({
              address: contractAddr as `0x${string}`,
              abi: [parseAbiItem("function totalSupply() view returns (uint256)")],
              functionName: "totalSupply",
            }),
          ])

          setTokenInfo({
            name: String(name),
            symbol: String(symbol),
            decimals: Number(decimals),
            totalSupply: formatUnits(totalSupply as bigint, Number(decimals)),
          })
        } catch (e) {
          console.warn("not ERC20 or failed fetching token info", e)
        }

        const head = await somniaClient.getBlockNumber()
        const from = BigInt(Math.max(Number(head) - 50, 0))
        const to = BigInt(head)

        const fetched = await somniaClient.getLogs({
          address: contractAddr as `0x${string}`,
          fromBlock: from,
          toBlock: to,
        })

        const mapped = fetched.map((l: any) => {
          const key = `${l.transactionHash}:${l.logIndex ?? l.log_index ?? 0}`
          return { __key: key, raw: l }
        })

        const newOnes = mapped.filter((m) => !latestSeen.has(m.__key))

        if (newOnes.length > 0) {
          newOnes.forEach((m) => latestSeen.add(m.__key))
          const normalized = newOnes.map((m) => {
            const l = m.raw
            const decodedErc20 = tryDecodeErc20Log({ topics: l.topics, data: l.data })
            const decodedErc721 = tryDecodeErc721Log({ topics: l.topics, data: l.data })
            const decoded = decodedErc20 || decodedErc721
            return {
              blockNumber: Number(l.blockNumber),
              tx: l.transactionHash,
              address: l.address,
              event: decoded
                ? decoded.name
                : l.topics && l.topics[0]
                ? l.topics[0].slice(0, 10)
                : "log",
              args: decoded ? decoded.args : { topics: l.topics, data: l.data },
            }
          })
          setLogs((prev) => [...normalized, ...prev].slice(0, 200))
        }
      } catch (e) {
        console.error("poll logs err", e)
      } finally {
        if (!cancelled) setTimeout(poll, 5000)
      }
    }

    poll()

    return () => {
      cancelled = true
    }
  }, [watching, contractAddr])

  // ✅ Fungsi untuk verifikasi kontrak (mock untuk demo)
  const handleVerifyContract = async () => {
    if (!isConnected) {
      alert("Please connect your wallet first!")
      return
    }

    if (!verifyContractAddr || !sourceCode) {
      alert("Please fill in contract address and source code")
      return
    }

    setVerificationStatus("verifying")
    try {
      // Mock verification process
      await new Promise((resolve) => setTimeout(resolve, 2000)) // Simulasi delay
      setVerificationStatus("success")
      setInteractAddress(verifyContractAddr) // Set address for interaction after verification
      alert("Contract verified successfully!")
    } catch (err) {
      console.error("Verification failed", err)
      setVerificationStatus("failed")
      alert("Contract verification failed")
    }
  }

  // ✅ Read Contract Data
  const { data: name } = useReadContract({
    address: interactAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: "name",
  })
  const { data: symbol } = useReadContract({
    address: interactAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: "symbol",
  })
  const { data: decimals } = useReadContract({
    address: interactAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: "decimals",
  })
  const { data: totalSupply } = useReadContract({
    address: interactAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: "totalSupply",
  })
  const { data: userBalance } = useReadContract({
    address: interactAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address as `0x${string}`],
  })

  // ✅ Write Contract (Transfer)
  const { writeContract } = useWriteContract()
  const handleTransfer = async () => {
    if (!transferTo || !transferAmount) {
      alert("Please fill in both recipient address and amount")
      return
    }
    try {
      await writeContract({
        address: interactAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: "transfer",
        args: [transferTo as `0x${string}`, BigInt(transferAmount * 10 ** (decimals || 0))],
      })
      alert("Transfer initiated! Check transaction status.")
    } catch (err) {
      console.error("Transfer failed", err)
      alert("Transfer failed")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200">
      <header className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-xl">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex justify-between items-center">
            {/* 🔥 Logo kiri klik untuk refresh */}
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-3 hover:opacity-90 transition"
            >
              <div className="w-10 h-10 bg-emerald-700/30 rounded-xl flex items-center justify-center text-xl backdrop-blur-sm border border-emerald-400/30 shadow-md">
                <span className="text-white">⚡</span>
              </div>
              <h1 className="text-2xl font-bold text-white">Somnia Dev Dashboard</h1>
            </button>
  
            {/* 🔥 Wallet Connect dengan shadow */}
            <div className="shadow-lg rounded-xl overflow-hidden transition hover:shadow-emerald-400/50 hover:shadow-xl">
              <ConnectButton />
            </div>
          </div>
  
          <div className="mt-4 bg-emerald-700/20 backdrop-blur-sm rounded-xl px-4 py-3 border border-emerald-400/30">
            <div
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${
                isConnected ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
              }`}
            >
              <span>{isConnected ? "🟢" : "🔴"}</span>
              <span>{isConnected ? `Connected as ${address}` : "Not connected"}</span>
            </div>
          </div>
        </div>
      </header>  

      {/* 🔥 UI */} 
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setTab("tx")}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
              tab === "tx"
                ? "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg transform -translate-y-0.5"
                : "bg-white text-slate-700 border-2 border-slate-200 hover:border-emerald-500 hover:bg-slate-50"
            }`}
          >
            🔍 Transaction Inspector
          </button>
          <button
            onClick={() => setTab("contract")}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
              tab === "contract"
                ? "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg transform -translate-y-0.5"
                : "bg-white text-slate-700 border-2 border-slate-200 hover:border-emerald-500 hover:bg-slate-50"
            }`}
          >
            🏗️ Contract Inspector
          </button>
          <button
            onClick={() => setTab("verify")}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
              tab === "verify"
                ? "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg transform -translate-y-0.5"
                : "bg-white text-slate-700 border-2 border-slate-200 hover:border-emerald-500 hover:bg-slate-50"
            }`}
          >
            ✅ Verify Contract
          </button>
          <button
            onClick={() => setTab("interact")}
            disabled={!verificationStatus === "success" || !interactAddress}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
              tab === "interact" && verificationStatus === "success" && interactAddress
                ? "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg transform -translate-y-0.5"
                : "bg-gray-300 text-gray-500 border-2 border-gray-200 cursor-not-allowed"
            }`}
          >
            📝 Read/Write Contract
          </button>
        </div>

        {/* Transaction Tab */}
        {tab === "tx" && (
          <>
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-100 mb-8">
              <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                🔍 Transaction Inspector
              </h2>
              <div className="flex gap-4 flex-wrap">
                <input
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  placeholder="Enter transaction hash (0x...)"
                  className="flex-1 min-w-80 px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 bg-slate-50 focus:bg-white transition-all text-slate-700 placeholder-slate-500"
                />
                <button
                  onClick={handleLoadFromTx}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-xl font-semibold hover:shadow-lg hover:transform hover:-translate-y-0.5 transition-all duration-300"
                >
                  🔎 Analyze Transaction
                </button>
              </div>
            </div>

            {/* Gas Fee Chart */}
            {gasHistory.length > 0 && (
              <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-100 mb-8">
                <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                  📊 Gas Fee History
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={gasHistory}>
                    <XAxis dataKey="tx" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="gasFee" stroke="#10b981" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}

        {/* Contract Tab */}
        {tab === "contract" && (
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-100 mb-8">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-3">
              🏗️ Contract Inspector (Real-time)
            </h2>
            <div className="flex gap-4 flex-wrap mb-6">
              <input
                value={contractAddr}
                onChange={(e) => setContractAddr(e.target.value)}
                placeholder="Enter contract address (0x...)"
                className="flex-1 min-w-80 px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 bg-slate-50 focus:bg-white transition-all text-slate-700 placeholder-slate-500"
              />
              {!watching ? (
                <button
                  onClick={() => {
                    setLogs([])
                    setWatching(true)
                  }}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-xl font-semibold hover:shadow-lg hover:transform hover:-translate-y-0.5 transition-all duration-300"
                >
                  ▶️ Start Monitoring
                </button>
              ) : (
                <button
                  onClick={() => setWatching(false)}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl font-semibold hover:shadow-lg hover:transform hover:-translate-y-0.5 transition-all duration-300"
                >
                  ⏹️ Stop Monitoring
                </button>
              )}
            </div>

            {/* Token Info */}
            {tokenInfo.name && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6">
                <h3 className="text-lg font-bold text-emerald-700 mb-4 flex items-center gap-2">
                  📊 Token Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <div className="text-xs font-semibold text-emerald-600 uppercase">Name</div>
                    <div className="text-sm font-semibold text-slate-800">{tokenInfo.name}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-emerald-600 uppercase">Symbol</div>
                    <div className="text-sm font-semibold text-slate-800">{tokenInfo.symbol}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-emerald-600 uppercase">Decimals</div>
                    <div className="text-sm font-semibold text-slate-800">{tokenInfo.decimals}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-emerald-600 uppercase">Total Supply</div>
                    <div className="text-sm font-semibold text-slate-800">
                      {tokenInfo.totalSupply} {tokenInfo.symbol}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Verify Contract Tab */}
        {tab === "verify" && (
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-100 mb-8">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-3">
              ✅ Contract Verification
            </h2>
            {!isConnected ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4 opacity-50">🔒</div>
                <div className="text-lg font-medium text-slate-600 mb-4">
                  Please connect your wallet to verify a contract.
                </div>
                <div className="shadow-lg rounded-xl overflow-hidden transition hover:shadow-emerald-400/50 hover:shadow-xl w-fit mx-auto">
                  <ConnectButton />
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex gap-4 flex-wrap">
                  <input
                    value={verifyContractAddr}
                    onChange={(e) => setVerifyContractAddr(e.target.value)}
                    placeholder="Enter contract address (0x...)"
                    className="flex-1 min-w-80 px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 bg-slate-50 focus:bg-white transition-all text-slate-700 placeholder-slate-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-2 block">
                    Source Code (Solidity)
                  </label>
                  <textarea
                    value={sourceCode}
                    onChange={(e) => setSourceCode(e.target.value)}
                    placeholder="// Paste your Solidity source code here"
                    className="w-full h-48 px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 bg-slate-50 focus:bg-white transition-all text-slate-700 placeholder-slate-500 font-mono text-sm"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-slate-700 mb-2 block">
                      Compiler Version
                    </label>
                    <select
                      value={compilerVersion}
                      onChange={(e) => setCompilerVersion(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 bg-slate-50 focus:bg-white transition-all text-slate-700"
                    >
                      <option value="0.8.20">0.8.20</option>
                      <option value="0.8.19">0.8.19</option>
                      <option value="0.8.18">0.8.18</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-700 mb-2 block">
                      Optimization
                    </label>
                    <select
                      value={optimization ? "enabled" : "disabled"}
                      onChange={(e) => setOptimization(e.target.value === "enabled")}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 bg-slate-50 focus:bg-white transition-all text-slate-700"
                    >
                      <option value="enabled">Enabled</option>
                      <option value="disabled">Disabled</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-700 mb-2 block">
                      Optimization Runs
                    </label>
                    <input
                      value={runs}
                      onChange={(e) => setRuns(e.target.value)}
                      placeholder="200"
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 bg-slate-50 focus:bg-white transition-all text-slate-700"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-2 block">
                    License
                  </label>
                  <select
                    value={license}
                    onChange={(e) => setLicense(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 bg-slate-50 focus:bg-white transition-all text-slate-700"
                  >
                    <option value="MIT">MIT</option>
                    <option value="GPL-3.0">GPL-3.0</option>
                    <option value="Apache-2.0">Apache-2.0</option>
                    <option value="None">None</option>
                  </select>
                </div>
                <button
                  onClick={handleVerifyContract}
                  disabled={verificationStatus === "verifying"}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                    verificationStatus === "verifying"
                      ? "bg-gray-400 text-white cursor-not-allowed"
                      : "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white hover:shadow-lg hover:transform hover:-translate-y-0.5"
                  }`}
                >
                  {verificationStatus === "verifying" ? "Verifying..." : "✅ Verify Contract"}
                </button>
                {verificationStatus === "success" && (
                  <div className="bg-green-100 text-green-800 px-4 py-2 rounded-xl mt-4">
                    Contract verified successfully!
                  </div>
                )}
                {verificationStatus === "failed" && (
                  <div className="bg-red-100 text-red-800 px-4 py-2 rounded-xl mt-4">
                    Contract verification failed. Please check your inputs.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Interact Contract Tab */}
        {tab === "interact" && verificationStatus === "success" && interactAddress && (
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-100 mb-8">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-3">
              📝 Read/Write Contract
            </h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-700 mb-2">Read Contract Data</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-slate-600">Name</div>
                    <div className="text-lg font-bold text-emerald-600">{name || "Loading..."}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-600">Symbol</div>
                    <div className="text-lg font-bold text-emerald-600">{symbol || "Loading..."}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-600">Decimals</div>
                    <div className="text-lg font-bold text-emerald-600">{decimals?.toString() || "Loading..."}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-600">Total Supply</div>
                    <div className="text-lg font-bold text-emerald-600">
                      {totalSupply ? formatUnits(totalSupply, decimals || 0) : "Loading..."}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-600">Your Balance</div>
                    <div className="text-lg font-bold text-emerald-600">
                      {userBalance ? formatUnits(userBalance, decimals || 0) : "Loading..."}
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-700 mb-2">Write Contract (Transfer)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    value={transferTo}
                    onChange={(e) => setTransferTo(e.target.value)}
                    placeholder="Recipient address (0x...)"
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 bg-slate-50 focus:bg-white transition-all text-slate-700 placeholder-slate-500"
                  />
                  <input
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder="Amount"
                    type="number"
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 bg-slate-50 focus:bg-white transition-all text-slate-700 placeholder-slate-500"
                  />
                </div>
                <button
                  onClick={handleTransfer}
                  className="mt-4 flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-xl font-semibold hover:shadow-lg hover:transform hover:-translate-y-0.5 transition-all duration-300"
                >
                  🚀 Transfer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Event Logs */}
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3">📜 Event Logs</h2>
            {logs.length > 0 && (
              <span className="bg-emerald-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                {logs.length} events
              </span>
            )}
          </div>

          {logs.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4 opacity-50">📭</div>
              <div className="text-lg font-medium text-slate-600">
                No events found yet.{" "}
                {tab === "tx" ? "Enter a transaction hash to analyze." : "Start monitoring a contract to see real-time events."}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-50 to-slate-100">
                    <th className="text-left p-4 font-bold text-slate-700">Block</th>
                    <th className="text-left p-4 font-bold text-slate-700">Transaction</th>
                    <th className="text-left p-4 font-bold text-slate-700">Event</th>
                    <th className="text-left p-4 font-bold text-slate-700">Arguments</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, idx) => (
                    <tr
                      key={idx}
                      className={`border-b border-slate-100 hover:bg-slate-50 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}
                    >
                      <td className="p-4">
                        <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded border text-slate-700">
                          #{log.blockNumber}
                        </span>
                      </td>
                      <td className="p-4 flex items-center gap-2">
                        <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded border text-slate-700">
                          {log.tx.slice(0, 10)}...
                        </span>
                        <a
                          href={`https://shannon-explorer.somnia.network/tx/${log.tx}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-600 hover:underline"
                          title="View on Explorer"
                        >
                          🔗
                        </a>
                        <button
                          onClick={() => navigator.clipboard.writeText(log.tx)}
                          className="text-slate-500 hover:text-slate-800"
                          title="Copy transaction hash"
                        >
                        </button>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            log.event === "Transfer"
                              ? "bg-green-100 text-green-800"
                              : log.event === "Approval"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {log.event}
                        </span>
                      </td>
                      <td className="p-4 max-w-xs">
                        <div className="text-slate-700">
                          {log.args && Object.keys(log.args).length > 0
                            ? Object.entries(log.args).map(([k, v]) => (
                                <div
                                  key={k}
                                  className="mb-1 p-1 bg-slate-50 rounded text-xs text-slate-700 cursor-pointer hover:bg-emerald-50"
                                  onClick={() => setSelectedAddress(v.toString())}
                                  title="Click to view profile"
                                >
                                  <strong className="text-slate-800">{k}:</strong> {v.toString()}
                                </div>
                              ))
                            : "–"}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* ✅ Modal Address Profile */}
      {selectedAddress && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800">Address Profile</h3>
              <button
                onClick={() => setSelectedAddress(null)}
                className="text-slate-500 hover:text-slate-800"
              >
                ❌
              </button>
            </div>
            <p className="font-mono text-sm break-all mb-4">{selectedAddress}</p>
            <div className="bg-slate-50 rounded-xl p-4 border text-slate-700">
              <div className="text-xs font-semibold text-slate-500 uppercase">Balance</div>
              <div className="text-lg font-bold text-emerald-600">{balance || "Loading..."} STT</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}