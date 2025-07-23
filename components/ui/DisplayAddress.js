import AddressIcon from '../AddressIcon'
import Link from 'next/link'

export default function DisplayAddress({ address, showIcon = true, iconSize = 20, className = '', link = true }) {
  if (!address) return <span className="text-gray-500">-</span>
  
  const displayAddress = `${address.substring(0, 4)}...${address.substring(address.length - 4)}`
  
  const content = (
    <span className={`font-mono text-base ${className}`}>
      {showIcon && <AddressIcon address={address} size={iconSize} className="inline-block mr-2" />}
      {displayAddress}
    </span>
  )
  
  if (link) {
    return (
      <Link href={`/address?address=${address}`} className="text-blue-300 hover:text-blue-200 hover:underline">
        {content}
      </Link>
    )
  }
  
  return content
} 