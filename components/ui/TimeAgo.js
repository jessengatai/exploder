export default function TimeAgo({ timestamp, className = '' }) {
  if (!timestamp) return <span className="text-gray-500">-</span>
  
  const getRelativeTime = (timestamp) => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
    return 'just now'
  }
  
  return (
    <span className={`text-base text-gray-500 ${className}`}>
      {getRelativeTime(timestamp)}
    </span>
  )
} 