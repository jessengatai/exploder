import Link from 'next/link'

export default function DisplayHash({ hash, className = '', truncate = true }) {
  if (!hash) return <span className="">-</span>
  
  const displayHash = truncate ? `${hash.substring(0, 6)}...${hash.substring(hash.length - 4)}` : hash
  
  const content = (
    <span className={`${className}`}>
      {displayHash}
    </span>
  )
  
  return content
} 