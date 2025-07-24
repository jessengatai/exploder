import { createContext, useContext, useState, useEffect, useRef } from 'react'

const BlockchainContext = createContext()

export function BlockchainProvider({ children }) {
  const [blocks, setBlocks] = useState([])
  const [transactions, setTransactions] = useState([])
  const [transactionStatuses, setTransactionStatuses] = useState({})
  const [logs, setLogs] = useState([])
  const [rpcUrl, setRpcUrl] = useState('http://localhost:8545')
  const [isInitialized, setIsInitialized] = useState(false)
  const wsRef = useRef(null)
  const processing = useRef(new Set())
  const validatedTransactions = useRef(new Set())

  const addLog = (message, type = 'info') => {
    const logEntry = {
      id: Date.now() + Math.random(),
      message,
      type,
      timestamp: Date.now()
    }
    setLogs(prev => [logEntry, ...prev.slice(0, 49)]) // Keep last 50 logs
  }

  useEffect(() => {
    fetch('/config.json')
      .then(res => res.json())
      .then(config => setRpcUrl(config.rpcUrl))
      .catch(() => setRpcUrl('http://localhost:8545'))
      .then(() => {
        addLog('Blockchain context initialized', 'system')
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
      if (result.result) {
        const status = result.result.status === '0x1' ? 'success' : 'failed'
        setTransactionStatuses(prev => ({
          ...prev,
          [txHash]: status
        }))
        
        if (status === 'failed') {
          addLog(`Transaction ${txHash.slice(0, 8)}... failed`, 'error')
        } else {
          addLog(`Transaction ${txHash.slice(0, 8)}... succeeded`, 'success')
        }
      } else {
      }
    } catch (error) {
      addLog(`Error checking transaction status: ${error.message}`, 'error')
    }
  }

  const fetchRecentData = async () => {
    try {
      addLog('Fetching recent blockchain data', 'info')
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
          const blockTimestamp = parseInt(block.timestamp, 16) * 1000
          const transactionsWithTimestamp = block.transactions.map(tx => ({
            ...tx,
            timestamp: blockTimestamp
          }))
          allTransactions.push(...transactionsWithTimestamp)
          block.transactions.forEach(tx => {
            if (tx.hash && tx.from && tx.to) {
              validatedTransactions.current.add(tx.hash)
            }
          })
        }
      }
      
      // Check status for all transactions
      allTransactions.forEach(tx => {
        if (tx.hash) {
          setTimeout(() => checkTransactionStatus(tx.hash), 1000)
        }
      })
      
      setTransactions(allTransactions.slice(0, 20))
      setIsInitialized(true)
      addLog(`Loaded ${recentBlocks.length} blocks and ${allTransactions.length} transactions`, 'success')
    } catch (error) {
      addLog(`Error fetching recent data: ${error.message}`, 'error')
    }
  }

  const setupWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close()
    }
    
    const wsUrl = rpcUrl.replace('http', 'ws')
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws
    
    ws.onopen = () => {
      addLog('WebSocket connected to node', 'success')
      ws.send(JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_subscribe',
        params: ['newHeads']
      }))
      
      // Subscribe to pending transactions
      ws.send(JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'eth_subscribe',
        params: ['newPendingTransactions']
      }))
    }

    ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data)
        
        if (data.method === 'eth_subscription' && data.params.subscription) {
          if (data.params.result && typeof data.params.result === 'string') {
            // Pending transaction
            const txHash = data.params.result
            addLog(`New pending transaction: ${txHash.slice(0, 8)}...`, 'pending')
          } else if (data.params.result && data.params.result.number) {
            // New block
            const block = data.params.result
            addLog(`New block mined: #${parseInt(block.number, 16)}`, 'block')
            await updateBlock(block)
          }
        }
      } catch (error) {
        addLog(`WebSocket error: ${error.message}`, 'error')
      }
    }

    ws.onerror = (error) => {
      addLog('WebSocket connection error', 'error')
    }

    ws.onclose = () => {
      addLog('WebSocket connection closed', 'warning')
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
        const blockTimestamp = parseInt(validatedBlock.timestamp, 16) * 1000
        const completeTransactions = validatedBlock.transactions
          .filter(tx => tx.hash && tx.from && tx.to && tx.value !== undefined)
          .map(tx => ({
            ...tx,
            timestamp: blockTimestamp
          }))
        
        completeTransactions.forEach(tx => {
          validatedTransactions.current.add(tx.hash)
          setTimeout(() => checkTransactionStatus(tx.hash), 1000)
        })
        
        setTransactions(prev => {
          const newTxs = completeTransactions.filter(tx => 
            !prev.find(existing => existing.hash === tx.hash)
          )
          return [...newTxs, ...prev.slice(0, 19 - newTxs.length)]
        })
        
        addLog(`Block #${parseInt(validatedBlock.number, 16)} contains ${completeTransactions.length} transactions`, 'info')
      }
    } catch (error) {
      addLog(`Error updating block: ${error.message}`, 'error')
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
      logs,
      addLog,
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