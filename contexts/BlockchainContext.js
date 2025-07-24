import { createContext, useContext, useState, useEffect, useRef } from 'react'

const BlockchainContext = createContext()

export function BlockchainProvider({ children }) {
  const [blocks, setBlocks] = useState([])
  const [transactions, setTransactions] = useState([])
  const [rpcUrl, setRpcUrl] = useState('http://localhost:8545')
  const wsRef = useRef(null)
  const processing = useRef(new Set())

  useEffect(() => {
    fetch('/config.json')
      .then(res => res.json())
      .then(config => setRpcUrl(config.rpcUrl))
      .catch(() => setRpcUrl('http://localhost:8545'))
      .then(() => {
        fetchRecentData()
        setupWebSocket()
      })
  }, [])

  const fetchRecentData = async () => {
    try {
      const latestBlockRes = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_blockNumber',
          params: []
        })
      })
      const latestBlockData = await latestBlockRes.json()
      const latestBlockNum = parseInt(latestBlockData.result, 16)
      
      const blockPromises = []
      for (let i = 0; i < 10 && latestBlockNum - i >= 0; i++) {
        blockPromises.push(
          fetch(rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              method: 'eth_getBlockByNumber',
              params: [`0x${(latestBlockNum - i).toString(16)}`, true]
            })
          }).then(res => res.json())
        )
      }
      
      const blockResults = await Promise.all(blockPromises)
      const recentBlocks = blockResults
        .map(result => result.result)
        .filter(block => block)
        .reverse()
      
      setBlocks(recentBlocks)
      
      const allTransactions = []
      for (const block of recentBlocks) {
        if (block.transactions && block.transactions.length > 0) {
          allTransactions.push(...block.transactions)
        }
      }
      setTransactions(allTransactions.slice(0, 20))
    } catch (error) {
      console.error('Error fetching recent data:', error)
    }
  }

  const setupWebSocket = () => {
    const ws = new WebSocket(rpcUrl.replace('http', 'ws'))
    wsRef.current = ws
    
    ws.onopen = () => {
      ws.send(JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_subscribe',
        params: ['newHeads']
      }))
    }

    ws.onmessage = async (event) => {
      const data = JSON.parse(event.data)
      if (data.method === 'eth_subscription' && data.params.subscription) {
        const block = data.params.result
        await updateBlock(block)
      }
    }

    return () => ws.close()
  }

  const updateBlock = async (blockData) => {
    if (processing.current.has(blockData.hash)) return
    processing.current.add(blockData.hash)
    
    try {
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_getBlockByNumber',
          params: [blockData.number, true]
        })
      })
      const result = await response.json()
      
      if (!result.result || !result.result.hash) return
      
      const validatedBlock = result.result
      
      setBlocks(prev => {
        const existing = prev.find(b => b.hash === validatedBlock.hash)
        if (existing) {
          return prev.map(b => b.hash === validatedBlock.hash ? validatedBlock : b)
        } else {
          return [validatedBlock, ...prev.slice(0, 9)]
        }
      })
      
      if (validatedBlock.transactions && validatedBlock.transactions.length > 0) {
        setTransactions(prev => {
          const newTxs = validatedBlock.transactions.filter(tx => 
            !prev.find(existing => existing.hash === tx.hash)
          )
          return [...newTxs, ...prev.slice(0, 19 - newTxs.length)]
        })
      }
    } finally {
      processing.current.delete(blockData.hash)
    }
  }

  return (
    <BlockchainContext.Provider value={{ blocks, transactions, rpcUrl }}>
      {children}
    </BlockchainContext.Provider>
  )
}

export function useBlockchain() {
  return useContext(BlockchainContext)
} 