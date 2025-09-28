import { useState, useEffect } from 'react'
import { Eye, Code, AlertCircle, Info } from 'lucide-react'
import Button from './Button'
import Card from './Card'

export default function ContractInteraction({ contractAddress, contractABI, userVerification }) {
  const [readFunctions, setReadFunctions] = useState([])
  const [writeFunctions, setWriteFunctions] = useState([])
  const [functionInputs, setFunctionInputs] = useState({})
  const [functionResults, setFunctionResults] = useState({})
  const [isLoading, setIsLoading] = useState({})
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (contractABI) {
      categorizeABIFunctions()
    }
  }, [contractABI])

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
      // For local block explorer, we'll show a message that read calls aren't supported
      // In a real implementation, this would call the local node directly
      setFunctionResults(prev => ({
        ...prev,
        [functionKey]: 'Read function calls require direct node connection (not implemented in local explorer)'
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

  const renderFunctionInputs = (func) => {
    if (!func.inputs || func.inputs.length === 0) return null

    return (
      <div className="space-y-2 mb-3">
        {func.inputs.map((input, index) => (
          <div key={index}>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              {input.name} ({input.type})
            </label>
            <input
              type="text"
              placeholder={`Enter ${input.type}`}
              value={functionInputs[func.name]?.[input.name] || ''}
              onChange={(e) => handleInputChange(func.name, input.name, e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm font-mono"
            />
          </div>
        ))}
      </div>
    )
  }

  const renderFunctionResult = (func) => {
    const functionKey = func.name
    const result = functionResults[functionKey]
    const error = errors[functionKey]
    const loading = isLoading[functionKey]

    if (loading) {
      return (
        <div className="mt-3 p-3 bg-blue-900/20 border border-blue-700 rounded text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-blue-400">Calling function...</span>
          </div>
        </div>
      )
    }

    if (error) {
      return (
        <div className="mt-3 p-3 bg-red-900/20 border border-red-700 rounded text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span className="text-red-400">Error: {error}</span>
          </div>
        </div>
      )
    }

    if (result !== undefined) {
      return (
        <div className="mt-3 p-3 bg-green-900/20 border border-green-700 rounded text-sm">
          <div className="text-green-400 text-xs font-medium mb-1">Result:</div>
          <div className="font-mono text-white break-all">{String(result)}</div>
        </div>
      )
    }

    return null
  }

  if (!contractABI || contractABI.length === 0) {
    return (
      <Card className="mt-8">
        <div className="text-center py-8">
          <Code className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold mb-2">Contract Interaction</h3>
          <p className="text-gray-400">
            Verify the contract first to enable function interaction
          </p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="mt-8">
      <div className="flex items-center gap-3 mb-6">
        <Code className="w-5 h-5 text-blue-400" />
        <div>
          <h3 className="text-lg font-semibold">Contract Functions</h3>
          <p className="text-sm text-gray-400">
            View contract functions and their signatures
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="mb-6 p-4 bg-blue-900/20 border border-blue-700 rounded">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-400 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-400 mb-1">Local Block Explorer</h4>
            <p className="text-sm text-gray-300">
              This is a read-only interface for exploring contract functions. 
              For actual contract interaction, use your development tools (Hardhat, Foundry) or a wallet interface.
            </p>
          </div>
        </div>
      </div>

      {/* Read Functions */}
      {readFunctions.length > 0 && (
        <div className="mb-8">
          <h4 className="font-medium mb-4 flex items-center gap-2">
            <Eye className="w-4 h-4 text-green-400" />
            Read Functions ({readFunctions.length})
          </h4>
          <div className="space-y-4">
            {readFunctions.map((func, index) => (
              <div key={index} className="bg-gray-900 border border-gray-700 rounded p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="font-mono text-green-400">{func.name}</span>
                    <span className="text-xs text-gray-500 ml-2">
                      {func.stateMutability}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => callReadFunction(func)}
                    disabled={isLoading[func.name]}
                    className="text-xs"
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    Query
                  </Button>
                </div>

                {/* Function Inputs */}
                {renderFunctionInputs(func)}

                {/* Function Signature */}
                <div className="text-xs text-gray-500 font-mono mb-2">
                  {func.name}({func.inputs?.map(input => `${input.type} ${input.name}`).join(', ')})
                  {func.outputs?.length > 0 && ` → ${func.outputs.map(output => output.type).join(', ')}`}
                </div>

                {/* Function Result */}
                {renderFunctionResult(func)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Write Functions */}
      {writeFunctions.length > 0 && (
        <div>
          <h4 className="font-medium mb-4 flex items-center gap-2">
            <Code className="w-4 h-4 text-orange-400" />
            Write Functions ({writeFunctions.length})
          </h4>
          <div className="space-y-4">
            {writeFunctions.map((func, index) => (
              <div key={index} className="bg-gray-900 border border-gray-700 rounded p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="font-mono text-orange-400">{func.name}</span>
                    <span className="text-xs text-gray-500 ml-2">
                      {func.stateMutability || 'nonpayable'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
                    Write Only
                  </div>
                </div>

                {/* Function Signature */}
                <div className="text-xs text-gray-500 font-mono">
                  {func.name}({func.inputs?.map(input => `${input.type} ${input.name}`).join(', ')})
                  {func.outputs?.length > 0 && ` → ${func.outputs.map(output => output.type).join(', ')}`}
                </div>

                {/* Function Inputs (for display only) */}
                {func.inputs && func.inputs.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <div className="text-xs font-medium text-gray-400">Parameters:</div>
                    {func.inputs.map((input, inputIndex) => (
                      <div key={inputIndex} className="text-xs text-gray-500 font-mono pl-2">
                        {input.name}: {input.type}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {readFunctions.length === 0 && writeFunctions.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <Code className="w-8 h-8 mx-auto mb-2" />
          <p>No functions found in contract ABI</p>
        </div>
      )}
    </Card>
  )
} 