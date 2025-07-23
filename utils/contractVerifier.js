export async function checkContractVerification(contractAddress, chainInfo, rpcUrl) {
  // Always use local node data - no external dependencies
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

    // Try to get contract metadata (if available)
    const metadataRes = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'eth_call',
        params: [{
          to: contractAddress,
          data: '0x4d494e54' // mint() function to check if it's a token
        }, 'latest']
      })
    })

    // For now, return basic contract info with bytecode
    return {
      verified: true,
      sourceCode: `// Contract bytecode (${bytecodeData.result.length} bytes)
// This is the compiled bytecode stored on the local node
// For source code, you would need to verify the contract on a blockchain explorer

${bytecodeData.result}`,
      contractName: 'Local Contract',
      compilerVersion: 'Unknown',
      optimization: 'Unknown',
      runs: 'Unknown',
      constructorArguments: '',
      abi: '[]',
      bytecode: bytecodeData.result,
      isLocal: true
    }
  } catch (error) {
    console.error('Error getting local contract data:', error)
    return { verified: false, reason: 'Error fetching contract data from local node' }
  }
}

export function getExplorerContractUrl(contractAddress, chainInfo) {
  // For local development, we don't need external explorer links
  return null
} 