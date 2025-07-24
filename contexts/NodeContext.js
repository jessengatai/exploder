import { createContext, useContext, useState, useEffect } from 'react'

const NodeContext = createContext()

export function NodeProvider({ children }) {
  const [nodeInfo, setNodeInfo] = useState(null)

  useEffect(() => {
    const fetchNodeInfo = async () => {
      try {
        const config = await fetch('/config.json').then(res => res.json())
        
        // Get chain ID
        const chainIdRes = await fetch(config.rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_chainId',
            params: [],
            id: 1
          })
        })
        const chainIdData = await chainIdRes.json()
        const chainId = chainIdData.result ? parseInt(chainIdData.result, 16) : null

        // Get latest block
        const latestBlockRes = await fetch(config.rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_blockNumber',
            params: [],
            id: 2
          })
        })
        const latestBlockData = await latestBlockRes.json()
        const latestBlock = latestBlockData.result ? parseInt(latestBlockData.result, 16) : 0

        // Determine fork info
        let forkInfo = null
        if (chainId === 1) {
          forkInfo = 'Ethereum Mainnet'
        } else if (chainId === 8453) {
          forkInfo = 'Base'
        } else if (chainId === 137) {
          forkInfo = 'Polygon'
        } else if (chainId === 42161) {
          forkInfo = 'Arbitrum'
        } else if (chainId === 10) {
          forkInfo = 'Optimism'
        } else if (chainId === 56) {
          forkInfo = 'BNB Chain'
        } else if (chainId === 31337) {
          forkInfo = 'Hardhat Local'
        }

        setNodeInfo({ chainId, latestBlock, forkInfo })
      } catch {
        setNodeInfo({ chainId: 1337, latestBlock: 0, forkInfo: null })
      }
    }
    
    fetchNodeInfo()
  }, [])

  return (
    <NodeContext.Provider value={nodeInfo}>
      {children}
    </NodeContext.Provider>
  )
}

export function useNode() {
  return useContext(NodeContext)
} 