import { Box, ForkKnife, GitBranch, GitFork, Search } from 'lucide-react'

export default function Navbar({ nodeInfo }) {
  return (
    <nav className="bg-black border-b border-zinc-900 px-6 py-4">
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
            <div className="text-sm text-gray-400 flex items-center">
              {nodeInfo.forkInfo ? (
                <div className="ml-2 flex items-center gap-2"><GitFork className="w-4 h-4 text-indigo-500" /> <span>{nodeInfo.forkInfo}</span></div>
              ) : (
                <div className="ml-2 flex items-center gap-2">Local Network</div>
              )}
              {nodeInfo.latestBlock > 0 && (
                <div className="ml-2 flex items-center gap-2"><Box className="w-4 h-4 text-indigo-500" /> #{nodeInfo.latestBlock.toLocaleString()}</div>
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