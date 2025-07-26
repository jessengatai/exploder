import { ArrowLeftRight, X } from 'lucide-react'
import TimeAgo from '../ui/TimeAgo'
import TextLink from '../ui/TextLink'
import DisplayAddress from '../ui/DisplayAddress'
import DisplayHash from '../ui/DisplayHash'
import CardIndent from '../ui/CardIndent'

export default function ListTransactions({ transactions, transactionStatuses, transactionDetails, transactionAnalysis }) {
  return (
    <div className="space-y-3">
      {transactions.map((tx, i) => (
        <CardIndent key={i}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {transactionStatuses[tx.hash] === 'failed' ? (
                <X className="w-4 h-4 text-rose-500" />
              ) : (
                <ArrowLeftRight className="w-4 h-4 text-teal-500" />
              )}
              <div>
                {transactionAnalysis[tx.hash]?.functionInfo?.displayName || 'Transaction'}
              </div>
            </div>
            <TimeAgo timestamp={tx.timestamp} />

            <div className="text-slate-600">
              <DisplayHash hash={tx.hash} />  
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <div className="">
                <DisplayAddress address={tx.from} />
              </div>
              <div className="">
                <DisplayAddress address={tx.to} rightIcon={true} />
              </div>
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
        </CardIndent>
      ))}
      {transactions.length === 0 && (
        <div className="text-center py-4 text-gray-400">No transactions yet</div>
      )}
    </div>
  )
} 