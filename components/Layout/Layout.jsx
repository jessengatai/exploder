import { useState, useEffect } from 'react'
import { detectChainFromUrl } from '../../utils/chainDetector'
import Navbar from './Navbar'

export default function Layout({ children }) {
  const [chainInfo, setChainInfo] = useState(null)

  useEffect(() => {
    fetch('/config.json')
      .then(res => res.json())
      .then(config => {
        setChainInfo(detectChainFromUrl(config.rpcUrl))
      })
      .catch(() => {
        setChainInfo(detectChainFromUrl('http://localhost:8545'))
      })
  }, [])

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar chainInfo={chainInfo} />
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
} 