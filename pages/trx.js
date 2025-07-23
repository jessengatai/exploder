import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import AddressIcon from '../components/AddressIcon'
import { Check, ExternalLink } from 'lucide-react'
import Card from '../components/ui/Card'
import AddressDisplay from '../components/ui/Address'
import TimeAgo from '../components/ui/TimeAgo'
import TextLink from '../components/ui/TextLink'
import Button from '../components/ui/Button'

export default function Transactions() {
  const [transactions, setTransactions] = useState([])
  const [rpcUrl, setRpcUrl] = useState('http://localhost:8545')
  const [tokenTransfers, setTokenTransfers] = useState([])

  useEffect(() => {
    fetch('/config.json')
      .then(res => res.json())
      .then(config => {
        setRpcUrl(config.rpcUrl)
        // Fetch recent transactions after config loads
        fetchRecentTransactions(config.rpcUrl)
        setupWebSocket(config.rpcUrl)
      })
      .catch(() => {
        const defaultUrl = 'http://localhost:8545'
        setRpcUrl(defaultUrl)
        fetchRecentTransactions(defaultUrl)
        setupWebSocket(defaultUrl)
      })
  }, [])

  const fetchRecentTransactions = (url) => {
    // Get latest block number
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_blockNumber',
        params: []
      })
    })
    .then(res => res.json())
    .then(result => {
      if (result.result) {
        const latestBlock = parseInt(result.result, 16)
        // Fetch last 5 blocks
        for (let i = 0; i < 5; i++) {
          const blockNumber = latestBlock - i
          fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              method: 'eth_getBlockByNumber',
              params: [`0x${blockNumber.toString(16)}`, true]
            })
          })
          .then(res => res.json())
          .then(blockResult => {
            if (blockResult.result && blockResult.result.transactions) {
              blockResult.result.transactions.forEach(tx => {
                setTransactions(prev => {
                  if (!prev.find(t => t.hash === tx.hash)) {
                    return [tx, ...prev.slice(0, 9)]
                  }
                  return prev
                })
              })
            }
          })
        }
      }
    })
  }

  const setupWebSocket = (url) => {
    const ws = new WebSocket(url.replace('http', 'ws'))
    
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
        fetch(url, {
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
            // Analyze transaction for token transfers
            analyzeTransaction(result.result, url)
          }
        })
      }
    }

    return () => ws.close()
  }



  const analyzeTransaction = async (tx, url) => {
    try {
      // Check if this is a token transfer by analyzing the input data
      if (tx.input && tx.input !== '0x' && tx.input.length > 10) {
        const methodId = tx.input.substring(0, 10)
        
        // ERC20 transfer function selectors
        if (methodId === '0xa9059cbb') { // transfer(address,uint256)
          const transfers = await decodeERC20Transfer(tx, url)
          setTokenTransfers(transfers)
        } else if (methodId === '0x23b872dd') { // transferFrom(address,address,uint256)
          const transfers = await decodeERC20TransferFrom(tx, url)
          setTokenTransfers(transfers)
        }
      }
    } catch (error) {
      console.error('Error analyzing transaction:', error)
    }
  }

  const decodeERC20Transfer = async (tx, url) => {
    try {
      // Extract recipient address and amount from input data
      const recipient = '0x' + tx.input.substring(34, 74)
      const amountHex = tx.input.substring(74)
      const amount = parseInt(amountHex, 16)
      
      // Get token info
      const tokenInfo = await getTokenInfo(tx.to, url)
      if (tokenInfo) {
        const formattedAmount = (amount / Math.pow(10, tokenInfo.decimals)).toFixed(4)
        return [{
          type: 'transfer',
          token: tokenInfo,
          from: tx.from,
          to: recipient,
          amount: formattedAmount
        }]
      }
    } catch (error) {
      console.error('Error decoding ERC20 transfer:', error)
    }
    return []
  }

  const decodeERC20TransferFrom = async (tx, url) => {
    try {
      // Extract from, to, and amount from input data
      const from = '0x' + tx.input.substring(34, 74)
      const to = '0x' + tx.input.substring(98, 138)
      const amountHex = tx.input.substring(138)
      const amount = parseInt(amountHex, 16)
      
      // Get token info
      const tokenInfo = await getTokenInfo(tx.to, url)
      if (tokenInfo) {
        const formattedAmount = (amount / Math.pow(10, tokenInfo.decimals)).toFixed(4)
        return [{
          type: 'transferFrom',
          token: tokenInfo,
          from: from,
          to: to,
          amount: formattedAmount
        }]
      }
    } catch (error) {
      console.error('Error decoding ERC20 transferFrom:', error)
    }
    return []
  }

  const getTokenInfo = async (tokenAddress, url) => {
    try {
      // Get token name
      const nameRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_call',
          params: [{
            to: tokenAddress,
            data: '0x06fdde03' // name()
          }, 'latest']
        })
      })
      const nameData = await nameRes.json()
      
      // Get token symbol
      const symbolRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
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
          id: 3,
          method: 'eth_call',
          params: [{
            to: tokenAddress,
            data: '0x313ce567' // decimals()
          }, 'latest']
        })
      })
      const decimalsData = await decimalsRes.json()
      
      if (nameData.result && symbolData.result && 
          nameData.result !== '0x' && symbolData.result !== '0x') {
        return {
          address: tokenAddress,
          name: decodeString(nameData.result),
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
        <title>Transactions - Exploder</title>
        <meta name="description" content="View Ethereum transactions" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Transactions</h1>
          <Link href="/">
            <Button variant="secondary">
              Home
            </Button>
          </Link>
        </div>
        
        <Card>
          {transactions.length > 0 ? (
            <>
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
                      <Check className="w-4 h-4 text-green-500" />
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
                                          <Link href={`/address?address=${transactions[0].from}`} className="font-mono text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1">
                      {transactions[0].from}
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">To:</span>
                  <div className="flex items-center gap-2">
                    <AddressIcon address={transactions[0].to} size={16} />
                    <Link href={`/address?address=${transactions[0].to}`} className="font-mono text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1">
                      {transactions[0].to}
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Value:</span>
                    <span>{(parseInt(transactions[0].value, 16) / 1e18).toFixed(4)} ETH</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Tx Fee:</span>
                    <span>0 ETH</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Tx Type:</span>
                    <span>{tokenTransfers.length > 0 ? 'Token Transfer' : (transactions[0].input && transactions[0].input !== '0x' ? 'Contract Interaction' : 'ETH Transfer')}</span>
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
                </div>
              </div>
              
              {tokenTransfers.length > 0 && (
                <Card className="mt-8">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Coins className="w-5 h-5 text-yellow-500" />
                    Token Transfers
                  </h3>
                  <div className="space-y-4">
                    {tokenTransfers.map((transfer, i) => (
                      <div key={i} className="border border-gray-800 p-4 rounded">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                              <span className="text-white font-bold text-xs">{transfer.token.symbol.charAt(0)}</span>
                            </div>
                            <span className="font-semibold">{transfer.token.name} ({transfer.token.symbol})</span>
                          </div>
                          <span className="text-lg font-bold text-green-400">{transfer.amount} {transfer.token.symbol}</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-400">From: </span>
                            <Link href={`/address?address=${transfer.from}`} className="text-blue-400 hover:text-blue-300">
                              {transfer.from.substring(0, 8)}...{transfer.from.substring(transfer.from.length - 4)}
                            </Link>
                          </div>
                          <div>
                            <span className="text-gray-400">To: </span>
                            <Link href={`/address?address=${transfer.to}`} className="text-blue-400 hover:text-blue-300">
                              {transfer.to.substring(0, 8)}...{transfer.to.substring(transfer.to.length - 4)}
                            </Link>
                          </div>
                        </div>
                      </div>
                                      ))}
                </div>
              </Card>
            )}
            
            <Card className="mt-8">
                <h3 className="text-lg font-semibold mb-4">Raw Input</h3>
                <div className="font-mono text-sm break-all bg-gray-900 p-4 border border-gray-800 rounded">
                  {transactions[0].input}
                </div>
              </Card>
            </>
          ) : (
            <div>Waiting for transactions...</div>
          )}
        </Card>
      </main>
    </div>
  )
} 