import Head from 'next/head'
import { useState, useEffect } from 'react'
import { detectChainFromUrl } from '../utils/chainDetector'
import AddressIcon from '../components/AddressIcon'

export default function Home() {
  const [blocks, setBlocks] = useState([])
  const [transactions, setTransactions] = useState([])
  const [rpcUrl, setRpcUrl] = useState('http://localhost:8545')
  const [chainInfo, setChainInfo] = useState(null)

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
            if (result.result) {
              setTransactions(prev => [result.result, ...prev.slice(0, 9)])
            }
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

  const getRelativeTime = (timestamp) => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
    return 'just now'
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
        
        <div className="bg-black p-6 border border-gray-900">
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
                  <th className="text-left py-2">When</th>
                </tr>
              </thead>
              <tbody>
                {displayItems.map((item, i) => (
                  <tr key={i} className="border-b border-gray-900 hover:bg-gray-900/50">
                    <td className="py-4">
                      <span className={`px-2 py-1 text-base font-bold ${item.type === 'block' ? 'text-fuchsia-200 bg-fuchsia-900/50' : 'text-green-200 bg-green-900/50'}`}>
                        {item.type === 'block' ? '-' : 'transfer'}
                      </span>
                    </td>
                    <td className="py-4">
                      {item.type === 'block' ? parseInt(item.number, 16) : item.blockNumber || '-'}
                    </td>
                    <td className="py-4">
                      {item.timestamp ? new Date(item.timestamp).toLocaleString() : '-'}
                    </td>
                    <td className="py-4 font-mono text-base">
                      <a href={`/${item.type === 'block' ? 'address' : 'trx'}?hash=${item.hash}`} className="text-blue-300 hover:text-blue-200 hover:underline">
                        {item.hash?.substring(0, 8)}...{item.hash?.substring(item.hash.length - 4)}
                      </a>
                    </td>
                    <td className="py-4 font-mono text-base">
                      {item.type === 'transaction' && item.from ? (
                        <a href={`/address?address=${item.from}`} className="text-blue-300 hover:text-blue-200 hover:underline flex items-center gap-2">
                          <AddressIcon address={item.from} size={20} />
                          {item.from.substring(0, 8)}...{item.from.substring(item.from.length - 4)}
                        </a>
                      ) : '-'}
                    </td>
                    <td className="py-4 font-mono text-base">
                      {item.type === 'transaction' && item.to ? (
                        <a href={`/address?address=${item.to}`} className="text-blue-300 hover:text-blue-200 hover:underline flex items-center gap-2">
                          <AddressIcon address={item.to} size={20} />
                          {item.to.substring(0, 8)}...{item.to.substring(item.to.length - 4)}
                        </a>
                      ) : '-'}
                    </td>
                    <td className="py-4 text-base text-gray-500">
                      {item.timestamp ? getRelativeTime(item.timestamp) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {displayItems.length === 0 && <div className="text-center py-8">Waiting for activity...</div>}
          </div>
        </div>
      </main>
    </div>
  )
} 