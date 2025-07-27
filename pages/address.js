import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { Wallet, ExternalLink, Hash, Calendar, Activity, Coins, Code, Settings, FileText, Zap, Shield } from 'lucide-react'
import AddressIcon from '../components/AddressIcon'

import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import ContractCode from '../components/ui/ContractCode'
import ContractVerification from '../components/ui/ContractVerification'
import ContractInteraction from '../components/ui/ContractInteraction'
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
  const [contractAnalysis, setContractAnalysis] = useState(null)
  const [userVerification, setUserVerification] = useState(null)

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
      
      const isContract = codeData.result && codeData.result !== '0x'
      
      setAddressInfo({
        balance: balanceData.result ? (parseInt(balanceData.result, 16) / 1e18).toFixed(4) : '0',
        nonce: nonceData.result ? parseInt(nonceData.result, 16) : 0,
        isContract: isContract,
        latestBlock: blockData.result ? parseInt(blockData.result, 16) : 0,
        bytecodeSize: isContract ? (codeData.result.length - 2) / 2 : 0
      })
      
      // Fetch recent transactions involving this address
      fetchRecentTransactions(addr, url, blockData.result ? parseInt(blockData.result, 16) : 0)
      
      // Enhanced contract analysis if this is a contract
      if (isContract) {
        // Check for user verification first
        checkUserVerification(addr)
        await performEnhancedContractAnalysis(addr, url)
      }
      
      // Check for token balances this address holds
      checkTokenBalances(addr, url)
    } catch (error) {
      console.error('Error fetching address data:', error)
    }
  }

  const performEnhancedContractAnalysis = async (addr, url) => {
    try {
      // Get comprehensive contract verification
      const verification = await checkContractVerification(addr, null, url)
      setContractInfo(verification)
      
      if (verification && verification.analysis) {
        setContractAnalysis(verification.analysis)
        
        // If we found a token name, set it in tokens array for compatibility
        if (verification.analysis.contractName && verification.analysis.contractType === 'Token') {
          const tokenInfo = await getTokenDetails(addr, url)
          if (tokenInfo) {
            setTokens([{
              address: addr,
              name: verification.analysis.contractName,
              symbol: tokenInfo.symbol || 'UNKNOWN',
              decimals: tokenInfo.decimals || 18,
              totalSupply: tokenInfo.totalSupply || '0'
            }])
          }
        }
      }
    } catch (error) {
      console.error('Error performing contract analysis:', error)
    }
  }

  const getTokenDetails = async (addr, url) => {
    try {
      const [symbolRes, decimalsRes, totalSupplyRes] = await Promise.all([
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'eth_call',
            params: [{ to: addr, data: '0x95d89b41' }, 'latest']
          })
        }),
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 2,
            method: 'eth_call',
            params: [{ to: addr, data: '0x313ce567' }, 'latest']
          })
        }),
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 3,
            method: 'eth_call',
            params: [{ to: addr, data: '0x18160ddd' }, 'latest']
          })
        })
      ])

      const [symbolData, decimalsData, totalSupplyData] = await Promise.all([
        symbolRes.json(),
        decimalsRes.json(),
        totalSupplyRes.json()
      ])

      const decimals = decimalsData.result && decimalsData.result !== '0x' ? 
        parseInt(decimalsData.result, 16) : 18
      
      return {
        symbol: symbolData.result && symbolData.result !== '0x' ? 
          decodeString(symbolData.result) : null,
        decimals: decimals,
        totalSupply: totalSupplyData.result && totalSupplyData.result !== '0x' ?
          (parseInt(totalSupplyData.result, 16) / Math.pow(10, decimals)).toFixed(2) : '0'
      }
    } catch (error) {
      return null
    }
  }

  const checkUserVerification = (addr) => {
    try {
      const verifications = JSON.parse(localStorage.getItem('contractVerifications') || '{}')
      const verification = verifications[addr]
      if (verification) {
        setUserVerification(verification)
      }
    } catch (error) {
      console.error('Error checking user verification:', error)
    }
  }

  const handleVerificationComplete = (verificationData) => {
    setUserVerification(verificationData)
    // Update contract info with user-provided data
    if (contractInfo) {
      setContractInfo({
        ...contractInfo,
        contractName: verificationData.contractName,
        compilerVersion: verificationData.compilerVersion,
        optimization: verificationData.optimizationEnabled ? 'Enabled' : 'Disabled',
        runs: verificationData.optimizationRuns,
        sourceCode: verificationData.sourceCode,
        abi: JSON.stringify(verificationData.abi || [], null, 2),
        userVerified: true
      })
    }
    
    // Update contract analysis with user data
    if (contractAnalysis) {
      setContractAnalysis({
        ...contractAnalysis,
        contractName: verificationData.contractName,
        abi: verificationData.abi || contractAnalysis.abi
      })
    }
  }

  const getFunctionNameFromSelector = (selector, abi) => {
    if (!abi) return null
    
    try {
      const abiArray = typeof abi === 'string' ? JSON.parse(abi) : abi
      const func = abiArray.find(item => {
        if (item.type === 'function') {
          // Calculate function selector (first 4 bytes of keccak256 hash)
          const signature = `${item.name}(${item.inputs.map(input => input.type).join(',')})`
          // For now, just match by name since we don't have keccak256 in browser
          return signature.includes(item.name)
        }
        return false
      })
      
      if (func) {
        const params = func.inputs.map(input => `${input.type} ${input.name || ''}`).join(', ')
        return `${func.name}(${params})`
      }
    } catch (error) {
      console.error('Error parsing ABI for function names:', error)
    }
    
    return null
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

  const decodeString = (hexString) => {
    try {
      const hex = hexString.slice(2)
      const dataStart = 128
      if (hex.length <= dataStart) return null
      
      const lengthHex = hex.slice(64, 128)
      const length = parseInt(lengthHex, 16)
      
      if (length === 0 || length > 100) return null
      
      const stringHex = hex.slice(dataStart, dataStart + (length * 2))
      const bytes = stringHex.match(/.{2}/g).map(byte => parseInt(byte, 16))
      
      return String.fromCharCode(...bytes).replace(/\0/g, '')
    } catch (error) {
      return null
    }
  }

  const checkTokenBalances = async (addr, url) => {
    try {
      const commonTokens = [
        {
          address: '0xA0b86a33E6441b8c4C8C8C8C8C8C8C8C8C8C8C8',
          name: 'USD Coin',
          symbol: 'USDC',
          decimals: 6
        },
        {
          address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
          name: 'USD Coin',
          symbol: 'USDC',
          decimals: 6
        },
        {
          address: '0x4200000000000000000000000000000000000006',
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
              data: `0x70a08231${'0'.repeat(24)}${addr.slice(2)}`
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
        <script src="https://cdn.ethers.io/lib/ethers-5.7.2.umd.min.js"></script>
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
                      <span>
                        {addressInfo.isContract 
                          ? (contractAnalysis?.contractType || 'Contract')
                          : 'EOA'
                        }
                        {contractAnalysis?.contractName && (
                          <span className="text-gray-400 ml-2">({contractAnalysis.contractName})</span>
                        )}
                      </span>
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
                    <span>{addressInfo.isContract ? `Yes (${addressInfo.bytecodeSize} bytes)` : 'No'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Created:</span>
                    <span>-</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Enhanced Contract Analysis */}
            {contractAnalysis && (
              <Card className="mt-8">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Code className="w-5 h-5 text-purple-500" />
                  Contract Analysis
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-3">
                    <h4 className="font-medium text-blue-400 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Basic Info
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Name:</span>
                        <div className="flex items-center gap-2">
                          <span>{userVerification?.contractName || contractAnalysis.contractName || 'Unknown'}</span>
                          {userVerification && (
                            <span className="text-xs bg-green-900 text-green-300 px-2 py-1 rounded">
                              User Verified
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Type:</span>
                        <span className="text-green-400">{contractAnalysis.contractType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Functions:</span>
                        <span>{contractAnalysis.functionSelectors?.length || 0}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium text-orange-400 flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      Compiler
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Version:</span>
                        <span>{contractAnalysis.compilerVersion || 'Unknown'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Optimization:</span>
                        <span className={contractAnalysis.optimization === 'Enabled' ? 'text-green-400' : 'text-gray-400'}>
                          {contractAnalysis.optimization || 'Unknown'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Runs:</span>
                        <span>{contractAnalysis.optimizationRuns || 'Unknown'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium text-cyan-400 flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Metadata
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">IPFS Hash:</span>
                        <span className="font-mono text-xs">
                          {contractAnalysis.metadata?.ipfsHash ? 
                            `${contractAnalysis.metadata.ipfsHash.slice(0, 8)}...` : 
                            'None'
                          }
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">ABI Functions:</span>
                        <span>{contractAnalysis.abi?.length || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Function Selectors */}
                {contractAnalysis.functionSelectors && contractAnalysis.functionSelectors.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-medium text-yellow-400 mb-3 flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Function Selectors ({contractAnalysis.functionSelectors.length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {contractAnalysis.functionSelectors.map((selector, i) => {
                        // Try to get function name from ABI if available
                        const functionName = getFunctionNameFromSelector(selector, userVerification?.abi || contractAnalysis.abi)
                        return (
                          <div key={i} className="bg-gray-900 p-3 rounded">
                            <div className="text-xs font-mono text-blue-300">{selector}</div>
                            {functionName && (
                              <div className="text-xs text-gray-400 mt-1">{functionName}</div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Generated ABI Preview */}
                {contractAnalysis.abi && contractAnalysis.abi.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-medium text-green-400 mb-3">Generated ABI Preview</h4>
                    <div className="bg-gray-900 p-3 rounded text-xs font-mono max-h-40 overflow-y-auto">
                      {contractAnalysis.abi.map((func, i) => (
                        <div key={i} className="text-green-300">
                          function {func.name}({func.inputs?.map(input => input.type).join(', ')})
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            )}
            
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
              <>
                <div className="mt-8">
                  <ContractVerification 
                    contractAddress={actualAddress}
                    onVerificationComplete={handleVerificationComplete}
                  />
                </div>
                
                <Card className="mt-8">
                  <ContractCode 
                    contractInfo={contractInfo} 
                    explorerUrl={null}
                  />
                </Card>

                <ContractInteraction 
                  contractAddress={actualAddress}
                  contractABI={userVerification?.abi || contractAnalysis?.abi || contractInfo?.abi}
                  userVerification={userVerification}
                />
              </>
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
                          {tx.to ? (
                            <Link href={`/address?address=${tx.to}`} className="text-blue-400 hover:text-blue-300">
                              {tx.to.substring(0, 8)}...{tx.to.substring(tx.to.length - 4)}
                            </Link>
                          ) : (
                            <span className="text-gray-400">Contract Creation</span>
                          )}
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