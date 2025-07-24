import { createContext, useContext, useState, useEffect, useRef } from 'react'

const BlockchainContext = createContext()

export function BlockchainProvider({ children }) {
  const [blocks, setBlocks] = useState([])
  const [transactions, setTransactions] = useState([])
  const [transactionStatuses, setTransactionStatuses] = useState({})
  const [rpcUrl, setRpcUrl] = useState('http://localhost:8545')
  const [isInitialized, setIsInitialized] = useState(false)
  const wsRef = useRef(null)
  const processing = useRef(new Set())
  const validatedTransactions = useRef(new Set())

  useEffect(() => {
    fetch('/config.json')
      .then(res => res.json())
      .then(config => setRpcUrl(config.rpcUrl))
      .catch(() => setRpcUrl('http://localhost:8545'))
      .then(() => {
        fetchRecentData()
        setupWebSocket()
      })

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])

  const checkTransactionStatus = async (txHash) => {
    try {
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_getTransactionReceipt',
          params: [txHash]
        })
      })
      const result = await response.json()
      console.log('Transaction receipt for', txHash, ':', result)
      if (result.result) {
        const status = result.result.status === '0x1' ? 'success' : 'failed'
        console.log('Setting status for', txHash, 'to:', status)
        setTransactionStatuses(prev => ({
          ...prev,
          [txHash]: status
        }))
      } else {
        console.log('No receipt found for', txHash)
      }
    } catch (error) {
      console.error('Error checking transaction status:', error)
    }
  }

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
          block.transactions.forEach(tx => {
            if (tx.hash && tx.from && tx.to) {
              validatedTransactions.current.add(tx.hash)
            }
          })
        }
      }
      
      // Check status for recent transactions (first 5)
      const recentTxs = allTransactions.slice(0, 5)
      recentTxs.forEach(tx => {
        if (tx.hash) {
          setTimeout(() => checkTransactionStatus(tx.hash), 1000)
        }
      })
      setTransactions(allTransactions.slice(0, 20))
      setIsInitialized(true)
    } catch (error) {
      console.error('Error fetching recent data:', error)
    }
  }

  const setupWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close()
    }
    
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
      try {
        const data = JSON.parse(event.data)
        
        if (data.method === 'eth_subscription' && data.params.subscription) {
          const block = data.params.result
          await updateBlock(block)
        }
      } catch (error) {
        console.error('Error processing websocket message:', error)
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    ws.onclose = () => {
      console.log('WebSocket closed')
    }
  }

  const updateBlock = async (blockData) => {
    if (processing.current.has(blockData.hash)) {
      return
    }
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
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (!result.result || !result.result.hash) {
        return
      }
      
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
        const completeTransactions = validatedBlock.transactions.filter(tx => 
          tx.hash && tx.from && tx.to && tx.value !== undefined
        )
        
        completeTransactions.forEach(tx => {
          validatedTransactions.current.add(tx.hash)
          // Check transaction status after a delay
          setTimeout(() => checkTransactionStatus(tx.hash), 1000)
        })
        
        setTransactions(prev => {
          const newTxs = completeTransactions.filter(tx => 
            !prev.find(existing => existing.hash === tx.hash)
          )
          return [...newTxs, ...prev.slice(0, 19 - newTxs.length)]
        })
      }
    } catch (error) {
      console.error('Error updating block:', error)
    } finally {
      processing.current.delete(blockData.hash)
    }
  }

  const validatedTransactionsList = transactions.filter(tx => 
    validatedTransactions.current.has(tx.hash)
  )

  return (
    <BlockchainContext.Provider value={{ 
      blocks, 
      transactions: validatedTransactionsList, 
      transactionStatuses,
      rpcUrl,
      isInitialized 
    }}>
      {children}
    </BlockchainContext.Provider>
  )
}

export function useBlockchain() {
  return useContext(BlockchainContext)
} 