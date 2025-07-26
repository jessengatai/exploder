import { createContext, useContext, useState, useEffect, useRef } from 'react'

/**
 * BlockchainContext - Centralized state management for blockchain data
 * 
 * This context provides real-time blockchain data including:
 * - Recent blocks and transactions
 * - Transaction statuses (success/failed)
 * - Application logs
 * - WebSocket connection management
 * 
 * The context handles both initial data loading and real-time updates
 * via WebSocket subscriptions to new blocks and pending transactions.
 */
const BlockchainContext = createContext()

export function BlockchainProvider({ children }) {
  // State for blockchain data
  const [blocks, setBlocks] = useState([])                    // Recent blocks (last 10)
  const [transactions, setTransactions] = useState([])        // Recent transactions (last 10)
  const [transactionStatuses, setTransactionStatuses] = useState({})  // Success/failed status by tx hash
  const [logs, setLogs] = useState([])                        // Application event logs
  const [contracts, setContracts] = useState([])              // Deployed contracts (last 10)
  const [rpcUrl, setRpcUrl] = useState('http://localhost:8545') // Node RPC endpoint
  const [isInitialized, setIsInitialized] = useState(false)   // Whether initial data is loaded
  
  // Refs for preventing duplicate processing and tracking state
  const wsRef = useRef(null)                                  // WebSocket connection reference
  const processing = useRef(new Set())                       // Track blocks being processed to prevent duplicates
  const validatedTransactions = useRef(new Set())            // Track transactions that have been validated
  const loggedEvents = useRef(new Set())                     // Track logged events to prevent duplicates

  /**
   * Add a log entry to the application logs
   * Prevents duplicate log entries using eventKey tracking
   * 
   * @param {string} message - The log message
   * @param {string} type - Log type: 'info', 'success', 'error', 'warning', 'pending', 'block', 'system'
   */
  const addLog = (message, type = 'info') => {
    const eventKey = `${message}-${type}`
    
    // Check if we've already logged this exact event
    if (loggedEvents.current.has(eventKey)) {
      return
    }
    
    loggedEvents.current.add(eventKey)
    
    // Clean up loggedEvents if it gets too large (keep last 1000 events)
    if (loggedEvents.current.size > 1000) {
      const eventsArray = Array.from(loggedEvents.current)
      loggedEvents.current = new Set(eventsArray.slice(-500))
    }
    
    setLogs(prev => {
      const logEntry = {
        id: Date.now() + Math.random(),
        message,
        type,
        timestamp: Date.now()
      }
      return [logEntry, ...prev.slice(0, 49)] // Keep last 50 logs
    })
  }

  /**
   * Initialize the blockchain context
   * Loads configuration, fetches initial data, and sets up WebSocket
   */
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

  /**
   * Check the status of a specific transaction
   * Fetches transaction receipt and updates status in state
   * 
   * @param {string} txHash - Transaction hash to check
   */
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
        // Transaction receipt not found (might be pending)
      }
    } catch (error) {
      addLog(`Error checking transaction status: ${error.message}`, 'error')
    }
  }

  /**
   * Fetch recent blockchain data on initial load
   * Gets the last 10 blocks and their transactions
   */
  const fetchRecentData = async () => {
    try {
      addLog('Fetching recent blockchain data', 'info')
      
      // Get latest block number
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
      
      // Fetch last 10 blocks in parallel
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
        .reverse() // Oldest to newest
      
      setBlocks(recentBlocks)
      
      // Extract all transactions from blocks and add timestamps
      const allTransactions = []
      for (const block of recentBlocks) {
        if (block.transactions && block.transactions.length > 0) {
          const blockTimestamp = parseInt(block.timestamp, 16) * 1000
          const transactionsWithTimestamp = block.transactions.map(tx => ({
            ...tx,
            timestamp: blockTimestamp
          }))
          allTransactions.push(...transactionsWithTimestamp)
          
          // Mark transactions as validated (have complete data)
          // Include contract deployments (tx.to is null) and regular transactions
          block.transactions.forEach(tx => {
            if (tx.hash && tx.from) {
              validatedTransactions.current.add(tx.hash)
              // Check for contract deployments in initial data
              checkForContractDeployment(tx)
            }
          })
        }
      }
      
      setTransactions(allTransactions.slice(0, 10))
      setIsInitialized(true)
      addLog(`Loaded ${recentBlocks.length} blocks and ${allTransactions.length} transactions`, 'success')
    } catch (error) {
      addLog(`Error fetching recent data: ${error.message}`, 'error')
    }
  }

  /**
   * Set up WebSocket connection for real-time updates
   * Subscribes to new blocks and pending transactions
   */
  const setupWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close()
    }
    
    const wsUrl = rpcUrl.replace('http', 'ws')
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws
    
    ws.onopen = () => {
      addLog('WebSocket connected to node', 'success')
      
      // Subscribe to new blocks
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
            // Pending transaction notification
            const txHash = data.params.result
            addLog(`New pending transaction: ${txHash.slice(0, 8)}...`, 'pending')
          } else if (data.params.result && data.params.result.number) {
            // New block notification
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

  /**
   * Update blockchain data when a new block is received
   * Fetches complete block data and processes transactions
   * 
   * @param {Object} blockData - Block header data from WebSocket
   */
  const updateBlock = async (blockData) => {
    // Prevent duplicate processing of the same block
    if (processing.current.has(blockData.hash)) {
      return
    }
    processing.current.add(blockData.hash)
    
    try {
      // Fetch complete block data including transactions
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
      
      // Update blocks list
      setBlocks(prev => {
        const existing = prev.find(b => b.hash === validatedBlock.hash)
        if (existing) {
          // Update existing block with complete data
          return prev.map(b => b.hash === validatedBlock.hash ? validatedBlock : b)
        } else {
          // Add new block to the beginning
          return [validatedBlock, ...prev.slice(0, 9)]
        }
      })
      
      // Process transactions in the block
      if (validatedBlock.transactions && validatedBlock.transactions.length > 0) {
        const blockTimestamp = parseInt(validatedBlock.timestamp, 16) * 1000
        
        // Filter for complete transactions (have all required fields)
        // Include contract deployments (tx.to is null) and regular transactions
        const completeTransactions = validatedBlock.transactions
          .filter(tx => tx.hash && tx.from && tx.value !== undefined)
          .map(tx => ({
            ...tx,
            timestamp: blockTimestamp
          }))
        
        // Mark transactions as validated and check their status
        completeTransactions.forEach(tx => {
          validatedTransactions.current.add(tx.hash)
          checkTransactionStatus(tx.hash)
          // Check for contract deployments
          checkForContractDeployment(tx)
        })
        
        // Update transactions list
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

  /**
   * Filter transactions to only include those that have been validated
   * (have complete data from block)
   */
  const validatedTransactionsList = transactions.filter(tx => 
    validatedTransactions.current.has(tx.hash)
  )

  /**
   * Check if a transaction is a contract deployment
   * If so, fetch the contract address and add it to the contracts list
   */
  const checkForContractDeployment = async (tx) => {
    // Check for contract deployment: tx.to is null/undefined and has input data
    if ((tx.to === null || tx.to === undefined) && tx.input && tx.input !== '0x' && tx.input.length > 2) {
      try {
        const response = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'eth_getTransactionReceipt',
            params: [tx.hash]
          })
        })
        const result = await response.json()
        
        if (result.result && result.result.status === '0x1' && result.result.contractAddress) {
          const contractInfo = {
            address: result.result.contractAddress,
            deployer: tx.from,
            transactionHash: tx.hash,
            blockNumber: parseInt(result.result.blockNumber, 16),
            timestamp: tx.timestamp || Date.now()
          }
          
          addContract(contractInfo)
        }
      } catch (error) {
        addLog(`Error checking contract deployment: ${error.message}`, 'error')
      }
    }
  }

  /**
   * Add a contract to the contracts list
   * Prevents duplicate contracts and maintains a list of the last 10
   */
  const addContract = (contractInfo) => {
    setContracts(prev => {
      // Check if contract already exists
      if (!prev.find(c => c.address === contractInfo.address)) {
        addLog(`Contract deployed: ${contractInfo.address.slice(0, 8)}...`, 'success')
        return [contractInfo, ...prev.slice(0, 9)]
      }
      return prev
    })
  }

  return (
    <BlockchainContext.Provider value={{ 
      blocks, 
      transactions: validatedTransactionsList, 
      transactionStatuses,
      logs,
      contracts,
      addLog,
      addContract,
      rpcUrl,
      isInitialized 
    }}>
      {children}
    </BlockchainContext.Provider>
  )
}

/**
 * Hook to access blockchain context data
 * @returns {Object} Blockchain context data and functions
 */
export function useBlockchain() {
  return useContext(BlockchainContext)
} 