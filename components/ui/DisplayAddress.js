import AddressIcon from '../AddressIcon'
import Link from 'next/link'

export default function DisplayAddress({ address, showIcon = true, className = 'text-sm', rightIcon = false }) {
  if (!address) return <span className="">-</span>
  
  const displayAddress = `${address.substring(0, 4)}..${address.substring(address.length - 4)}`
  
  const content = (
    <div className={`font-mono flex justify-center items-center ${className}`}>
      {showIcon && !rightIcon && <AddressIcon address={address} className='mr-2'/>}
      <Link href={`/address?address=${address}`} className="text-indigo-300 hover:underline">
        {displayAddress}
      </Link>
      {showIcon && rightIcon && <AddressIcon address={address} className='ml-2'/>}
    </div>
  )
  
  return content
} 