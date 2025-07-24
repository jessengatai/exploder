import { Check } from 'lucide-react'
import TimeAgo from '../ui/TimeAgo'
import TextLink from '../ui/TextLink'
import DisplayAddress from '../ui/DisplayAddress'
import DisplayHash from '../ui/DisplayHash'
import CardIndent from '../ui/CardIndent'

export default function ListContracts({ contracts }) {
  return (
    <div className="space-y-3">
      {contracts.map((contract, i) => (
        <CardIndent key={i}>  
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500" />
              <span className="">
                <TextLink href={`/address?address=${contract.address}`}>
                  <DisplayAddress address={contract.address} />
                </TextLink>
              </span>
            </div>
            <div className="text-slate-600">
              <TimeAgo timestamp={contract.timestamp} />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-600">Deployed by:</span>
              <DisplayAddress address={contract.deployer} />
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Transaction:</span>
              <TextLink href={`/trx?hash=${contract.transactionHash}`}>
                <DisplayHash hash={contract.transactionHash} />
              </TextLink>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Block:</span>
              <span>#{contract.blockNumber}</span>
            </div>
          </div>
        </CardIndent>
      ))}
      {contracts.length === 0 && (
        <div className="text-center py-4 text-gray-400">No contracts deployed yet</div>
      )}
    </div>
  )
} 