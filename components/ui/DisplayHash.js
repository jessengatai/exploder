import Link from 'next/link'

export default function DisplayHash({ hash, showIcon = false, iconSize = 20, className = '', link = true, truncate = true }) {
  if (!hash) return <span className="text-gray-500">-</span>
  
  const displayHash = truncate ? `${hash.substring(0, 6)}...${hash.substring(hash.length - 4)}` : hash
  
  const content = (
    <span className={`font-mono text-base ${className}`}>
      {displayHash}
    </span>
  )
  
  if (link) {
    return (
      <Link href={`/trx?hash=${hash}`} className="text-blue-300 hover:text-blue-200 hover:underline">
        {content}
      </Link>
    )
  }
  
  return content
} 