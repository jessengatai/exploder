import Head from 'next/head'
import { useState, useEffect, useRef } from 'react'
import AddressIcon from '../components/AddressIcon'
import { Check, ExternalLink, Square, ArrowLeftRight, Box, X } from 'lucide-react'
import Card from '../components/ui/Card'
import TimeAgo from '../components/ui/TimeAgo'
import TextLink from '../components/ui/TextLink'
import ListBlocks from '../components/Lists/ListBlocks'
import ListTransactions from '../components/Lists/ListTransactions'
import { getTransactionFailureReason } from '../utils/nodeDetector'

export default function Home() {
  const [blocks, setBlocks] = useState([])
  const [transactions, setTransactions] = useState([])
  const [rpcUrl, setRpcUrl] = useState('http://localhost:8545')
  const [transactionDetails, setTransactionDetails] = useState({})
  const [transactionStatuses, setTransactionStatuses] = useState({})
  const [transactionFailures, setTransactionFailures] = useState({})
  const checkedTransactions = useRef(new Set())

  useEffect(() => {
    fetch('/config.json')
      .then(res => res.json())
      .then(config => {
        setRpcUrl(config.rpcUrl)
      })
      .catch(() => {
        setRpcUrl('http://localhost:8545')
      })
      .then(() => {
        // Fetch recent blocks and transactions
        fetchRecentData()
      })

    const fetchRecentData = async () => {
      try {
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
        
        // Fetch last 10 blocks
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
        
        // Get transactions from these blocks
        const allTransactions = []
        for (const block of recentBlocks) {
          if (block.transactions && block.transactions.length > 0) {
            allTransactions.push(...block.transactions)
          }
        }
        setTransactions(allTransactions.slice(0, 20))
        
        // Check transaction statuses (only for recent transactions)
        allTransactions.slice(0, 5).forEach(tx => {
          if (tx.hash) {
            checkTransactionStatus(tx.hash)
          }
        })
        
        // Analyze transactions for values and token transfers
        analyzeTransactions(allTransactions.slice(0, 20), rpcUrl)
      } catch (error) {
        console.error('Error fetching recent data:', error)
      }
    }

    const ws = new WebSocket(rpcUrl.replace('http', 'ws'))
    
    ws.onopen = () => {
      // Subscribe to new blocks
      ws.send(JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_subscribe',
        params: ['newHeads']
      }))
      
      // Subscribe to new transactions
      ws.send(JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'eth_subscribe',
        params: ['newPendingTransactions']
      }))
    }

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.method === 'eth_subscription') {
        if (data.params.subscription) {
          const block = data.params.result
          setBlocks(prev => [block, ...prev.slice(0, 9)])
          
          // Update transaction details when block is mined
          if (block.transactions && block.transactions.length > 0) {
            setTransactions(prev => {
              const updated = [...prev]
              block.transactions.forEach(blockTx => {
                const existingIndex = updated.findIndex(tx => tx.hash === blockTx.hash)
                if (existingIndex !== -1) {
                  // Update with full transaction details from block
                  updated[existingIndex] = {
                    ...updated[existingIndex],
                    ...blockTx,
                    blockNumber: parseInt(block.number, 16)
                  }
                }
              })
              return updated
            })
            
            // Check status for transactions in this block (only if we have them)
            block.transactions.forEach(tx => {
              if (tx.hash && transactions.find(t => t.hash === tx.hash)) {
                // Only check status for transactions we're already tracking
                setTimeout(() => checkTransactionStatus(tx.hash), 1000)
              }
            })
          }
        } else if (data.params.result) {
          const txHash = data.params.result
          // Get full transaction details
          fetch(rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              method: 'eth_getTransactionByHash',
              params: [txHash]
            })
          })
          .then(res => res.json())
          .then(result => {
            if (result.result && result.result.hash) {
              const tx = result.result
              // Add transaction even if some fields are missing initially
              // They will be populated when the transaction is mined
              setTransactions(prev => {
                // Don't add if already exists
                if (!prev.find(t => t.hash === tx.hash)) {
                  return [tx, ...prev.slice(0, 9)]
                }
                return prev
              })
              
              // Check transaction status (only for pending transactions we care about)
              if (transactions.length < 10) {
                checkTransactionStatus(tx.hash)
              }
            }
          })
          .catch(error => {
            console.error('Error fetching transaction details:', error)
          })
        }
      }
    }

    return () => ws.close()
  }, [rpcUrl])

  // Create chronological list with blocks and their transactions
  const allItems = []
  
  // Add blocks with their transactions
  blocks.forEach(block => {
    // Add the block itself
    allItems.push({
      ...block,
      type: 'block',
      timestamp: parseInt(block.timestamp, 16) * 1000
    })
    
    // Add transactions from this block
    if (block.transactions && block.transactions.length > 0) {
      block.transactions.forEach(tx => {
        allItems.push({
          ...tx,
          type: 'transaction',
          blockNumber: parseInt(block.number, 16),
          timestamp: parseInt(block.timestamp, 16) * 1000
        })
      })
    }
  })
  
  // Add standalone transactions (from pending pool)
  transactions.forEach(tx => {
    if (!allItems.find(item => item.type === 'transaction' && item.hash === tx.hash)) {
      allItems.push({
        ...tx,
        type: 'transaction',
        timestamp: Date.now()
      })
    }
  })
  
  // Sort by timestamp (newest first)
  allItems.sort((a, b) => b.timestamp - a.timestamp)
  const displayItems = allItems.slice(0, 50)
  




  const analyzeTransactions = async (txs, url) => {
    const details = {}
    
    for (const tx of txs) {
      // Validate transaction data
      if (!tx || !tx.hash) continue
      
      let ethValue = '0.0000'
      let displayValue = '0.0000 ETH'
      
      // Safely parse ETH value
      if (tx.value && tx.value !== '0x') {
        try {
          const parsedValue = parseInt(tx.value, 16)
          if (!isNaN(parsedValue)) {
            ethValue = (parsedValue / 1e18).toFixed(4)
            displayValue = `${ethValue} ETH`
          }
        } catch (error) {
          console.error('Error parsing transaction value:', error)
        }
      }
      
      // Check if this is a token transfer
      if (tx.input && tx.input !== '0x' && tx.input.length > 10) {
        const methodId = tx.input.substring(0, 10)
        
        if (methodId === '0xa9059cbb' || methodId === '0x23b872dd') {
          try {
            const tokenInfo = await getTokenInfo(tx.to, url)
            if (tokenInfo) {
              const amount = methodId === '0xa9059cbb' 
                ? parseInt(tx.input.substring(74), 16)
                : parseInt(tx.input.substring(138), 16)
              const formattedAmount = (amount / Math.pow(10, tokenInfo.decimals)).toFixed(4)
              displayValue = `${formattedAmount} ${tokenInfo.symbol}`
            }
          } catch (error) {
            console.error('Error analyzing token transfer:', error)
          }
        }
      }
      
      details[tx.hash] = { displayValue, ethValue }
    }
    
    setTransactionDetails(details)
  }

  const getTokenInfo = async (tokenAddress, url) => {
    try {
      // Get token symbol
      const symbolRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_call',
          params: [{
            to: tokenAddress,
            data: '0x95d89b41' // symbol()
          }, 'latest']
        })
      })
      const symbolData = await symbolRes.json()
      
      // Get token decimals
      const decimalsRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'eth_call',
          params: [{
            to: tokenAddress,
            data: '0x313ce567' // decimals()
          }, 'latest']
        })
      })
      const decimalsData = await decimalsRes.json()
      
      if (symbolData.result && symbolData.result !== '0x') {
        return {
          symbol: decodeString(symbolData.result),
          decimals: decimalsData.result ? parseInt(decimalsData.result, 16) : 18
        }
      }
    } catch (error) {
      console.error('Error getting token info:', error)
    }
    return null
  }

  const decodeString = (hexString) => {
    try {
      const hex = hexString.slice(2)
      let str = ''
      for (let i = 0; i < hex.length; i += 2) {
        const charCode = parseInt(hex.substr(i, 2), 16)
        if (charCode === 0) break
        str += String.fromCharCode(charCode)
      }
      return str
    } catch (error) {
      return 'Unknown'
    }
  }

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
        
        // If transaction failed, get failure reason
        if (status === 'failed') {
          const failureReason = await getTransactionFailureReason(rpcUrl, txHash)
          if (failureReason) {
            setTransactionFailures(prev => ({
              ...prev,
              [txHash]: failureReason
            }))
          }
        }
      } else {
        // Retry after 2 seconds for transactions without receipts
        setTimeout(() => checkTransactionStatus(txHash), 2000)
      }
    } catch (error) {
      console.error('Error checking transaction status:', error)
    }
  }

  return (
    <>
      <Head>
        <title>Exploder - Ethereum Block Scanner</title>
        <meta name="description" content="Self-hosted Ethereum block scanner for local development" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Blocks Card */}
          <Card>
            <h2 className="text-xl font-bold mb-4">Recent Blocks</h2>
            <ListBlocks blocks={displayItems.filter(item => item.type === 'block').slice(0, 10)} />
          </Card>

          {/* Transactions Card */}
          <Card>
            <h2 className="text-xl font-bold mb-4">Recent Transactions</h2>
            <ListTransactions 
              transactions={displayItems.filter(item => item.type === 'transaction').slice(0, 10)}
              transactionStatuses={transactionStatuses}
              transactionDetails={transactionDetails}
            />
          </Card>

          {/* Contracts Card */}
          <Card>
            <h2 className="text-xl font-bold mb-4">Recent Contracts</h2>
            <div className="space-y-3">
              <div className="text-center py-8 text-gray-400">
                Contract activity coming soon...
              </div>
            </div>
          </Card>
        </div>
    </>
  )
} 