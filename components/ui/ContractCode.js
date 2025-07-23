import { useState } from 'react'
import { FileText, Copy, Check, ExternalLink } from 'lucide-react'
import Button from './Button'
import TextLink from './TextLink'

export default function ContractCode({ contractInfo, explorerUrl }) {
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState('source')

  if (!contractInfo?.verified) {
    return (
      <div className="bg-gray-900 p-6 border border-gray-800 rounded">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-gray-400" />
          <h3 className="text-lg font-semibold">Contract Code</h3>
        </div>
        <div className="text-gray-400">
          <p>{contractInfo?.reason || 'This contract is not verified on the blockchain explorer.'}</p>
          {explorerUrl && (
            <p className="mt-2">
              <TextLink href={explorerUrl} external>
                View on Explorer <ExternalLink className="w-3 h-3 inline ml-1" />
              </TextLink>
            </p>
          )}
        </div>
      </div>
    )
  }

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded">
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold">Contract Code</h3>
          <span className="px-2 py-1 text-xs bg-green-900 text-green-300 rounded">
            {contractInfo.isLocal ? 'Local' : 'Verified'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {explorerUrl && (
            <TextLink href={explorerUrl} external>
              <Button variant="outline" size="sm">
                <ExternalLink className="w-4 h-4 mr-1" />
                Explorer
              </Button>
            </TextLink>
          )}
        </div>
      </div>

      {/* Contract Info */}
      <div className="p-4 border-b border-gray-800 bg-gray-950">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Name:</span>
            <div className="font-mono">{contractInfo.contractName}</div>
          </div>
          <div>
            <span className="text-gray-400">Compiler:</span>
            <div className="font-mono">{contractInfo.compilerVersion}</div>
          </div>
          <div>
            <span className="text-gray-400">Optimization:</span>
            <div className="font-mono">{contractInfo.optimization}</div>
          </div>
          <div>
            <span className="text-gray-400">Runs:</span>
            <div className="font-mono">{contractInfo.runs}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800">
        <button
          onClick={() => setActiveTab('source')}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'source'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          {contractInfo.isLocal ? 'Bytecode' : 'Source Code'}
        </button>
        {!contractInfo.isLocal && (
          <button
            onClick={() => setActiveTab('abi')}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'abi'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            ABI
          </button>
        )}
        {!contractInfo.isLocal && contractInfo.constructorArguments && (
          <button
            onClick={() => setActiveTab('constructor')}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'constructor'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Constructor Args
          </button>
        )}
      </div>

      {/* Content */}
      <div className="relative">
        <div className="absolute top-2 right-2 z-10">
          <Button
            variant="outline"
            size="sm"
            onClick={() => copyToClipboard(
              activeTab === 'source' ? contractInfo.sourceCode :
              activeTab === 'abi' ? contractInfo.abi :
              contractInfo.constructorArguments
            )}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>

        <div className="p-4 max-h-96 overflow-auto">
          {activeTab === 'source' && (
            <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
              {contractInfo.sourceCode}
            </pre>
          )}
          
          {activeTab === 'abi' && (
            <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
              {contractInfo.abi}
            </pre>
          )}
          
          {activeTab === 'constructor' && contractInfo.constructorArguments && (
            <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
              {contractInfo.constructorArguments}
            </pre>
          )}
        </div>
      </div>
    </div>
  )
} 