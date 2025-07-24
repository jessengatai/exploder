import Link from 'next/link'

export default function DisplayHash({ hash, className = 'text-sm', truncate = true }) {
  if (!hash) return <span className="">-</span>
  
  const displayHash = truncate ? `${hash.substring(0, 4)}..${hash.substring(hash.length - 4)}` : hash
  
  const content = (
    <div className={`font-mono flex justify-center items-center ${className}`}>
      <div className='mr-1 text-gray-700'>#</div>
      <Link href={`/trx?hash=${hash}`} className="text-indigo-300 hover:underline">
        {displayHash}
      </Link>
    </div>
  )
  
  return content
} 