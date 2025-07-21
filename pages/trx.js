import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import AddressIcon from '../components/AddressIcon'

export default function Transactions() {
  const [transactions, setTransactions] = useState([])
  const [rpcUrl, setRpcUrl] = useState('http://localhost:8545')

  useEffect(() => {
    fetch('/config.json')
      .then(res => res.json())
      .then(config => setRpcUrl(config.rpcUrl))
      .catch(() => setRpcUrl('http://localhost:8545'))

    const ws = new WebSocket(rpcUrl.replace('http', 'ws'))
    
    ws.onopen = () => {
      ws.send(JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_subscribe',
        params: ['newPendingTransactions']
      }))
    }

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.method === 'eth_subscription' && data.params.subscription) {
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

    return () => ws.close()
  }, [rpcUrl])

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
        <title>Transactions - Exploder</title>
        <meta name="description" content="View Ethereum transactions" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Transactions</h1>
          <Link href="/" className="bg-gray-900 hover:bg-gray-800 text-white font-bold py-2 px-4 transition-colors">
            Home
          </Link>
        </div>
        
        <div className="bg-black p-6 border border-gray-900">
          {transactions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-400">Hash:</span>
                  <span className="font-mono text-sm">{transactions[0].hash}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Network:</span>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-500 rounded"></div>
                    <span>Local Network</span>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Status:</span>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-500 rounded"></div>
                    <span>Success</span>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Block:</span>
                  <span>{transactions[0].blockNumber ? parseInt(transactions[0].blockNumber, 16) : 'Pending'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Timestamp:</span>
                  <span>{transactions[0].timestamp ? `${getRelativeTime(transactions[0].timestamp)} (${new Date(transactions[0].timestamp).toLocaleString()})` : '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Created At:</span>
                  <span>{transactions[0].timestamp ? `${getRelativeTime(transactions[0].timestamp)} (${new Date(transactions[0].timestamp).toLocaleString()})` : '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">From:</span>
                  <div className="flex items-center gap-2">
                    <AddressIcon address={transactions[0].from} size={16} />
                    <span className="font-mono text-sm">{transactions[0].from}</span>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">To:</span>
                  <div className="flex items-center gap-2">
                    <AddressIcon address={transactions[0].to} size={16} />
                    <span className="font-mono text-sm">{transactions[0].to}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-400">Value:</span>
                  <span>{parseInt(transactions[0].value, 16) / 1e18} ETH</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Tx Fee:</span>
                  <span>0 ETH</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Tx Type:</span>
                  <span>-</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Gas Price:</span>
                  <span>{parseInt(transactions[0].gasPrice, 16)} Wei (0 ETH)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Gas Used:</span>
                  <span>{parseInt(transactions[0].gas, 16)} / 150,000,000 (0%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Nonce:</span>
                  <span>{parseInt(transactions[0].nonce, 16)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Raw Input:</span>
                  <span className="font-mono text-sm">{transactions[0].input}</span>
                </div>
              </div>
            </div>
          ) : (
            <div>Waiting for transactions...</div>
          )}
        </div>
      </main>
    </div>
  )
} 