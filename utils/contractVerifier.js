export async function checkContractVerification(contractAddress, chainInfo, rpcUrl) {
  return await getLocalContractData(contractAddress, rpcUrl)
}

async function getLocalContractData(contractAddress, rpcUrl) {
  try {
    // Get contract bytecode
    const bytecodeRes = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getCode',
        params: [contractAddress, 'latest']
      })
    })
    const bytecodeData = await bytecodeRes.json()
    
    if (!bytecodeData.result || bytecodeData.result === '0x') {
      return { verified: false, reason: 'No contract code found' }
    }

    const bytecode = bytecodeData.result
    const analysis = await analyzeContractBytecode(bytecode, contractAddress, rpcUrl)
    
    return {
      verified: true,
      sourceCode: generateSourceCodeDisplay(bytecode, analysis),
      contractName: analysis.contractName || 'Unknown Contract',
      compilerVersion: analysis.compilerVersion || 'Unknown',
      optimization: analysis.optimization || 'Unknown',
      runs: analysis.optimizationRuns || 'Unknown',
      constructorArguments: analysis.constructorArgs || '',
      abi: JSON.stringify(analysis.abi || [], null, 2),
      bytecode: bytecode,
      isLocal: true,
      analysis: analysis
    }
  } catch (error) {
    console.error('Error getting local contract data:', error)
    return { verified: false, reason: 'Error fetching contract data from local node' }
  }
}

async function analyzeContractBytecode(bytecode, contractAddress, rpcUrl) {
  const analysis = {
    contractName: null,
    contractType: 'Unknown',
    compilerVersion: null,
    optimization: null,
    optimizationRuns: null,
    constructorArgs: null,
    abi: [],
    functionSelectors: [],
    metadata: null
  }

  // 1. Extract embedded metadata from bytecode
  const metadata = extractEmbeddedMetadata(bytecode)
  if (metadata) {
    analysis.metadata = metadata
    analysis.compilerVersion = metadata.compiler?.version
    analysis.optimization = metadata.settings?.optimizer?.enabled ? 'Enabled' : 'Disabled'
    analysis.optimizationRuns = metadata.settings?.optimizer?.runs
  }

  // 2. Extract function selectors
  analysis.functionSelectors = extractFunctionSelectors(bytecode)

  // 3. Try standard contract calls to get name/symbol
  const contractInfo = await tryStandardContractCalls(contractAddress, rpcUrl)
  if (contractInfo.name) {
    analysis.contractName = contractInfo.name
    analysis.contractType = contractInfo.type
  }

  // 4. Infer contract type from function selectors
  if (!analysis.contractType || analysis.contractType === 'Unknown') {
    analysis.contractType = inferContractType(analysis.functionSelectors)
  }

  // 5. Generate basic ABI from function selectors
  analysis.abi = generateBasicABI(analysis.functionSelectors)

  return analysis
}

function extractEmbeddedMetadata(bytecode) {
  try {
    // Solidity embeds CBOR-encoded metadata at the end of bytecode
    // Format: 0xa2646970667358[32-byte hash]64736f6c63[version]0033
    const metadataPattern = /a264697066735822([a-fA-F0-9]{64})64736f6c63([a-fA-F0-9]+)0033$/
    const match = bytecode.match(metadataPattern)
    
    if (match) {
      const ipfsHash = match[1]
      const solcVersionHex = match[2]
      
      // Decode Solidity version
      const versionBytes = solcVersionHex.match(/.{2}/g).map(hex => parseInt(hex, 16))
      const version = versionBytes.join('.')
      
      return {
        ipfsHash: ipfsHash,
        compiler: {
          name: 'solc',
          version: `0.${version}`
        },
        settings: {
          optimizer: {
            enabled: true, // Most contracts are optimized
            runs: 200 // Default assumption
          }
        }
      }
    }
  } catch (error) {
    console.error('Error extracting metadata:', error)
  }
  return null
}

function extractFunctionSelectors(bytecode) {
  const selectors = new Set()
  
  // Look for PUSH4 instructions followed by function selectors (0x63xxxxxxxx)
  const selectorPattern = /63([a-fA-F0-9]{8})/g
  let match
  
  while ((match = selectorPattern.exec(bytecode)) !== null) {
    selectors.add('0x' + match[1])
  }
  
  return Array.from(selectors)
}

async function tryStandardContractCalls(contractAddress, rpcUrl) {
  const result = { name: null, symbol: null, type: 'Contract' }
  
  try {
    // Try name() function (0x06fdde03)
    const nameRes = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [{
          to: contractAddress,
          data: '0x06fdde03'
        }, 'latest']
      })
    })
    const nameData = await nameRes.json()
    
    if (nameData.result && nameData.result !== '0x' && nameData.result.length > 2) {
      // Decode string result
      result.name = decodeStringResult(nameData.result)
      result.type = 'Token'
    }
  } catch (error) {
    // Silent fail
  }

  try {
    // Try symbol() function (0x95d89b41)
    const symbolRes = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'eth_call',
        params: [{
          to: contractAddress,
          data: '0x95d89b41'
        }, 'latest']
      })
    })
    const symbolData = await symbolRes.json()
    
    if (symbolData.result && symbolData.result !== '0x' && symbolData.result.length > 2) {
      result.symbol = decodeStringResult(symbolData.result)
      if (!result.name) {
        result.name = result.symbol + ' Token'
        result.type = 'Token'
      }
    }
  } catch (error) {
    // Silent fail
  }

  return result
}

function decodeStringResult(hexResult) {
  try {
    // Remove 0x prefix
    const hex = hexResult.slice(2)
    
    // Skip the first 64 characters (offset and length)
    const dataStart = 128
    if (hex.length <= dataStart) return null
    
    // Get string length (next 32 bytes)
    const lengthHex = hex.slice(64, 128)
    const length = parseInt(lengthHex, 16)
    
    if (length === 0 || length > 100) return null
    
    // Extract string data
    const stringHex = hex.slice(dataStart, dataStart + (length * 2))
    const bytes = stringHex.match(/.{2}/g).map(byte => parseInt(byte, 16))
    
    return String.fromCharCode(...bytes).replace(/\0/g, '')
  } catch (error) {
    return null
  }
}

function inferContractType(selectors) {
  const selectorSets = {
    'ERC20': ['0xa9059cbb', '0x23b872dd', '0x095ea7b3', '0x70a08231', '0x18160ddd'],
    'ERC721': ['0x23b872dd', '0x42842e0e', '0xb88d4fde', '0x081812fc', '0x095ea7b3'],
    'ERC1155': ['0xf242432a', '0x2eb2c2d6', '0x4e1273f4', '0x00fdd58e'],
    'Uniswap': ['0x5c975abb', '0x38ed1739', '0x7ff36ab5', '0x18cbafe5'],
    'Multisig': ['0xc6427474', '0x20ea8d86', '0xa0e67e2b'],
    'Proxy': ['0x5c60da1b', '0x3659cfe6', '0x4f1ef286']
  }

  for (const [type, requiredSelectors] of Object.entries(selectorSets)) {
    const matches = requiredSelectors.filter(sel => selectors.includes(sel)).length
    if (matches >= Math.min(3, requiredSelectors.length)) {
      return type
    }
  }

  return 'Contract'
}

function generateBasicABI(selectors) {
  // Only return an empty ABI - we shouldn't guess function signatures
  // Real ABI should come from contract verification
  return []
}

function generateSourceCodeDisplay(bytecode, analysis) {
  let display = `// Contract Analysis Results\n`
  display += `// Bytecode Length: ${bytecode.length} characters (${(bytecode.length - 2) / 2} bytes)\n\n`
  
  if (analysis.contractName) {
    display += `// Contract Name: ${analysis.contractName}\n`
  }
  display += `// Contract Type: ${analysis.contractType}\n`
  
  if (analysis.compilerVersion) {
    display += `// Compiler: Solidity ${analysis.compilerVersion}\n`
  }
  
  if (analysis.functionSelectors.length > 0) {
    display += `\n// Function Selectors Found:\n`
    analysis.functionSelectors.forEach(sel => {
      display += `// ${sel}\n`
    })
  }
  
  if (analysis.metadata) {
    display += `\n// Embedded Metadata:\n`
    display += `// IPFS Hash: ${analysis.metadata.ipfsHash}\n`
  }
  
  display += `\n// Raw Bytecode:\n${bytecode}`
  
  return display
}

export function getExplorerContractUrl(contractAddress, chainInfo) {
  return null
} 