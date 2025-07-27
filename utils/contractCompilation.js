/**
 * Contract Compilation Utilities
 * 
 * Provides instructions and helpers for users to prepare their contracts
 * for verification in the local block explorer.
 */

export const COMPILATION_INSTRUCTIONS = {
  hardhat: {
    title: "Hardhat Project",
    steps: [
      "Compile your contract: `npx hardhat compile`",
      "Find the artifact file at: `artifacts/contracts/YourContract.sol/YourContract.json`",
      "Upload this JSON file using the 'Build Artifact' method",
      "The artifact contains source code, ABI, bytecode, and compilation settings"
    ],
    artifactPath: "artifacts/contracts/{ContractName}.sol/{ContractName}.json",
    requiredFiles: ["artifact.json"]
  },
  
  foundry: {
    title: "Foundry Project", 
    steps: [
      "Compile your contract: `forge build`",
      "Find the artifact file at: `out/YourContract.sol/YourContract.json`",
      "Upload this JSON file using the 'Build Artifact' method",
      "The artifact contains source code, ABI, bytecode, and compilation settings"
    ],
    artifactPath: "out/{ContractName}.sol/{ContractName}.json",
    requiredFiles: ["artifact.json"]
  },

  remix: {
    title: "Remix IDE",
    steps: [
      "Copy your source code from the Remix editor",
      "Go to the 'Solidity Compiler' tab",
      "Note the compiler version used",
      "Check if optimization was enabled and the number of runs",
      "Use the 'Source Code' method and paste your code manually"
    ],
    requiredFiles: ["source.sol", "compiler settings"],
    manual: true
  },

  manual: {
    title: "Manual Compilation",
    steps: [
      "You'll need the exact source code used during deployment",
      "The Solidity compiler version (e.g., 0.8.19)", 
      "Optimization settings (enabled/disabled and runs)",
      "Constructor arguments if your contract constructor takes parameters",
      "Use the 'Source Code' method and enter all details manually"
    ],
    requiredFiles: ["source.sol", "compiler version", "optimization settings"],
    manual: true
  }
}

/**
 * Extract compilation info from Hardhat/Foundry artifact
 */
export function parseArtifact(artifactContent) {
  try {
    const artifact = JSON.parse(artifactContent)
    
    return {
      contractName: artifact.contractName || 'Unknown',
      sourceCode: extractSourceFromArtifact(artifact),
      abi: artifact.abi || [],
      bytecode: artifact.bytecode || artifact.deployedBytecode || '',
      compilerVersion: artifact.metadata?.compiler?.version || 'Unknown',
      optimizationEnabled: artifact.metadata?.settings?.optimizer?.enabled || false,
      optimizationRuns: artifact.metadata?.settings?.optimizer?.runs || 200,
      metadata: artifact.metadata || null
    }
  } catch (error) {
    throw new Error('Invalid artifact file format')
  }
}

/**
 * Extract source code from artifact metadata
 */
function extractSourceFromArtifact(artifact) {
  if (!artifact.metadata?.sources) {
    return '// Source code not available in this artifact'
  }
  
  const sources = artifact.metadata.sources
  const sourceFiles = Object.keys(sources)
  
  if (sourceFiles.length === 0) {
    return '// No source files found in artifact'
  }
  
  // Find the main contract file (usually matches contract name)
  const contractName = artifact.contractName
  const mainSource = sourceFiles.find(file => 
    file.includes(contractName) || file.endsWith(`${contractName}.sol`)
  ) || sourceFiles[0]
  
  return sources[mainSource]?.content || '// Source content not available'
}

/**
 * Validate compilation settings
 */
export function validateCompilationSettings(settings) {
  const errors = []
  
  if (!settings.sourceCode?.trim()) {
    errors.push('Source code is required')
  }
  
  if (!settings.compilerVersion) {
    errors.push('Compiler version is required')
  }
  
  if (settings.optimizationEnabled && (!settings.optimizationRuns || settings.optimizationRuns < 1)) {
    errors.push('Optimization runs must be a positive number when optimization is enabled')
  }
  
  return errors
}

/**
 * Generate constructor arguments encoding instructions
 */
export function getConstructorArgsInstructions() {
  return {
    description: "Constructor arguments must be ABI-encoded",
    examples: [
      {
        solidity: "constructor(string memory _name, uint256 _supply)",
        args: "MyToken, 1000000",
        encoded: "0x000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000f42400000000000000000000000000000000000000000000000000000000000000007596f6b656e000000000000000000000000000000000000000000000000000000"
      }
    ],
    tools: [
      "Use Remix's 'Deploy' tab to see encoded constructor args",
      "Use ethers.js: `ethers.utils.defaultAbiCoder.encode(['string', 'uint256'], ['MyToken', 1000000])`",
      "Use web3.py: `web3.eth.abi.encode_abi(['string', 'uint256'], ['MyToken', 1000000])`"
    ]
  }
}

/**
 * Check if bytecode matches compilation
 * This is a basic check - in a full implementation you'd compile and compare
 */
export function checkBytecodeMatch(deployedBytecode, compiledBytecode) {
  // Remove metadata hash from both (last 43 bytes typically)
  const cleanDeployed = deployedBytecode.slice(0, -86) // Remove metadata
  const cleanCompiled = compiledBytecode.slice(0, -86)
  
  return {
    matches: cleanDeployed === cleanCompiled,
    similarity: calculateSimilarity(cleanDeployed, cleanCompiled),
    note: "This is a basic comparison. Full verification requires recompilation."
  }
}

function calculateSimilarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2
  const shorter = str1.length > str2.length ? str2 : str1
  
  if (longer.length === 0) return 1.0
  
  const matches = shorter.split('').filter((char, i) => char === longer[i]).length
  return matches / longer.length
} 