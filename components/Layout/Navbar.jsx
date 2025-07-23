import { Search } from 'lucide-react'

export default function Navbar({ nodeInfo }) {
  return (
    <nav className="bg-black border-b border-gray-900 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          {/* Logo and Title */}
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-mono text-white">EXPLODER</h1>
            <div className="text-sm text-gray-400">
              Self-hosted Ethereum block scanner
            </div>
          </div>
          
          {/* Node Info */}
          {nodeInfo && (
            <div className="text-sm text-gray-400">
              {nodeInfo.forkInfo ? (
                <span>Forking <span className="text-blue-300">{nodeInfo.forkInfo}</span></span>
              ) : (
                <span>Local Network</span>
              )}
              {nodeInfo.latestBlock > 0 && (
                <span className="ml-2">• Block #{nodeInfo.latestBlock.toLocaleString()}</span>
              )}
            </div>
          )}
        </div>
        
        {/* Search Bar */}
        <div className="flex items-center gap-2 bg-gray-900/50 rounded-lg px-3 py-2 border border-gray-800">
          <Search className="w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search by address, transaction hash, or block number..."
            className="bg-transparent text-white placeholder-gray-400 outline-none w-80"
          />
        </div>
      </div>
    </nav>
  )
} 