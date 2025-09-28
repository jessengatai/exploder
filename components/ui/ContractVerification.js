import { useState } from 'react'
import { Upload, Check, X, FileText, Settings, Code, AlertTriangle, Info } from 'lucide-react'
import Button from './Button'
import Card from './Card'
import { parseArtifact, validateCompilationSettings } from '../../utils/contractCompilation'

export default function ContractVerification({ contractAddress, onVerificationComplete }) {
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState(1) // 1: Method, 2: Upload, 3: Review, 4: Complete
  const [verificationMethod, setVerificationMethod] = useState('artifact')
  const [files, setFiles] = useState([]) // Support multiple files
  const [extractedData, setExtractedData] = useState(null)
  const [sourceCode, setSourceCode] = useState('')
  const [compilerVersion, setCompilerVersion] = useState('0.8.24')
  const [optimizationEnabled, setOptimizationEnabled] = useState(true)
  const [optimizationRuns, setOptimizationRuns] = useState(200)
  const [constructorArgs, setConstructorArgs] = useState('')
  const [contractName, setContractName] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationResult, setVerificationResult] = useState(null)

  const getStoredVerification = () => {
    const verifications = JSON.parse(localStorage.getItem('contractVerifications') || '{}')
    return verifications[contractAddress]
  }

  const storedVerification = getStoredVerification()

  const handleFileUpload = (event) => {
    const uploadedFiles = Array.from(event.target.files)
    
    if (verificationMethod === 'artifact') {
      // For artifacts, process immediately
      processArtifactFiles(uploadedFiles)
    } else {
      // For source files, just store them
      setFiles(uploadedFiles)
      setStep(3) // Go to review
    }
  }

  const processArtifactFiles = async (uploadedFiles) => {
    try {
      const results = []
      
      for (const file of uploadedFiles) {
        const content = await readFileContent(file)
        const parsed = parseArtifact(content)
        results.push({
          fileName: file.name,
          ...parsed
        })
      }
      
      // Use the first artifact as primary, merge others
      const primary = results[0]
      const merged = {
        contractName: primary.contractName,
        sourceCode: primary.sourceCode,
        abi: primary.abi,
        compilerVersion: primary.compilerVersion,
        optimizationEnabled: primary.optimizationEnabled,
        optimizationRuns: primary.optimizationRuns,
        allArtifacts: results
      }
      
      setExtractedData(merged)
      setContractName(merged.contractName)
      setSourceCode(merged.sourceCode)
      setCompilerVersion(merged.compilerVersion)
      setOptimizationEnabled(merged.optimizationEnabled)
      setOptimizationRuns(merged.optimizationRuns)
      setFiles(uploadedFiles)
      setStep(3) // Go to review
      
    } catch (error) {
      alert(`Error processing artifacts: ${error.message}`)
    }
  }

  const readFileContent = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target.result)
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    })
  }

  const handleVerification = async () => {
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
        abi: extractedData?.abi || [],
        method: verificationMethod,
        files: files.map(f => f.name),
        extractedData
      }

      // Store in localStorage
      const existingVerifications = JSON.parse(localStorage.getItem('contractVerifications') || '{}')
      existingVerifications[contractAddress] = {
        ...verificationData,
        timestamp: Date.now(),
        verified: true
      }
      localStorage.setItem('contractVerifications', JSON.stringify(existingVerifications))

      setVerificationResult({
        success: true,
        message: 'Contract verified successfully!'
      })

      setStep(4) // Complete

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

  const resetFlow = () => {
    setStep(1)
    setFiles([])
    setExtractedData(null)
    setSourceCode('')
    setContractName('')
    setVerificationResult(null)
  }

  // Compact button when not verified
  if (!isOpen && !storedVerification) {
    return (
      <div className="mt-4">
        <Button 
          onClick={() => setIsOpen(true)}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          Verify Contract
        </Button>
      </div>
    )
  }

  // Verified status when closed
  if (storedVerification && !isOpen) {
    return (
      <div className="mt-4 flex items-center gap-3">
        <div className="flex items-center gap-2 text-green-400">
          <Check className="w-4 h-4" />
          <span className="text-sm font-medium">Verified</span>
          <span className="text-xs text-gray-400">
            ({storedVerification.contractName})
          </span>
        </div>
        <Button 
          onClick={() => setIsOpen(true)}
          variant="ghost"
          size="sm"
        >
          View Details
        </Button>
      </div>
    )
  }

  return (
    <Card className="mt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Upload className="w-5 h-5 text-blue-400" />
          <div>
            <h3 className="text-lg font-semibold">Contract Verification</h3>
            <p className="text-sm text-gray-400">
              {storedVerification ? 'Contract already verified' : 'Verify to enable interaction'}
            </p>
          </div>
        </div>
        <Button 
          onClick={() => setIsOpen(false)}
          variant="ghost"
          size="sm"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Progress Steps */}
      {!storedVerification && (
        <div className="flex items-center gap-2 mb-6 text-sm">
          {[1, 2, 3, 4].map((num) => (
            <div key={num} className="flex items-center">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                step >= num ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'
              }`}>
                {num}
              </div>
              {num < 4 && <div className={`w-8 h-0.5 mx-1 ${
                step > num ? 'bg-blue-600' : 'bg-gray-700'
              }`} />}
            </div>
          ))}
          <span className="ml-2 text-gray-400">
            {step === 1 && 'Choose Method'}
            {step === 2 && 'Upload Files'}  
            {step === 3 && 'Review & Verify'}
            {step === 4 && 'Complete'}
          </span>
        </div>
      )}

      {/* Already Verified View */}
      {storedVerification ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-green-400 mb-4">
            <Check className="w-5 h-5" />
            <span className="font-medium">Contract Verified Successfully</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-gray-900 p-4 rounded">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Contract:</span>
                <span className="font-medium">{storedVerification.contractName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Method:</span>
                <span className="capitalize">{storedVerification.method || 'artifact'}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Compiler:</span>
                <span>{storedVerification.compilerVersion}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Verified:</span>
                <span>{new Date(storedVerification.timestamp).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-medium text-blue-400 hover:text-blue-300">
              View Source Code
            </summary>
            <div className="mt-2 bg-gray-900 p-3 rounded text-xs font-mono max-h-60 overflow-y-auto">
              <pre>{storedVerification.sourceCode}</pre>
            </div>
          </details>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Step 1: Method Selection */}
          {step === 1 && (
            <div className="space-y-4">
              <h4 className="font-medium">Choose Verification Method</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div 
                  onClick={() => setVerificationMethod('artifact')}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    verificationMethod === 'artifact' 
                      ? 'border-blue-500 bg-blue-500/10' 
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Code className="w-5 h-5 text-blue-400" />
                    <span className="font-medium">Build Artifacts</span>
                    <span className="text-xs bg-green-900 text-green-300 px-2 py-1 rounded">
                      Recommended
                    </span>
                  </div>
                  <p className="text-sm text-gray-400">
                    Upload compiled .json files from Hardhat/Foundry. 
                    Contains everything needed automatically.
                  </p>
                  <div className="mt-2 text-xs text-gray-500">
                    ✓ Automatic extraction ✓ Multiple files ✓ Complete ABI
                  </div>
                </div>

                <div 
                  onClick={() => setVerificationMethod('source')}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    verificationMethod === 'source' 
                      ? 'border-blue-500 bg-blue-500/10' 
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <FileText className="w-5 h-5 text-orange-400" />
                    <span className="font-medium">Source Code</span>
                  </div>
                  <p className="text-sm text-gray-400">
                    Manual entry of source code and compilation settings.
                    For when you don't have build artifacts.
                  </p>
                  <div className="mt-2 text-xs text-gray-500">
                    ⚠ Manual setup required ⚠ Single contract only
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => setStep(2)}>
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: File Upload */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">
                  {verificationMethod === 'artifact' ? 'Upload Build Artifacts' : 'Upload Source Files'}
                </h4>
                <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                  ← Back
                </Button>
              </div>

              <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center">
                <Upload className="w-8 h-8 mx-auto mb-3 text-gray-400" />
                <p className="mb-2">
                  {verificationMethod === 'artifact' 
                    ? 'Drop your .json artifact files here or click to browse'
                    : 'Drop your .sol source files here or click to browse'
                  }
                </p>
                <input
                  type="file"
                  multiple={verificationMethod === 'artifact'}
                  accept={verificationMethod === 'artifact' ? '.json' : '.sol'}
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="inline-block px-4 py-2 bg-blue-600 text-white rounded cursor-pointer hover:bg-blue-700"
                >
                  Choose Files
                </label>
                <p className="text-xs text-gray-500 mt-2">
                  {verificationMethod === 'artifact' 
                    ? 'You can upload multiple .json files from different contracts'
                    : 'Upload your main contract .sol file'
                  }
                </p>
              </div>

              {/* File Locations Help */}
              <div className="bg-gray-900 p-4 rounded text-sm">
                <h5 className="font-medium mb-2 text-blue-400">File Locations:</h5>
                <div className="space-y-1 text-gray-300">
                  <div><strong>Hardhat:</strong> <code className="bg-gray-800 px-1 rounded">artifacts/contracts/YourContract.sol/YourContract.json</code></div>
                  <div><strong>Foundry:</strong> <code className="bg-gray-800 px-1 rounded">out/YourContract.sol/YourContract.json</code></div>
                  <div><strong>Remix:</strong> Download from the compiler tab after compilation</div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Review & Settings */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Review & Verify</h4>
                <Button variant="ghost" size="sm" onClick={resetFlow}>
                  ← Start Over
                </Button>
              </div>

              {/* Files Uploaded */}
              {files.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium mb-2">Files Uploaded:</h5>
                  <div className="space-y-2">
                    {files.map((file, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm bg-gray-900 p-2 rounded">
                        <FileText className="w-4 h-4 text-blue-400" />
                        <span>{file.name}</span>
                        <span className="text-gray-500">({(file.size / 1024).toFixed(1)}KB)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Extracted Data Preview */}
              {extractedData && (
                <div className="bg-green-900/20 border border-green-700 p-4 rounded">
                  <div className="flex items-center gap-2 mb-2">
                    <Check className="w-4 h-4 text-green-400" />
                    <span className="text-sm font-medium text-green-400">Data Extracted Successfully</span>
                  </div>
                  <div className="text-sm space-y-1">
                    <div>Contract: <span className="font-mono">{extractedData.contractName}</span></div>
                    <div>Compiler: <span className="font-mono">{extractedData.compilerVersion}</span></div>
                    <div>Functions: <span className="font-mono">{extractedData.abi?.length || 0}</span></div>
                  </div>
                </div>
              )}

              {/* Manual Settings (for source method or override) */}
              {verificationMethod === 'source' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Source Code</label>
                    <textarea
                      value={sourceCode}
                      onChange={(e) => setSourceCode(e.target.value)}
                      placeholder="Paste your Solidity source code here..."
                      className="w-full h-40 bg-gray-900 border border-gray-700 rounded p-3 text-sm font-mono"
                    />
                  </div>

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
                </div>
              )}

              {/* Constructor Args */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Constructor Arguments (optional)
                  <Info className="w-3 h-3 inline ml-1 text-gray-400" />
                </label>
                <input
                  type="text"
                  value={constructorArgs}
                  onChange={(e) => setConstructorArgs(e.target.value)}
                  placeholder="0x000000000000000000000000..."
                  className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm font-mono"
                />
                <p className="text-xs text-gray-500 mt-1">
                  ABI-encoded constructor arguments (leave empty if constructor has no parameters)
                </p>
              </div>

              {/* Verification Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={handleVerification}
                  disabled={isVerifying || (!sourceCode.trim() && !extractedData)}
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
              </div>
            </div>
          )}

          {/* Step 4: Complete */}
          {step === 4 && verificationResult && (
            <div className="text-center py-8">
              {verificationResult.success ? (
                <>
                  <Check className="w-12 h-12 mx-auto mb-4 text-green-400" />
                  <h4 className="text-lg font-semibold text-green-400 mb-2">
                    Verification Successful!
                  </h4>
                  <p className="text-gray-400 mb-4">
                    Your contract has been verified and is ready for interaction.
                  </p>
                  <Button onClick={() => setIsOpen(false)}>
                    Close
                  </Button>
                </>
              ) : (
                <>
                  <X className="w-12 h-12 mx-auto mb-4 text-red-400" />
                  <h4 className="text-lg font-semibold text-red-400 mb-2">
                    Verification Failed
                  </h4>
                  <p className="text-gray-400 mb-4">
                    {verificationResult.message}
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button variant="outline" onClick={resetFlow}>
                      Try Again
                    </Button>
                    <Button onClick={() => setIsOpen(false)}>
                      Close
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Verification Result */}
          {verificationResult && step !== 4 && (
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
        </div>
      )}
    </Card>
  )
} 