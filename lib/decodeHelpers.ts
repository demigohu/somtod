// lib/decodeHelpers.ts
import { Interface } from "ethers"

const erc20Abi = [
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
]

const erc721Abi = [
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
]

const erc20Iface = new Interface(erc20Abi)
const erc721Iface = new Interface(erc721Abi)

/**
 * Try decode ERC-20 event
 */
export function tryDecodeErc20Log(log: { topics: string[]; data: string }) {
  try {
    const parsed = erc20Iface.parseLog(log)
    return { name: parsed.name, args: parsed.args }
  } catch {
    return null
  }
}

/**
 * Try decode ERC-721 event
 */
export function tryDecodeErc721Log(log: { topics: string[]; data: string }) {
  try {
    const parsed = erc721Iface.parseLog(log)
    return { name: "NFT Transfer", args: parsed.args }
  } catch {
    return null
  }
}
