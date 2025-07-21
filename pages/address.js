import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function Address() {
  const router = useRouter()
  const { address } = router.query
  const [balance, setBalance] = useState('0')
  const [rpcUrl, setRpcUrl] = useState('http://localhost:8545')

  useEffect(() => {
    if (!address) return

    fetch('/config.json')
      .then(res => res.json())
      .then(config => setRpcUrl(config.rpcUrl))
      .catch(() => setRpcUrl('http://localhost:8545'))

    // Get ETH balance
    fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getBalance',
        params: [address, 'latest']
      })
    })
    .then(res => res.json())
    .then(result => {
      if (result.result) {
        setBalance((parseInt(result.result, 16) / 1e18).toFixed(4))
      }
    })
  }, [address, rpcUrl])

  return (
    <div className="min-h-screen bg-black text-white">
      <Head>
        <title>Address - Exploder</title>
        <meta name="description" content="View address details" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Address</h1>
          <Link href="/" className="bg-gray-900 hover:bg-gray-800 text-white font-bold py-2 px-4 transition-colors">
            Home
          </Link>
        </div>
        
        <div className="bg-black p-6 border border-gray-900">
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Address</h2>
            <div className="font-mono text-base bg-gray-900 p-2 border border-gray-800">{address}</div>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Assets</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>ETH Balance:</span>
                <span>{balance} ETH</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
} 