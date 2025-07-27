import { useState, useEffect } from 'react'
import { Play, Eye, Edit, Wallet, AlertCircle, CheckCircle } from 'lucide-react'
import Button from './Button'
import Card from './Card'

export default function ContractInteraction({ contractAddress, contractABI, userVerification }) {
  const [isConnected, setIsConnected] = useState(false)
  const [account, setAccount] = useState('')
  const [readFunctions, setReadFunctions] = useState([])
  const [writeFunctions, setWriteFunctions] = useState([])
  const [functionInputs, setFunctionInputs] = useState({})
  const [functionResults, setFunctionResults] = useState({})
  const [isLoading, setIsLoading] = useState({})
  const [errors, setErrors] = useState({})
  const [walletError, setWalletError] = useState(null)

  useEffect(() => {
    // Add a small delay to ensure MetaMask is fully loaded
    const timer = setTimeout(() => {
      try {
        checkWalletConnection()
      } catch (error) {
        console.error('Error in wallet connection check:', error)
        setWalletError(error.message)
      }
    }, 100)
    
    if (contractABI) {
      categorizeABIFunctions()
    }
    
    return () => clearTimeout(timer)
  }, [contractABI])

  const checkWalletConnection = async () => {
    if (typeof window !== 'undefined' && window.ethereum && window.ethereum.isMetaMask) {
      try {
        // Check if MetaMask is ready
        if (!window.ethereum.isConnected()) {
          console.log('MetaMask is not connected to any network')
          return
        }
        
        // Check if MetaMask is unlocked and has accounts
        const accounts = await window.ethereum.request({ 
          method: 'eth_accounts'
        })
        if (accounts && accounts.length > 0) {
          setIsConnected(true)
          setAccount(accounts[0])
        }
      } catch (error) {
        console.error('Error checking wallet connection:', error)
        // Don't set error state here, just log it
      }
    }
  }

  const connectWallet = async () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        // Request account access
        const accounts = await window.ethereum.request({ 
          method: 'eth_requestAccounts' 
        })
        
        if (accounts && accounts.length > 0) {
          setIsConnected(true)
          setAccount(accounts[0])
        } else {
          throw new Error('No accounts returned from MetaMask')
        }
      } catch (error) {
        console.error('Error connecting wallet:', error)
        
        // Handle specific MetaMask errors
        if (error.code === 4001) {
          alert('Please connect to MetaMask to interact with the contract.')
        } else if (error.code === -32002) {
          alert('MetaMask connection request is already pending. Please check MetaMask.')
        } else {
          alert(`Failed to connect to MetaMask: ${error.message}`)
        }
      }
    } else {
      alert('MetaMask not detected. Please install MetaMask browser extension.')
    }
  }

  const categorizeABIFunctions = () => {
    if (!contractABI || contractABI.length === 0) return

    let abi
    try {
      abi = typeof contractABI === 'string' ? JSON.parse(contractABI) : contractABI
    } catch (error) {
      console.error('Error parsing ABI:', error)
      return
    }

    const reads = []
    const writes = []

    abi.forEach(item => {
      if (item.type === 'function') {
        if (item.stateMutability === 'view' || item.stateMutability === 'pure') {
          reads.push(item)
        } else {
          writes.push(item)
        }
      }
    })

    setReadFunctions(reads)
    setWriteFunctions(writes)
  }

  const handleInputChange = (functionName, paramName, value) => {
    setFunctionInputs(prev => ({
      ...prev,
      [functionName]: {
        ...prev[functionName],
        [paramName]: value
      }
    }))
  }

  const callReadFunction = async (func) => {
    const functionKey = func.name
    setIsLoading(prev => ({ ...prev, [functionKey]: true }))
    setErrors(prev => ({ ...prev, [functionKey]: null }))

    try {
      if (!window.ethereum) throw new Error('MetaMask not found')
      if (!window.ethers) throw new Error('Ethers.js not loaded')

      const provider = new window.ethers.providers.Web3Provider(window.ethereum)
      const contract = new window.ethers.Contract(contractAddress, [func], provider)

      const inputs = functionInputs[functionKey] || {}
      const params = func.inputs.map(input => inputs[input.name] || '')

      const result = await contract[func.name](...params)
      
      // Format result for display
      let formattedResult
      if (Array.isArray(result)) {
        formattedResult = result.map(r => r.toString()).join(', ')
      } else {
        formattedResult = result.toString()
      }

      setFunctionResults(prev => ({
        ...prev,
        [functionKey]: formattedResult
      }))
    } catch (error) {
      console.error('Error calling read function:', error)
      setErrors(prev => ({
        ...prev,
        [functionKey]: error.message
      }))
    } finally {
      setIsLoading(prev => ({ ...prev, [functionKey]: false }))
    }
  }

  const callWriteFunction = async (func) => {
    const functionKey = func.name
    setIsLoading(prev => ({ ...prev, [functionKey]: true }))
    setErrors(prev => ({ ...prev, [functionKey]: null }))

    try {
      if (!window.ethereum) throw new Error('MetaMask not found')
      if (!window.ethers) throw new Error('Ethers.js not loaded')
      if (!isConnected) throw new Error('Wallet not connected')

      const provider = new window.ethers.providers.Web3Provider(window.ethereum)
      const signer = provider.getSigner()
      const contract = new window.ethers.Contract(contractAddress, [func], signer)

      const inputs = functionInputs[functionKey] || {}
      const params = func.inputs.map(input => inputs[input.name] || '')

      // Handle payable functions
      const txOptions = {}
      if (func.stateMutability === 'payable' && inputs._value) {
        txOptions.value = window.ethers.utils.parseEther(inputs._value)
      }

      const tx = await contract[func.name](...params, txOptions)
      
      setFunctionResults(prev => ({
        ...prev,
        [functionKey]: `Transaction sent: ${tx.hash}`
      }))

      // Wait for confirmation
      const receipt = await tx.wait()
      setFunctionResults(prev => ({
        ...prev,
        [functionKey]: `Transaction confirmed in block ${receipt.blockNumber}: ${tx.hash}`
      }))

    } catch (error) {
      console.error('Error calling write function:', error)
      setErrors(prev => ({
        ...prev,
        [functionKey]: error.message
      }))
    } finally {
      setIsLoading(prev => ({ ...prev, [functionKey]: false }))
    }
  }

  const renderFunctionInputs = (func) => {
    const functionKey = func.name
    
    return (
      <div className="space-y-3">
        {func.inputs.map((input, i) => (
          <div key={i}>
            <label className="block text-sm font-medium mb-1">
              {input.name} ({input.type})
            </label>
            <input
              type="text"
              placeholder={`Enter ${input.type}`}
              value={functionInputs[functionKey]?.[input.name] || ''}
              onChange={(e) => handleInputChange(functionKey, input.name, e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm"
            />
          </div>
        ))}
        
        {func.stateMutability === 'payable' && (
          <div>
            <label className="block text-sm font-medium mb-1">
              ETH Value (optional)
            </label>
            <input
              type="text"
              placeholder="0.0"
              value={functionInputs[functionKey]?._value || ''}
              onChange={(e) => handleInputChange(functionKey, '_value', e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm"
            />
          </div>
        )}
      </div>
    )
  }

  const renderFunction = (func, isWrite = false) => {
    const functionKey = func.name
    const hasInputs = func.inputs.length > 0 || func.stateMutability === 'payable'
    const result = functionResults[functionKey]
    const error = errors[functionKey]
    const loading = isLoading[functionKey]

    return (
      <div key={functionKey} className="border border-gray-800 rounded p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {isWrite ? (
              <Edit className="w-4 h-4 text-orange-500" />
            ) : (
              <Eye className="w-4 h-4 text-blue-500" />
            )}
            <span className="font-medium">{func.name}</span>
            {func.stateMutability === 'payable' && (
              <span className="text-xs bg-yellow-900 text-yellow-300 px-2 py-1 rounded">
                PAYABLE
              </span>
            )}
          </div>
          <Button
            onClick={() => isWrite ? callWriteFunction(func) : callReadFunction(func)}
            disabled={loading || (isWrite && !isConnected)}
            size="sm"
            variant={isWrite ? "primary" : "outline"}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {loading ? 'Loading...' : 'Call'}
          </Button>
        </div>

        {hasInputs && renderFunctionInputs(func)}

        {result && (
          <div className="mt-3 p-3 bg-green-900 border border-green-700 rounded">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-sm font-medium text-green-400">Result:</span>
            </div>
            <div className="text-sm font-mono text-green-300 break-all">
              {result}
            </div>
          </div>
        )}

        {error && (
          <div className="mt-3 p-3 bg-red-900 border border-red-700 rounded">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span className="text-sm font-medium text-red-400">Error:</span>
            </div>
            <div className="text-sm text-red-300">
              {error}
            </div>
          </div>
        )}
      </div>
    )
  }

  if (!contractABI || (readFunctions.length === 0 && writeFunctions.length === 0)) {
    return (
      <Card className="mt-8">
        <div className="text-center py-8 text-gray-400">
          <AlertCircle className="w-8 h-8 mx-auto mb-2" />
          <p>Contract Interaction Unavailable</p>
          <p className="text-sm mb-4">
            {!contractABI 
              ? "No contract ABI available. Please verify the contract first." 
              : "No functions found in contract ABI."
            }
          </p>
          <div className="text-xs bg-gray-900 p-3 rounded text-left">
            <p><strong>To enable contract interaction:</strong></p>
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li>Click "Verify Contract" above</li>
              <li>Upload your contract's build artifact (.json file)</li>
              <li>Or paste the source code with compilation settings</li>
              <li>The ABI will be extracted and functions will appear here</li>
            </ol>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="mt-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Contract Interaction</h3>
        {!isConnected ? (
          <Button onClick={connectWallet} className="flex items-center gap-2">
            <Wallet className="w-4 h-4" />
            Connect Wallet
          </Button>
        ) : (
          <div className="flex items-center gap-2 text-green-400">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm">
              {account.slice(0, 6)}...{account.slice(-4)}
            </span>
          </div>
        )}
      </div>

      {walletError && (
        <div className="mb-4 p-3 bg-red-900 border border-red-700 rounded">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span className="text-sm text-red-300">
              Wallet Error: {walletError}
            </span>
          </div>
        </div>
      )}

      {/* Read Functions */}
      {readFunctions.length > 0 && (
        <div className="mb-8">
          <h4 className="font-medium mb-4 flex items-center gap-2 text-blue-400">
            <Eye className="w-4 h-4" />
            Read Functions ({readFunctions.length})
          </h4>
          <div className="space-y-4">
            {readFunctions.map(func => renderFunction(func, false))}
          </div>
        </div>
      )}

      {/* Write Functions */}
      {writeFunctions.length > 0 && (
        <div>
          <h4 className="font-medium mb-4 flex items-center gap-2 text-orange-400">
            <Edit className="w-4 h-4" />
            Write Functions ({writeFunctions.length})
          </h4>
          {!isConnected && (
            <div className="mb-4 p-3 bg-yellow-900 border border-yellow-700 rounded">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-yellow-300">
                  Connect your wallet to interact with write functions
                </span>
              </div>
            </div>
          )}
          <div className="space-y-4">
            {writeFunctions.map(func => renderFunction(func, true))}
          </div>
        </div>
      )}

    </Card>
  )
} 