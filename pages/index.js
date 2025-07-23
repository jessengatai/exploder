import Head from 'next/head'
import { useState, useEffect } from 'react'
import { detectChainFromUrl } from '../utils/chainDetector'
import AddressIcon from '../components/AddressIcon'
import { Check, ExternalLink } from 'lucide-react'
import Card from '../components/ui/Card'
import AddressDisplay from '../components/ui/Address'
import TimeAgo from '../components/ui/TimeAgo'
import TextLink from '../components/ui/TextLink'

export default function Home() {
  const [blocks, setBlocks] = useState([])
  const [transactions, setTransactions] = useState([])
  const [rpcUrl, setRpcUrl] = useState('http://localhost:8545')
  const [chainInfo, setChainInfo] = useState(null)
  const [transactionDetails, setTransactionDetails] = useState({})

  useEffect(() => {
    fetch('/config.json')
      .then(res => res.json())
      .then(config => {
        setRpcUrl(config.rpcUrl)
        setChainInfo(detectChainFromUrl(config.rpcUrl))
      })
      .catch(() => {
        setRpcUrl('http://localhost:8545')
        setChainInfo(detectChainFromUrl('http://localhost:8545'))
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
        
        // Analyze transactions for values and token transfers
        analyzeTransactions(allTransactions.slice(0, 20), url)
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
              // Validate transaction data before adding
              const tx = result.result
              if (tx.from && tx.to && tx.value !== undefined) {
                setTransactions(prev => {
                  // Don't add if already exists
                  if (!prev.find(t => t.hash === tx.hash)) {
                    return [tx, ...prev.slice(0, 9)]
                  }
                  return prev
                })
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

  return (
    <div className="min-h-screen bg-black text-white">
      <Head>
        <title>Exploder - Ethereum Block Scanner</title>
        <meta name="description" content="Self-hosted Ethereum block scanner for local development" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Exploder</h1>
          <p className="text-xl text-gray-300 mb-2">Self-hosted Ethereum block scanner for local development</p>
          {chainInfo && (
            <div className="text-base text-gray-400">
              Connected to: <span className="text-blue-300">{chainInfo.name}</span>
              {chainInfo.chainId && ` (Chain ID: ${chainInfo.chainId})`}
            </div>
          )}
        </div>
        
        <Card>
          <h2 className="text-2xl font-bold mb-6">Recent Activity</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-base">
              <thead>
                <tr className="border-b border-gray-900">
                  <th className="text-left py-2">Function</th>
                  <th className="text-left py-2">Block</th>
                  <th className="text-left py-2">Block timestamp</th>
                  <th className="text-left py-2">Hash</th>
                  <th className="text-left py-2">From</th>
                  <th className="text-left py-2">To</th>
                  <th className="text-left py-2">Value</th>
                  <th className="text-left py-2">When</th>
                </tr>
              </thead>
              <tbody>
                {displayItems.map((item, i) => (
                  <tr key={i} className="border-b border-gray-900 hover:bg-gray-900/50">
                    <td className="py-4">
                      {item.type === 'block' ? (
                        <span className="px-2 py-1 text-base font-bold text-indigo-200 bg-indigo-900/50">
                          -
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-500" />
                          <span className="text-base font-bold text-emerald-200 bg-emerald-900/50 px-2 py-1">
                            transfer
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="py-4">
                      {item.type === 'block' ? parseInt(item.number, 16) : item.blockNumber || '-'}
                    </td>
                    <td className="py-4">
                      {item.timestamp ? new Date(item.timestamp).toLocaleString() : '-'}
                    </td>
                    <td className="py-4 font-mono text-base">
                      <TextLink href={`/${item.type === 'block' ? 'address' : 'trx'}?hash=${item.hash}`}>
                        {item.hash?.substring(0, 8)}...{item.hash?.substring(item.hash.length - 4)}
                      </TextLink>
                    </td>
                    <td className="py-4">
                      {item.type === 'transaction' && item.from ? (
                        <AddressDisplay address={item.from} />
                      ) : '-'}
                    </td>
                    <td className="py-4">
                      {item.type === 'transaction' && item.to ? (
                        <AddressDisplay address={item.to} />
                      ) : '-'}
                    </td>
                    <td className="py-4 text-base">
                      {item.type === 'transaction' && transactionDetails[item.hash] ? 
                        transactionDetails[item.hash].displayValue : 
                        (item.type === 'transaction' && item.value ? 
                          (() => {
                            try {
                              const parsed = parseInt(item.value, 16)
                              return isNaN(parsed) ? '0.0000 ETH' : `${(parsed / 1e18).toFixed(4)} ETH`
                            } catch {
                              return '0.0000 ETH'
                            }
                          })() : 
                          (item.type === 'transaction' ? '0.0000 ETH' : '-')
                        )
                      }
                    </td>
                    <td className="py-4">
                      <TimeAgo timestamp={item.timestamp} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {displayItems.length === 0 && <div className="text-center py-8">Waiting for activity...</div>}
          </div>
        </Card>
      </main>
    </div>
  )
} 