import { Box } from 'lucide-react'
import DisplayHash from '../ui/DisplayHash'
import TimeAgo from '../ui/TimeAgo'
import TextLink from '../ui/TextLink'
import CardIndent from '../ui/CardIndent'

export default function ListBlocks({ blocks }) {
  return (
    <div className="space-y-3">
      {blocks.map((block, i) => (
        <CardIndent key={i}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Box className="w-4 h-4 text-emerald-500" />
            <div>
              <div className="">
                #{parseInt(block.number, 16)}</div>
              <div className="text-slate-600">
                {block.transactions?.length || 0} transactions
              </div>
            </div>
          </div>
            <div className="text-right">
              <TextLink href={`/trx?hash=${block.hash}`}>
                <DisplayHash hash={block.hash} />
              </TextLink>
              <div className="text-slate-600">
                <TimeAgo timestamp={block.timestamp} />
              </div>
            </div>
        </div>
        </CardIndent>
      ))}
      {blocks.length === 0 && (
        <div className="text-center py-4 text-gray-400">No blocks yet</div>
      )}
    </div>
  )
} 