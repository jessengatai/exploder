import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect } from 'react'

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
          <div className="space-y-4">
            {transactions.map((tx, i) => (
              <div key={i} className="border border-gray-900 p-4">
                <div>Hash: {tx.hash}</div>
                <div>From: {tx.from}</div>
                <div>To: {tx.to}</div>
                <div>Value: {parseInt(tx.value, 16) / 1e18} ETH</div>
                <div>Gas: {parseInt(tx.gas, 16)}</div>
                <div>Gas Price: {parseInt(tx.gasPrice, 16)}</div>
                <div>Nonce: {parseInt(tx.nonce, 16)}</div>
                <div>Data: {tx.input}</div>
              </div>
            ))}
            {transactions.length === 0 && <div>Waiting for transactions...</div>}
          </div>
        </div>
      </main>
    </div>
  )
} 