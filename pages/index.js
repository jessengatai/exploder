import Head from 'next/head'
import { useState, useEffect, useCallback } from 'react'
import Card from '../components/ui/Card'
import ListBlocks from '../components/Lists/ListBlocks'
import ListTransactions from '../components/Lists/ListTransactions'
import ListContracts from '../components/Lists/ListContracts'
import ListLogs from '../components/Lists/ListLogs'
import { useBlockchain } from '../contexts/BlockchainContext'
import { getTransactionFailureReason } from '../utils/nodeDetector'

export default function Home() {
  const { blocks, transactions, transactionStatuses, transactionAnalysis, logs, contracts, rpcUrl } = useBlockchain()
  const [transactionDetails, setTransactionDetails] = useState({})

  useEffect(() => {
    if (transactions.length > 0) {
      analyzeTransactions(transactions, rpcUrl)
    }
  }, [transactions, rpcUrl])

  // Create chronological list with blocks and their transactions
  const allItems = []
  
  // Add blocks with their transactions
  blocks.forEach(block => {
    allItems.push({
      ...block,
      type: 'block',
      timestamp: parseInt(block.timestamp, 16) * 1000
    })
    
    if (block.transactions && block.transactions.length > 0) {
      block.transactions.forEach(tx => {
        allItems.push({
          ...tx,
          type: 'transaction',
          blockNumber: parseInt(block.number, 16),
          timestamp: parseInt(block.timestamp, 16) * 1000
        })
      })
    }
  })
  
  // Add standalone transactions
  transactions.forEach(tx => {
    if (!allItems.find(item => item.type === 'transaction' && item.hash === tx.hash)) {
      allItems.push({
        ...tx,
        type: 'transaction',
        timestamp: Date.now()
      })
    }
  })
  
  allItems.sort((a, b) => b.timestamp - a.timestamp)
  const displayItems = allItems.slice(0, 50)

  const analyzeTransactions = useCallback(async (txs, url) => {
    const details = {}
    
    for (const tx of txs) {
      if (!tx || !tx.hash) continue
      
      let ethValue = '0.0000'
      let displayValue = '0.0000 ETH'
      
      if (tx.value && tx.value !== '0x') {
        try {
          const parsedValue = parseInt(tx.value, 16)
          if (!isNaN(parsedValue)) {
            ethValue = (parsedValue / 1e18).toFixed(4)
            displayValue = `${ethValue} ETH`
          }
        } catch (error) {
          // Silently handle parsing errors
        }
      }
      
      if (tx.input && tx.input !== '0x' && tx.input.length > 10) {
        const methodId = tx.input.substring(0, 10)
        
        if (methodId === '0xa9059cbb' || methodId === '0x23b872dd') {
          try {
            const tokenInfo = await getTokenInfo(tx.to, url)
            if (tokenInfo) {
              const amount = methodId === '0xa9059cbb' 
                ? parseInt(tx.input.substring(74), 16)
                : parseInt(tx.input.substring(138), 16)
              const formattedAmount = (amount / Math.pow(10, tokenInfo.decimals)).toFixed(4)
              displayValue = `${formattedAmount} ${tokenInfo.symbol}`
            }
          } catch (error) {
            // Silently handle token analysis errors
          }
        }
      }
      
      details[tx.hash] = { displayValue, ethValue }
    }
    
    setTransactionDetails(details)
  }, [])

  const getTokenInfo = async (tokenAddress, url) => {
    try {
      const symbolRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_call',
          params: [{
            to: tokenAddress,
            data: '0x95d89b41'
          }, 'latest']
        })
      })
      const symbolData = await symbolRes.json()
      
      const decimalsRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'eth_call',
          params: [{
            to: tokenAddress,
            data: '0x313ce567'
          }, 'latest']
        })
      })
      const decimalsData = await decimalsRes.json()
      
      if (symbolData.result && symbolData.result !== '0x') {
        return {
          symbol: decodeString(symbolData.result),
          decimals: decimalsData.result ? parseInt(decimalsData.result, 16) : 18
        }
      }
    } catch (error) {
      console.error('Error getting token info:', error)
    }
    return null
  }

  const decodeString = (hexString) => {
    try {
      const hex = hexString.slice(2)
      let str = ''
      for (let i = 0; i < hex.length; i += 2) {
        const charCode = parseInt(hex.substr(i, 2), 16)
        if (charCode === 0) break
        str += String.fromCharCode(charCode)
      }
      return str
    } catch (error) {
      return 'Unknown'
    }
  }



  return (
    <>
      <Head>
        <title>Exploder - Ethereum Block Scanner</title>
        <meta name="description" content="Self-hosted Ethereum block scanner for local development" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="grid grid-cols-1 lg:grid-cols-4">
          <Card className='border-0 border-0 border-r-1'>
            <h2 className="text-xl font-bold mb-4">Blocks</h2>
            <ListBlocks blocks={displayItems.filter(item => item.type === 'block').slice(0, 10)} />
          </Card>

          <Card className='border-0 border-r-1'>
            <h2 className="text-xl font-bold mb-4">Transactions</h2>
            <ListTransactions 
              transactions={displayItems.filter(item => 
                item.type === 'transaction' && 
                !(item.to === null || item.to === undefined)
              ).slice(0, 10)}
              transactionStatuses={transactionStatuses}
              transactionDetails={transactionDetails}
              transactionAnalysis={transactionAnalysis}
            />
          </Card>

          <Card className='border-0 border-r-1'>
            <h2 className="text-xl font-bold mb-4">Contracts</h2>
            <ListContracts contracts={contracts} />
          </Card>

          <Card className='border-0'>
            <h2 className="text-xl font-bold mb-4">Logs</h2>
            <ListLogs logs={logs} />
          </Card>
        </div>
    </>
  )
} 