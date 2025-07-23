import { createContext, useContext, useState, useEffect } from 'react'

const NodeContext = createContext()

export function NodeProvider({ children }) {
  const [nodeInfo, setNodeInfo] = useState(null)

  useEffect(() => {
    const fetchNodeInfo = async () => {
      try {
        const config = await fetch('/config.json').then(res => res.json())
        const response = await fetch(config.rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_chainId',
            params: [],
            id: 1
          })
        })
        const data = await response.json()
        setNodeInfo({ chainId: parseInt(data.result, 16) })
      } catch {
        setNodeInfo({ chainId: 1337 })
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