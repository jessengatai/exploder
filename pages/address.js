import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { Wallet, ExternalLink, Hash, Calendar, Activity, Coins } from 'lucide-react'
import AddressIcon from '../components/AddressIcon'

import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import ContractCode from '../components/ui/ContractCode'
import { checkContractVerification, getExplorerContractUrl } from '../utils/contractVerifier'

export default function Address() {
  const router = useRouter()
  const { address, addr } = router.query
  const actualAddress = address || addr
  const [balance, setBalance] = useState('0')
  const [rpcUrl, setRpcUrl] = useState('http://localhost:8545')
  const [addressInfo, setAddressInfo] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [tokens, setTokens] = useState([])
  const [tokenBalances, setTokenBalances] = useState([])
  const [contractInfo, setContractInfo] = useState(null)

  useEffect(() => {
    if (!actualAddress) return

    fetch('/config.json')
      .then(res => res.json())
      .then(config => {
        setRpcUrl(config.rpcUrl)
        fetchAddressData(actualAddress, config.rpcUrl)
      })
      .catch(() => {
        const defaultUrl = 'http://localhost:8545'
        setRpcUrl(defaultUrl)
        fetchAddressData(actualAddress, defaultUrl)
      })
  }, [actualAddress])

  const fetchAddressData = async (addr, url) => {
    try {
      // Get ETH balance
      const balanceRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_getBalance',
          params: [addr, 'latest']
        })
      })
      const balanceData = await balanceRes.json()
      
      // Get transaction count (nonce)
      const nonceRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'eth_getTransactionCount',
          params: [addr, 'latest']
        })
      })
      const nonceData = await nonceRes.json()
      
      // Check if it's a contract
      const codeRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 3,
          method: 'eth_getCode',
          params: [addr, 'latest']
        })
      })
      const codeData = await codeRes.json()
      
      // Get latest block for timestamp
      const blockRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 4,
          method: 'eth_blockNumber',
          params: []
        })
      })
      const blockData = await blockRes.json()
      
      setAddressInfo({
        balance: balanceData.result ? (parseInt(balanceData.result, 16) / 1e18).toFixed(4) : '0',
        nonce: nonceData.result ? parseInt(nonceData.result, 16) : 0,
        isContract: codeData.result && codeData.result !== '0x',
        latestBlock: blockData.result ? parseInt(blockData.result, 16) : 0
      })
      
      // Fetch recent transactions involving this address
      fetchRecentTransactions(addr, url, blockData.result ? parseInt(blockData.result, 16) : 0)
      
      // Check for tokens if this is a contract
      if (codeData.result && codeData.result !== '0x') {
        checkForTokens(addr, url)
        
        // Check contract verification
        const verification = await checkContractVerification(addr, chain, url)
        setContractInfo(verification)
      }
      
      // Check for token balances this address holds
      checkTokenBalances(addr, url)
    } catch (error) {
      console.error('Error fetching address data:', error)
    }
  }

  const fetchRecentTransactions = async (addr, url, latestBlock) => {
    try {
      const txPromises = []
      // Check last 10 blocks for transactions involving this address
      for (let i = 0; i < 10 && latestBlock - i >= 0; i++) {
        txPromises.push(
          fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              method: 'eth_getBlockByNumber',
              params: [`0x${(latestBlock - i).toString(16)}`, true]
            })
          }).then(res => res.json())
        )
      }
      
      const blockResults = await Promise.all(txPromises)
      const allTransactions = []
      
      for (const blockResult of blockResults) {
        if (blockResult.result && blockResult.result.transactions) {
          const relevantTxs = blockResult.result.transactions.filter(tx => 
            tx.from?.toLowerCase() === addr.toLowerCase() || 
            tx.to?.toLowerCase() === addr.toLowerCase()
          )
          allTransactions.push(...relevantTxs)
        }
      }
      
      setTransactions(allTransactions.slice(0, 10))
    } catch (error) {
      console.error('Error fetching transactions:', error)
    }
  }

  const checkForTokens = async (addr, url) => {
    try {
      // Check if this contract has ERC20 functions
      const tokenPromises = []
      
      // Check for name() function
      tokenPromises.push(
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'eth_call',
            params: [{
              to: addr,
              data: '0x06fdde03' // name() function selector
            }, 'latest']
          })
        }).then(res => res.json())
      )
      
      // Check for symbol() function
      tokenPromises.push(
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 2,
            method: 'eth_call',
            params: [{
              to: addr,
              data: '0x95d89b41' // symbol() function selector
            }, 'latest']
          })
        }).then(res => res.json())
      )
      
      // Check for decimals() function
      tokenPromises.push(
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 3,
            method: 'eth_call',
            params: [{
              to: addr,
              data: '0x313ce567' // decimals() function selector
            }, 'latest']
          })
        }).then(res => res.json())
      )
      
      // Check for totalSupply() function
      tokenPromises.push(
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 4,
            method: 'eth_call',
            params: [{
              to: addr,
              data: '0x18160ddd' // totalSupply() function selector
            }, 'latest']
          })
        }).then(res => res.json())
      )
      
      const tokenResults = await Promise.all(tokenPromises)
      
      // If we get valid responses for name and symbol, it's likely a token
      const nameResult = tokenResults[0]
      const symbolResult = tokenResults[1]
      const decimalsResult = tokenResults[2]
      const totalSupplyResult = tokenResults[3]
      
      if (nameResult.result && symbolResult.result && 
          nameResult.result !== '0x' && symbolResult.result !== '0x') {
        
        // Decode the name and symbol from hex
        const name = decodeString(nameResult.result)
        const symbol = decodeString(symbolResult.result)
        const decimals = decimalsResult.result ? parseInt(decimalsResult.result, 16) : 18
        const totalSupply = totalSupplyResult.result ? 
          (parseInt(totalSupplyResult.result, 16) / Math.pow(10, decimals)).toFixed(2) : '0'
        
        setTokens([{
          address: addr,
          name: name,
          symbol: symbol,
          decimals: decimals,
          totalSupply: totalSupply
        }])
      }
    } catch (error) {
      console.error('Error checking for tokens:', error)
    }
  }

  const decodeString = (hexString) => {
    try {
      // Remove '0x' prefix and convert hex to string
      const hex = hexString.slice(2)
      let str = ''
      for (let i = 0; i < hex.length; i += 2) {
        const charCode = parseInt(hex.substr(i, 2), 16)
        if (charCode === 0) break // Stop at null terminator
        str += String.fromCharCode(charCode)
      }
      return str
    } catch (error) {
      return 'Unknown'
    }
  }

  const checkTokenBalances = async (addr, url) => {
    try {
      // Common token addresses to check (you can add more)
      const commonTokens = [
        {
          address: '0xA0b86a33E6441b8c4C8C8C8C8C8C8C8C8C8C8C8', // USDC on Base
          name: 'USD Coin',
          symbol: 'USDC',
          decimals: 6
        },
        {
          address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
          name: 'USD Coin',
          symbol: 'USDC',
          decimals: 6
        },
        {
          address: '0x4200000000000000000000000000000000000006', // WETH on Base
          name: 'Wrapped Ether',
          symbol: 'WETH',
          decimals: 18
        }
      ]

      const balancePromises = commonTokens.map(token => 
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'eth_call',
            params: [{
              to: token.address,
              data: `0x70a08231${'0'.repeat(24)}${addr.slice(2)}` // balanceOf(address) function
            }, 'latest']
          })
        }).then(res => res.json())
      )

      const balanceResults = await Promise.all(balancePromises)
      const balances = []

      for (let i = 0; i < commonTokens.length; i++) {
        const token = commonTokens[i]
        const result = balanceResults[i]
        
        if (result.result && result.result !== '0x') {
          const balance = parseInt(result.result, 16)
          if (balance > 0) {
            const formattedBalance = (balance / Math.pow(10, token.decimals)).toFixed(4)
            balances.push({
              ...token,
              balance: formattedBalance
            })
          }
        }
      }

      setTokenBalances(balances)
    } catch (error) {
      console.error('Error checking token balances:', error)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Head>
        <title>Address - Exploder</title>
        <meta name="description" content="View address details" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Address</h1>
          <Link href="/">
            <Button variant="secondary">
              Home
            </Button>
          </Link>
        </div>
        
        {addressInfo ? (
          <>
            <Card>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Address:</span>
                    <div className="flex items-center gap-2">
                      <AddressIcon address={actualAddress} size={16} />
                      <span className="font-mono text-sm">{actualAddress}</span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Type:</span>
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-blue-500" />
                      <span>{addressInfo.isContract ? 'Contract' : 'EOA'}</span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Network:</span>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-blue-500 rounded"></div>
                      <span>Local Network</span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Latest Block:</span>
                    <span>{addressInfo.latestBlock}</span>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-400">ETH Balance:</span>
                    <div className="flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-green-500" />
                      <span>{addressInfo.balance} ETH</span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Transaction Count:</span>
                    <span>{addressInfo.nonce}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Contract Code:</span>
                    <span>{addressInfo.isContract ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Created:</span>
                    <span>-</span>
                  </div>
                </div>
              </div>
            </Card>
            
            {tokenBalances.length > 0 && (
              <Card className="mt-8">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Coins className="w-5 h-5 text-yellow-500" />
                  Token Balances
                </h3>
                <div className="space-y-4">
                  {tokenBalances.map((token, i) => (
                    <div key={i} className="border border-gray-800 p-4 rounded">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-white font-bold text-sm">{token.symbol.charAt(0)}</span>
                          </div>
                          <div>
                            <div className="font-semibold">{token.name}</div>
                            <div className="text-sm text-gray-400">{token.symbol}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{token.balance} {token.symbol}</div>
                          <div className="text-sm text-gray-400">
                            <Link href={`/address?address=${token.address}`} className="text-blue-400 hover:text-blue-300">
                              {token.address.substring(0, 8)}...{token.address.substring(token.address.length - 4)}
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
            
            {tokens.length > 0 && (
              <Card className="mt-8">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Coins className="w-5 h-5 text-yellow-500" />
                  Token Information
                </h3>
                <div className="space-y-4">
                  {tokens.map((token, i) => (
                    <div key={i} className="border border-gray-800 p-4 rounded">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Name:</span>
                            <span className="font-semibold">{token.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Symbol:</span>
                            <span className="font-semibold text-blue-400">{token.symbol}</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Decimals:</span>
                            <span>{token.decimals}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Total Supply:</span>
                            <span>{token.totalSupply} {token.symbol}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
            
            {addressInfo?.isContract && (
              <Card className="mt-8">
                <ContractCode 
                  contractInfo={contractInfo} 
                  explorerUrl={null}
                />
              </Card>
            )}
            
            {transactions.length > 0 && (
              <Card className="mt-8">
                <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
                <div className="space-y-4">
                  {transactions.map((tx, i) => (
                    <div key={i} className="border border-gray-800 p-4 rounded">
                      <div className="flex justify-between items-center mb-2">
                        <Link href={`/trx?hash=${tx.hash}`} className="font-mono text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1">
                          {tx.hash.substring(0, 8)}...{tx.hash.substring(tx.hash.length - 4)}
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                        <span className="text-sm text-gray-500">
                          Block {tx.blockNumber ? parseInt(tx.blockNumber, 16) : 'Pending'}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-400">From: </span>
                          <Link href={`/address?address=${tx.from}`} className="text-blue-400 hover:text-blue-300">
                            {tx.from.substring(0, 8)}...{tx.from.substring(tx.from.length - 4)}
                          </Link>
                        </div>
                        <div>
                          <span className="text-gray-400">To: </span>
                          <Link href={`/address?address=${tx.to}`} className="text-blue-400 hover:text-blue-300">
                            {tx.to.substring(0, 8)}...{tx.to.substring(tx.to.length - 4)}
                          </Link>
                        </div>
                        <div>
                          <span className="text-gray-400">Value: </span>
                          <span>{(parseInt(tx.value, 16) / 1e18).toFixed(4)} ETH</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Gas: </span>
                          <span>{parseInt(tx.gas, 16)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>
        ) : (
          <Card>
            <div>Loading address information...</div>
          </Card>
        )}
      </main>
    </div>
  )
} 