export function detectChainFromUrl(rpcUrl) {
  const url = rpcUrl.toLowerCase()
  
  // Common RPC URL patterns
  if (url.includes('base') || url.includes('base-mainnet')) {
    return {
      name: 'Base',
      chainId: 8453,
      currency: 'ETH',
      explorer: 'https://basescan.org'
    }
  }
  
  if (url.includes('ethereum') || url.includes('mainnet') || url.includes('eth')) {
    return {
      name: 'Ethereum',
      chainId: 1,
      currency: 'ETH',
      explorer: 'https://etherscan.io'
    }
  }
  
  if (url.includes('polygon') || url.includes('matic')) {
    return {
      name: 'Polygon',
      chainId: 137,
      currency: 'MATIC',
      explorer: 'https://polygonscan.com'
    }
  }
  
  if (url.includes('arbitrum') || url.includes('arb')) {
    return {
      name: 'Arbitrum',
      chainId: 42161,
      currency: 'ETH',
      explorer: 'https://arbiscan.io'
    }
  }
  
  if (url.includes('optimism') || url.includes('opt')) {
    return {
      name: 'Optimism',
      chainId: 10,
      currency: 'ETH',
      explorer: 'https://optimistic.etherscan.io'
    }
  }
  
  if (url.includes('bsc') || url.includes('binance')) {
    return {
      name: 'BNB Chain',
      chainId: 56,
      currency: 'BNB',
      explorer: 'https://bscscan.com'
    }
  }
  
  // Default for local networks
  if (url.includes('localhost') || url.includes('127.0.0.1')) {
    return {
      name: 'Local Network',
      chainId: 31337,
      currency: 'ETH',
      explorer: null
    }
  }
  
  return {
    name: 'Unknown',
    chainId: null,
    currency: 'ETH',
    explorer: null
  }
} 