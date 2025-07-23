export async function getNodeInfo(rpcUrl) {
  try {
    // Get chain ID
    const chainIdRes = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_chainId',
        params: []
      })
    })
    const chainIdData = await chainIdRes.json()
    const chainId = chainIdData.result ? parseInt(chainIdData.result, 16) : null

    // Get client version
    const clientVersionRes = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'web3_clientVersion',
        params: []
      })
    })
    const clientVersionData = await clientVersionRes.json()
    const clientVersion = clientVersionData.result || 'Unknown'

    // Get latest block
    const latestBlockRes = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 3,
        method: 'eth_blockNumber',
        params: []
      })
    })
    const latestBlockData = await latestBlockRes.json()
    const latestBlock = latestBlockData.result ? parseInt(latestBlockData.result, 16) : 0

    // Determine if it's a fork and what it might be forking
    let forkInfo = null
    if (chainId === 1) {
      forkInfo = 'Ethereum Mainnet'
    } else if (chainId === 8453) {
      forkInfo = 'Base'
    } else if (chainId === 137) {
      forkInfo = 'Polygon'
    } else if (chainId === 42161) {
      forkInfo = 'Arbitrum'
    } else if (chainId === 10) {
      forkInfo = 'Optimism'
    } else if (chainId === 56) {
      forkInfo = 'BNB Chain'
    } else if (chainId === 31337) {
      forkInfo = 'Hardhat Local'
    }

    return {
      chainId,
      clientVersion,
      latestBlock,
      forkInfo,
      isLocal: rpcUrl.includes('localhost') || rpcUrl.includes('127.0.0.1')
    }
  } catch (error) {
    console.error('Error getting node info:', error)
    return {
      chainId: null,
      clientVersion: 'Unknown',
      latestBlock: 0,
      forkInfo: null,
      isLocal: rpcUrl.includes('localhost') || rpcUrl.includes('127.0.0.1')
    }
  }
}

export async function getTransactionFailureReason(rpcUrl, txHash) {
  try {
    // Get transaction receipt
    const receiptRes = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getTransactionReceipt',
        params: [txHash]
      })
    })
    const receiptData = await receiptRes.json()
    
    if (!receiptData.result) {
      return null
    }
    
    const receipt = receiptData.result
    
    // If transaction failed
    if (receipt.status === '0x0') {
      // Try to get more detailed error info using eth_call to replay the transaction
      const txRes = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'eth_getTransactionByHash',
          params: [txHash]
        })
      })
      const txData = await txRes.json()
      
      if (txData.result) {
        const tx = txData.result
        
        // Try to replay the transaction to get error details
        const callRes = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 3,
            method: 'eth_call',
            params: [{
              from: tx.from,
              to: tx.to,
              value: tx.value,
              data: tx.input,
              gas: tx.gas
            }, receipt.blockNumber]
          })
        })
        const callData = await callRes.json()
        
        if (callData.error) {
          return {
            gasUsed: parseInt(receipt.gasUsed, 16),
            error: callData.error.message || 'Transaction reverted',
            reason: callData.error.data || null
          }
        }
      }
      
      return {
        gasUsed: parseInt(receipt.gasUsed, 16),
        error: 'Transaction failed',
        reason: null
      }
    }
    
    return null
  } catch (error) {
    console.error('Error getting transaction failure reason:', error)
    return null
  }
} 