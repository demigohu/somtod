"use client"

import { useState, useEffect } from "react"
import { ethers } from "ethers"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { useAccount } from "wagmi"
import "./App.css" // Assuming you have a CSS file for styling

// ABI standar ERC20
const erc20Abi = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 value) returns (bool)",
  "function approve(address spender, uint256 value) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
]

function App() {
  const { address, isConnected } = useAccount()

  const [tab, setTab] = useState("tx") // "tx" | "contract"
  const [txHash, setTxHash] = useState("")
  const [contractAddr, setContractAddr] = useState("")
  const [logs, setLogs] = useState([])
  const [watching, setWatching] = useState(false)

  // Token Info State
  const [tokenInfo, setTokenInfo] = useState({
    name: "",
    symbol: "",
    decimals: 0,
    totalSupply: "",
  })

  const SOMNIA_RPC = "https://dream-rpc.somnia.network"
  const provider = new ethers.JsonRpcProvider(SOMNIA_RPC)

  // =============== Inspect Tx Hash ===============
  const handleLoadFromTx = async () => {
    setLogs([])
    try {
      const iface = new ethers.Interface(erc20Abi)
      const receipt = await provider.getTransactionReceipt(txHash)
      if (!receipt) {
        alert("Tx not found")
        return
      }
      const parsed = receipt.logs
        .filter((log) => !contractAddr || log.address.toLowerCase() === contractAddr.toLowerCase())
        .map((log) => {
          try {
            const parsedEvent = iface.parseLog(log)
            return {
              blockNumber: log.blockNumber,
              tx: log.transactionHash,
              event: parsedEvent.name,
              args: parsedEvent.args,
            }
          } catch {
            return {
              blockNumber: log.blockNumber,
              tx: log.transactionHash,
              event: "Unknown",
              args: {},
            }
          }
        })
      setLogs(parsed)
    } catch (err) {
      console.error("Load from Tx error:", err)
      alert("Failed to fetch Tx logs")
    }
  }

  // =============== Inspect Contract Addr Realtime + Token Info ===============
  useEffect(() => {
    if (!watching || !ethers.isAddress(contractAddr)) return
    const iface = new ethers.Interface(erc20Abi)

    const loadTokenInfo = async () => {
      try {
        const erc20 = new ethers.Contract(contractAddr, erc20Abi, provider)
        const name = await erc20.name()
        const symbol = await erc20.symbol()
        const decimals = await erc20.decimals()
        const totalSupply = await erc20.totalSupply()

        setTokenInfo({
          name,
          symbol,
          decimals,
          totalSupply: ethers.formatUnits(totalSupply, decimals),
        })
      } catch (err) {
        console.warn("Not a valid ERC20 contract or metadata fetch failed.")
        setTokenInfo({ name: "", symbol: "", decimals: 0, totalSupply: "" })
      }
    }

    loadTokenInfo()

    const interval = setInterval(async () => {
      try {
        const latestBlock = await provider.getBlockNumber()
        const fromBlock = latestBlock - 2000 > 0 ? latestBlock - 2000 : 0

        const fetched = await provider.getLogs({
          address: contractAddr,
          fromBlock,
          toBlock: latestBlock,
        })

        const parsed = fetched.map((log) => {
          try {
            const parsedEvent = iface.parseLog(log)
            return {
              blockNumber: log.blockNumber,
              tx: log.transactionHash,
              event: parsedEvent.name,
              args: parsedEvent.args,
            }
          } catch {
            return {
              blockNumber: log.blockNumber,
              tx: log.transactionHash,
              event: "Unknown",
              args: {},
            }
          }
        })

        if (parsed.length > 0) {
          setLogs((prev) => {
            const merged = [...prev]
            parsed.forEach((log) => {
              if (!merged.find((l) => l.tx === log.tx)) {
                merged.unshift(log)
              }
            })
            return merged.slice(0, 20) // simpan max 20 logs terakhir
          })
        }
      } catch (err) {
        console.error("Polling error:", err)
      }
    }, 8000)

    return () => clearInterval(interval)
  }, [watching, contractAddr])

  return (
    <div className="dashboard-container">
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <div className="logo-icon">⚡</div>
            <span>Somnia Dev Dashboard</span>
          </div>
          <ConnectButton />
        </div>
        <div className="connection-status">
          <div className={`status-badge ${isConnected ? "connected" : "disconnected"}`}>
            {isConnected ? (
              <>
                <span>🟢</span>
                Connected as {address?.slice(0, 6)}...{address?.slice(-4)}
              </>
            ) : (
              <>
                <span>🔴</span>
                Not connected
              </>
            )}
          </div>
        </div>
      </header>

      <main className="main-content">
        <div className="tabs-container">
          <button onClick={() => setTab("tx")} className={`tab-button ${tab === "tx" ? "active" : "inactive"}`}>
            <span>🔍</span>
            Inspect by Transaction Hash
          </button>
          <button
            onClick={() => setTab("contract")}
            className={`tab-button ${tab === "contract" ? "active" : "inactive"}`}
          >
            <span>🏗️</span>
            Inspect by Contract Address
          </button>
        </div>

        {tab === "tx" && (
          <div className="section-card">
            <h2 className="section-title">
              <span>🔍</span>
              Transaction Inspector
            </h2>
            <div className="input-group">
              <input
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                placeholder="Enter transaction hash (0x...)"
                className="input-field"
              />
              <button onClick={handleLoadFromTx} className="action-button primary">
                <span>🔎</span>
                Analyze Transaction
              </button>
            </div>
          </div>
        )}

        {tab === "contract" && (
          <div className="section-card">
            <h2 className="section-title">
              <span>🏗️</span>
              Contract Inspector (Real-time)
            </h2>
            <div className="input-group">
              <input
                value={contractAddr}
                onChange={(e) => setContractAddr(e.target.value)}
                placeholder="Enter contract address (0x...)"
                className="input-field"
              />
              {!watching ? (
                <button
                  onClick={() => {
                    setLogs([])
                    setWatching(true)
                  }}
                  className="action-button primary"
                >
                  <span>▶️</span>
                  Start Monitoring
                </button>
              ) : (
                <button onClick={() => setWatching(false)} className="action-button danger">
                  <span>⏹️</span>
                  Stop Monitoring
                </button>
              )}
            </div>

            {tokenInfo.name && (
              <div className="token-info-card">
                <h3 className="token-info-title">
                  <span>📊</span>
                  Token Information
                </h3>
                <div className="token-info-grid">
                  <div className="token-info-item">
                    <span className="token-info-label">Name</span>
                    <span className="token-info-value">{tokenInfo.name}</span>
                  </div>
                  <div className="token-info-item">
                    <span className="token-info-label">Symbol</span>
                    <span className="token-info-value">{tokenInfo.symbol}</span>
                  </div>
                  <div className="token-info-item">
                    <span className="token-info-label">Decimals</span>
                    <span className="token-info-value">{tokenInfo.decimals}</span>
                  </div>
                  <div className="token-info-item">
                    <span className="token-info-label">Total Supply</span>
                    <span className="token-info-value">
                      {tokenInfo.totalSupply} {tokenInfo.symbol}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="section-card">
          <h2 className="section-title">
            <span>📜</span>
            Event Logs
            {logs.length > 0 && (
              <span
                style={{
                  fontSize: "0.8rem",
                  background: "#10b981",
                  color: "white",
                  padding: "0.25rem 0.75rem",
                  borderRadius: "12px",
                  fontWeight: "600",
                }}
              >
                {logs.length} events
              </span>
            )}
          </h2>

          {logs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              <div className="empty-state-text">
                No events found yet.{" "}
                {tab === "tx"
                  ? "Enter a transaction hash to analyze."
                  : "Start monitoring a contract to see real-time events."}
              </div>
            </div>
          ) : (
            <div className="logs-table-container">
              <table className="logs-table">
                <thead>
                  <tr>
                    <th>Block</th>
                    <th>Transaction</th>
                    <th>Event</th>
                    <th>Arguments</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, idx) => (
                    <tr key={idx}>
                      <td>
                        <span className="hash-display">#{log.blockNumber}</span>
                      </td>
                      <td>
                        <span className="hash-display">{log.tx.slice(0, 10)}...</span>
                      </td>
                      <td>
                        <span
                          style={{
                            background:
                              log.event === "Transfer" ? "#dcfce7" : log.event === "Approval" ? "#fef3c7" : "#f3f4f6",
                            color:
                              log.event === "Transfer" ? "#059669" : log.event === "Approval" ? "#d97706" : "#374151",
                            padding: "0.25rem 0.75rem",
                            borderRadius: "12px",
                            fontSize: "0.85rem",
                            fontWeight: "600",
                          }}
                        >
                          {log.event}
                        </span>
                      </td>
                      <td className="event-args">
                        {log.args && Object.keys(log.args).length > 0
                          ? Object.entries(log.args).map(([k, v]) => (
                              <div key={k}>
                                <strong>{k}:</strong> {v.toString()}
                              </div>
                            ))
                          : "–"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default App
