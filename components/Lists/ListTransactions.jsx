import { ArrowLeftRight, X } from 'lucide-react'
import TimeAgo from '../ui/TimeAgo'
import TextLink from '../ui/TextLink'
import DisplayAddress from '../ui/DisplayAddress'
import DisplayHash from '../ui/DisplayHash'

export default function ListTransactions({ transactions, transactionStatuses, transactionDetails }) {
  return (
    <div className="space-y-3">
      {transactions.map((tx, i) => (
        <div key={i} className="px-4 py-3 bg-slate-900/50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {transactionStatuses[tx.hash] === 'failed' ? (
                <X className="w-4 h-4 text-rose-500" />
              ) : (
                <ArrowLeftRight className="w-4 h-4 text-emerald-500" />
              )}
              <span className="">
              <TextLink href={`/trx?hash=${tx.hash}`}>
                <DisplayHash hash={tx.hash} />  
              </TextLink>
              </span>
            </div>
            <div className="text-slate-600">
              <TimeAgo timestamp={tx.timestamp} />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-600">From:</span>
              <DisplayAddress address={tx.from} />
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">To:</span>
              <DisplayAddress address={tx.to} />
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Value:</span>
              <span>
                {transactionDetails[tx.hash] ? 
                  transactionDetails[tx.hash].displayValue : 
                  (tx.value ? 
                    (() => {
                      try {
                        const parsed = parseInt(tx.value, 16)
                        return isNaN(parsed) ? '0.0000 ETH' : `${(parsed / 1e18).toFixed(4)} ETH`
                      } catch {
                        return '0.0000 ETH'
                      }
                    })() : 
                    '0.0000 ETH'
                  )
                }
              </span>
            </div>

          </div>
        </div>
      ))}
      {transactions.length === 0 && (
        <div className="text-center py-4 text-gray-400">No transactions yet</div>
      )}
    </div>
  )
} 