/**
 * Node Service - Centralized service for all blockchain node interactions
 * 
 * This service provides a standardized interface for:
 * - Fetching transactions and receipts
 * - Decoding function calls
 * - Managing common RPC operations
 * - Caching frequently used data
 */

class NodeService {
  constructor(rpcUrl = 'http://localhost:8545') {
    this.rpcUrl = rpcUrl
    this.functionCache = new Map()
    this.transactionCache = new Map()
    this.receiptCache = new Map()
  }

  setRpcUrl(url) {
    this.rpcUrl = url
  }

  /**
   * Generic RPC call method
   */
  async rpcCall(method, params = []) {
    try {
      const response = await fetch(this.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Math.floor(Math.random() * 1000),
          method,
          params
        })
      })
      const result = await response.json()
      return result.result
    } catch (error) {
      console.error(`RPC call failed for ${method}:`, error)
      throw error
    }
  }

  /**
   * Get transaction by hash with caching
   */
  async getTransaction(hash) {
    if (this.transactionCache.has(hash)) {
      return this.transactionCache.get(hash)
    }

    const tx = await this.rpcCall('eth_getTransactionByHash', [hash])
    if (tx) {
      this.transactionCache.set(hash, tx)
    }
    return tx
  }

  /**
   * Get transaction receipt with caching
   */
  async getTransactionReceipt(hash) {
    if (this.receiptCache.has(hash)) {
      return this.receiptCache.get(hash)
    }

    const receipt = await this.rpcCall('eth_getTransactionReceipt', [hash])
    if (receipt) {
      this.receiptCache.set(hash, receipt)
    }
    return receipt
  }

  /**
   * Get both transaction and receipt data
   */
  async getTransactionWithReceipt(hash) {
    const [transaction, receipt] = await Promise.all([
      this.getTransaction(hash),
      this.getTransactionReceipt(hash)
    ])
    
    return {
      transaction,
      receipt,
      // Merge useful fields
      status: receipt?.status === '0x1' ? 'success' : receipt?.status === '0x0' ? 'failed' : 'pending',
      gasUsed: receipt?.gasUsed ? parseInt(receipt.gasUsed, 16) : null,
      contractAddress: receipt?.contractAddress || null
    }
  }

  /**
   * Decode function information from transaction input
   */
  decodeFunctionInfo(input) {
    if (!input || input === '0x' || input.length < 10) {
      return null
    }

    const selector = input.slice(0, 10)
    const functionName = this.getFunctionName(selector)
    
    return {
      selector,
      name: functionName,
      displayName: this.getDisplayName(functionName),
      parameters: input.slice(10) // Raw parameter data
    }
  }

  /**
   * Get function name from selector
   */
  getFunctionName(selector) {
    // Common function selectors database
    const functionSelectors = {
      '0xa9059cbb': 'transfer(address,uint256)',
      '0x23b872dd': 'transferFrom(address,address,uint256)',
      '0x095ea7b3': 'approve(address,uint256)',
      '0x70a08231': 'balanceOf(address)',
      '0x18160ddd': 'totalSupply()',
      '0x06fdde03': 'name()',
      '0x95d89b41': 'symbol()',
      '0x313ce567': 'decimals()',
      '0xd0e30db0': 'deposit()',
      '0x2e1a7d4d': 'withdraw(uint256)',
      '0x40c10f19': 'mint(address,uint256)',
      '0x42966c68': 'burn(uint256)',
      '0x8da5cb5b': 'owner()',
      '0xf2fde38b': 'transferOwnership(address)',
      '0x715018a6': 'renounceOwnership()',
      '0x5c975abb': 'pause()',
      '0x3f4ba83a': 'unpause()',
      '0x5c11d795': 'swap(uint256,uint256,address,bytes)',
      '0x38ed1739': 'swapExactTokensForTokens(uint256,uint256,address[],address,uint256)',
      '0x7ff36ab5': 'swapExactETHForTokens(uint256,address[],address,uint256)',
      '0x18cbafe5': 'swapExactTokensForETH(uint256,uint256,address[],address,uint256)',
      // Portfolio/DeFi functions
      '0x12345678': 'depositPortfolio(uint256,address)',
      '0x87654321': 'withdrawPortfolio(uint256)',
      '0xabcdef12': 'rebalancePortfolio()',
      // Add more as needed
    }

    return functionSelectors[selector] || null
  }

  /**
   * Get display-friendly function name
   */
  getDisplayName(functionSignature) {
    if (!functionSignature) return null
    
    // Extract just the function name without parameters
    const match = functionSignature.match(/^([^(]+)/)
    return match ? match[1] : null
  }

  /**
   * Enhanced transaction analysis with function decoding
   */
  async analyzeTransaction(tx) {
    const analysis = {
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: tx.value ? (parseInt(tx.value, 16) / 1e18).toFixed(4) : '0',
      isContractCreation: !tx.to,
      functionInfo: null,
      type: 'transfer'
    }

    // Decode function if there's input data
    if (tx.input && tx.input !== '0x' && tx.input.length > 2) {
      analysis.functionInfo = this.decodeFunctionInfo(tx.input)
      analysis.type = analysis.functionInfo ? 'contract_interaction' : 'contract_creation'
    }

    return analysis
  }

  /**
   * Get block with full transaction analysis
   */
  async getBlockWithAnalysis(blockNumber) {
    const block = await this.rpcCall('eth_getBlockByNumber', [blockNumber, true])
    
    if (block && block.transactions) {
      // Analyze all transactions in parallel
      const analyzedTransactions = await Promise.all(
        block.transactions.map(tx => this.analyzeTransaction(tx))
      )
      
      return {
        ...block,
        analyzedTransactions
      }
    }
    
    return block
  }

  /**
   * Clear caches (useful for development)
   */
  clearCaches() {
    this.functionCache.clear()
    this.transactionCache.clear()
    this.receiptCache.clear()
  }
}

// Create singleton instance
const nodeService = new NodeService()

export default nodeService 