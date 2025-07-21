import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function Blocks() {
  const [blocks, setBlocks] = useState([])
  const [rpcUrl, setRpcUrl] = useState('http://localhost:8545')

  useEffect(() => {
    // Load config
    fetch('/config.json')
      .then(res => res.json())
      .then(config => setRpcUrl(config.rpcUrl))
      .catch(() => setRpcUrl('http://localhost:8545'))

    // WebSocket connection
    const ws = new WebSocket(rpcUrl.replace('http', 'ws'))
    
    ws.onopen = () => {
      console.log('Connected to node')
      // Subscribe to new blocks
      ws.send(JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_subscribe',
        params: ['newHeads']
      }))
    }

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.method === 'eth_subscription' && data.params.subscription) {
        const block = data.params.result
        setBlocks(prev => [block, ...prev.slice(0, 9)]) // Keep last 10
      }
    }

    return () => ws.close()
  }, [rpcUrl])

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Head>
        <title>Blocks - Exploder</title>
        <meta name="description" content="View Ethereum blocks" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Blocks</h1>
          <Link href="/" className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded transition-colors">
            Home
          </Link>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="space-y-4">
            {blocks.map((block, i) => (
              <div key={i} className="border border-gray-600 p-4 rounded">
                <div>Block: {parseInt(block.number, 16)}</div>
                <div>Hash: {block.hash}</div>
                <div>Transactions: {block.transactions?.length || 0}</div>
              </div>
            ))}
            {blocks.length === 0 && <div>Waiting for blocks...</div>}
          </div>
        </div>
      </main>
    </div>
  )
} 