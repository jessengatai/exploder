import { Box } from 'lucide-react'
import DisplayHash from '../ui/DisplayHash'
import TimeAgo from '../ui/TimeAgo'

export default function ListBlocks({ blocks }) {
  return (
    <div className="space-y-3">
      {blocks.map((block, i) => (
        <div key={i} className="flex items-center justify-between px-4 py-3 bg-slate-900/50 rounded-lg">
          <div className="flex items-center gap-3">
            <Box className="w-4 h-4 text-emerald-500" />
            <div>
              <div className="font-mono">#{parseInt(block.number, 16)}</div>
              <div className="text-slate-600">
                {block.transactions?.length || 0} transactions
              </div>
            </div>
          </div>
                      <div className="text-right">
              <DisplayHash hash={block.hash} className="text-sm" />
              <div className="text-slate-600">
                <TimeAgo timestamp={block.timestamp} />
              </div>
            </div>
        </div>
      ))}
      {blocks.length === 0 && (
        <div className="text-center py-4 text-gray-400">No blocks yet</div>
      )}
    </div>
  )
} 