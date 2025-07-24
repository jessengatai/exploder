import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import AddressIcon from '../components/AddressIcon'
import { Check, X, ExternalLink } from 'lucide-react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { useBlockchain } from '../contexts/BlockchainContext'

export default function Transactions() {
  const router = useRouter()
  const { hash } = router.query
  const { rpcUrl, transactionStatuses } = useBlockchain()
  const [transaction, setTransaction] = useState(null)
  const [tokenTransfers, setTokenTransfers] = useState([])

  useEffect(() => {
    if (hash) {
      fetchTransaction(hash)
    }
  }, [hash, rpcUrl])

  const fetchTransaction = async (txHash) => {
    try {
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_getTransactionByHash',
          params: [txHash]
        })
      })
      const result = await response.json()
      
      if (result.result) {
        setTransaction(result.result)
        // Check transaction status
        checkTransactionStatus(txHash)
      }
    } catch (error) {
      console.error('Error fetching transaction:', error)
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
        // Update the local state to show the correct status
        setTransaction(prev => prev ? { ...prev, status } : prev)
      }
    } catch (error) {
      // Error checking transaction status
    }
  }

  if (!transaction) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Head>
          <title>Transaction - Exploder</title>
        </Head>
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold">Transaction</h1>
            <Link href="/">
              <Button variant="secondary">Home</Button>
            </Link>
          </div>
          <div className="text-center py-8">Loading transaction...</div>
        </main>
      </div>
    )
  }

  const status = transaction.status || transactionStatuses[transaction.hash]
  const isSuccess = status === 'success'
  const isFailed = status === 'failed'

  return (
    <div className="min-h-screen bg-black text-white">
      <Head>
        <title>Transaction - Exploder</title>
      </Head>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Transaction</h1>
          <Link href="/">
            <Button variant="secondary">Home</Button>
          </Link>
        </div>
        
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-400">Hash:</span>
                <span className="font-mono text-sm">{transaction.hash}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Network:</span>
                <span>Local Network</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Status:</span>
                <div className="flex items-center gap-2">
                  {isFailed ? (
                    <X className="w-4 h-4 text-red-500" />
                  ) : isSuccess ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <div className="w-4 h-4 bg-gray-500 rounded-full animate-pulse" />
                  )}
                  <span>{isFailed ? 'Failed' : isSuccess ? 'Success' : 'Pending'}</span>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Block:</span>
                <span>{transaction.blockNumber ? parseInt(transaction.blockNumber, 16) : 'Pending'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Timestamp:</span>
                <span>-</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Created At:</span>
                <span>-</span>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-400">From:</span>
                <div className="flex items-center gap-2">
                  <AddressIcon address={transaction.from} size={16} />
                  <span className="font-mono text-sm">{transaction.from}</span>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">To:</span>
                <div className="flex items-center gap-2">
                  <AddressIcon address={transaction.to} size={16} />
                  <span className="font-mono text-sm">{transaction.to}</span>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Tx Fee:</span>
                <span>0 ETH</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Tx Type:</span>
                <span>{transaction.to ? 'Contract Interaction' : 'Contract Creation'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Gas Price:</span>
                <span>{transaction.gasPrice ? `${parseInt(transaction.gasPrice, 16)} Wei (0 ETH)` : '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Gas Used:</span>
                <span>-</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Nonce:</span>
                <span>{transaction.nonce ? parseInt(transaction.nonce, 16) : '-'}</span>
              </div>
            </div>
          </div>
          
          {transaction.input && transaction.input !== '0x' && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">Raw Input</h3>
              <div className="bg-gray-900 p-4 rounded-lg">
                <pre className="text-xs text-gray-300 break-all">{transaction.input}</pre>
              </div>
            </div>
          )}
        </Card>
      </main>
    </div>
  )
} 