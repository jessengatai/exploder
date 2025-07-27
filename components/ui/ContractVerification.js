import { useState } from 'react'
import { Upload, Check, X, FileText, Settings, Code } from 'lucide-react'
import Button from './Button'
import Card from './Card'
import { parseArtifact, validateCompilationSettings } from '../../utils/contractCompilation'

export default function ContractVerification({ contractAddress, onVerificationComplete }) {
  const [isOpen, setIsOpen] = useState(false)
  const [verificationMethod, setVerificationMethod] = useState('source') // 'source', 'artifact', 'manual'
  const [sourceCode, setSourceCode] = useState('')
  const [compilerVersion, setCompilerVersion] = useState('0.8.24')
  const [optimizationEnabled, setOptimizationEnabled] = useState(true)
  const [optimizationRuns, setOptimizationRuns] = useState(200)
  const [constructorArgs, setConstructorArgs] = useState('')
  const [contractName, setContractName] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationResult, setVerificationResult] = useState(null)

  const handleFileUpload = (event) => {
    const file = event.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target.result
      
      if (file.name.endsWith('.json')) {
        // Handle Hardhat/Foundry artifact
        try {
          const parsed = parseArtifact(content)
          setSourceCode(parsed.sourceCode)
          setContractName(parsed.contractName)
          setCompilerVersion(parsed.compilerVersion)
          setOptimizationEnabled(parsed.optimizationEnabled)
          setOptimizationRuns(parsed.optimizationRuns)
          
          // Store the ABI for contract interaction
          window.tempContractABI = parsed.abi
        } catch (error) {
          alert(`Invalid artifact file: ${error.message}`)
        }
      } else if (file.name.endsWith('.sol')) {
        // Handle Solidity source file
        setSourceCode(content)
        setContractName(file.name.replace('.sol', ''))
      } else {
        alert('Please upload a .sol or .json file')
      }
    }
    reader.readAsText(file)
  }

  const handleVerification = async () => {
    // Validate inputs
    const validationErrors = validateCompilationSettings({
      sourceCode,
      compilerVersion,
      optimizationEnabled,
      optimizationRuns
    })

    if (validationErrors.length > 0) {
      alert('Validation errors:\n' + validationErrors.join('\n'))
      return
    }

    setIsVerifying(true)
    setVerificationResult(null)

    try {
      const verificationData = {
        contractAddress,
        sourceCode,
        compilerVersion,
        optimizationEnabled,
        optimizationRuns,
        constructorArgs,
        contractName: contractName || 'Contract',
        abi: window.tempContractABI || []
      }

      // Store in localStorage for persistence
      const existingVerifications = JSON.parse(localStorage.getItem('contractVerifications') || '{}')
      existingVerifications[contractAddress] = {
        ...verificationData,
        timestamp: Date.now(),
        verified: true
      }
      localStorage.setItem('contractVerifications', JSON.stringify(existingVerifications))

      setVerificationResult({
        success: true,
        message: 'Contract verified and stored locally!'
      })

      // Notify parent component
      if (onVerificationComplete) {
        onVerificationComplete(verificationData)
      }

    } catch (error) {
      setVerificationResult({
        success: false,
        message: `Verification failed: ${error.message}`
      })
    } finally {
      setIsVerifying(false)
    }
  }

  const getStoredVerification = () => {
    const verifications = JSON.parse(localStorage.getItem('contractVerifications') || '{}')
    return verifications[contractAddress]
  }

  const storedVerification = getStoredVerification()

  if (!isOpen && !storedVerification) {
    return (
      <Button 
        onClick={() => setIsOpen(true)}
        variant="outline"
        className="flex items-center gap-2"
      >
        <Upload className="w-4 h-4" />
        Verify Contract
      </Button>
    )
  }

  if (storedVerification && !isOpen) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 text-green-400">
          <Check className="w-4 h-4" />
          <span className="text-sm">Verified Locally</span>
        </div>
        <Button 
          onClick={() => setIsOpen(true)}
          variant="outline"
          size="sm"
        >
          View Details
        </Button>
      </div>
    )
  }

  return (
    <Card className="mt-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Upload className="w-5 h-5 text-blue-400" />
          Contract Verification
        </h3>
        <Button 
          onClick={() => setIsOpen(false)}
          variant="ghost"
          size="sm"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {storedVerification ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-green-400 mb-4">
            <Check className="w-5 h-5" />
            <span className="font-medium">Contract Verified Locally</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Contract Name:</span>
                <span>{storedVerification.contractName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Compiler:</span>
                <span>{storedVerification.compilerVersion}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Optimization:</span>
                <span>{storedVerification.optimizationEnabled ? 'Enabled' : 'Disabled'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Runs:</span>
                <span>{storedVerification.optimizationRuns}</span>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <h4 className="font-medium mb-2">Source Code</h4>
            <div className="bg-gray-900 p-3 rounded text-xs font-mono max-h-60 overflow-y-auto">
              <pre>{storedVerification.sourceCode}</pre>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Verification Method Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Verification Method</label>
            <div className="flex gap-2">
              <Button
                variant={verificationMethod === 'source' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setVerificationMethod('source')}
              >
                <FileText className="w-4 h-4 mr-1" />
                Source Code
              </Button>
              <Button
                variant={verificationMethod === 'artifact' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setVerificationMethod('artifact')}
              >
                <Code className="w-4 h-4 mr-1" />
                Build Artifact
              </Button>
            </div>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Upload {verificationMethod === 'artifact' ? 'Contract Artifact (.json)' : 'Source Code (.sol)'}
            </label>
            <input
              type="file"
              accept={verificationMethod === 'artifact' ? '.json' : '.sol'}
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
            />
            <p className="text-xs text-gray-500 mt-1">
              {verificationMethod === 'artifact' 
                ? 'Upload the JSON artifact from your build output (e.g., artifacts/contracts/Contract.sol/Contract.json)'
                : 'Upload your Solidity source file (.sol)'
              }
            </p>
          </div>

          {/* Manual Source Code Input */}
          <div>
            <label className="block text-sm font-medium mb-2">Source Code</label>
            <textarea
              value={sourceCode}
              onChange={(e) => setSourceCode(e.target.value)}
              placeholder="Paste your Solidity source code here..."
              className="w-full h-40 bg-gray-900 border border-gray-700 rounded p-3 text-sm font-mono"
            />
          </div>

          {/* Compilation Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Contract Name</label>
              <input
                type="text"
                value={contractName}
                onChange={(e) => setContractName(e.target.value)}
                placeholder="MyContract"
                className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Compiler Version</label>
              <select
                value={compilerVersion}
                onChange={(e) => setCompilerVersion(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm"
              >
                <option value="0.8.28">0.8.28</option>
                <option value="0.8.27">0.8.27</option>
                <option value="0.8.26">0.8.26</option>
                <option value="0.8.25">0.8.25</option>
                <option value="0.8.24">0.8.24</option>
                <option value="0.8.23">0.8.23</option>
                <option value="0.8.22">0.8.22</option>
                <option value="0.8.21">0.8.21</option>
                <option value="0.8.20">0.8.20</option>
                <option value="0.8.19">0.8.19</option>
                <option value="0.8.18">0.8.18</option>
                <option value="0.8.17">0.8.17</option>
                <option value="0.8.16">0.8.16</option>
                <option value="0.8.15">0.8.15</option>
                <option value="0.7.6">0.7.6</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={optimizationEnabled}
                  onChange={(e) => setOptimizationEnabled(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Enable Optimization</span>
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Optimization Runs</label>
              <input
                type="number"
                value={optimizationRuns}
                onChange={(e) => setOptimizationRuns(parseInt(e.target.value) || 200)}
                disabled={!optimizationEnabled}
                className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm disabled:opacity-50"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Constructor Arguments (optional)</label>
            <input
              type="text"
              value={constructorArgs}
              onChange={(e) => setConstructorArgs(e.target.value)}
              placeholder="0x000000000000000000000000..."
              className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm font-mono"
            />
            <p className="text-xs text-gray-500 mt-1">
              ABI-encoded constructor arguments (if your contract constructor takes parameters)
            </p>
          </div>

          {/* Verification Result */}
          {verificationResult && (
            <div className={`p-3 rounded flex items-center gap-2 ${
              verificationResult.success 
                ? 'bg-green-900 text-green-300' 
                : 'bg-red-900 text-red-300'
            }`}>
              {verificationResult.success ? (
                <Check className="w-4 h-4" />
              ) : (
                <X className="w-4 h-4" />
              )}
              <span className="text-sm">{verificationResult.message}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleVerification}
              disabled={isVerifying || !sourceCode.trim()}
              className="flex items-center gap-2"
            >
              {isVerifying ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Verify Contract
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 p-4 bg-gray-900 rounded text-sm">
        <h4 className="font-medium mb-2 text-blue-400">How to get your contract files:</h4>
        <div className="space-y-2 text-gray-300">
          <div>
            <strong>Hardhat:</strong> Find artifacts in <code className="bg-gray-800 px-1 rounded">artifacts/contracts/YourContract.sol/YourContract.json</code>
          </div>
          <div>
            <strong>Foundry:</strong> Find artifacts in <code className="bg-gray-800 px-1 rounded">out/YourContract.sol/YourContract.json</code>
          </div>
          <div>
            <strong>Remix:</strong> Copy source code from the editor and compilation details from the compiler tab
          </div>
          <div>
            <strong>Manual:</strong> Provide the exact source code and compiler settings used during deployment
          </div>
        </div>
      </div>
    </Card>
  )
} 