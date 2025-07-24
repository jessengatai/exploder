import { useState, useEffect } from 'react'

export default function TimeAgo({ timestamp, className = 'text-xs' }) {
  const [timeAgo, setTimeAgo] = useState('')

  useEffect(() => {
    if (!timestamp) {
      setTimeAgo('-')
      return
    }

    const updateTime = () => {
      const now = Date.now()
      const diff = now - timestamp
      
      if (diff < 60000) { // Less than 1 minute
        const seconds = Math.floor(diff / 1000)
        if (seconds < 5) {
          setTimeAgo('just now')
        } else {
          setTimeAgo(`${seconds} seconds ago`)
        }
      } else if (diff < 3600000) { // Less than 1 hour
        const minutes = Math.floor(diff / 60000)
        setTimeAgo(`${minutes} minute${minutes > 1 ? 's' : ''} ago`)
      } else if (diff < 86400000) { // Less than 1 day
        const hours = Math.floor(diff / 3600000)
        setTimeAgo(`${hours} hour${hours > 1 ? 's' : ''} ago`)
      } else {
        const days = Math.floor(diff / 86400000)
        setTimeAgo(`${days} day${days > 1 ? 's' : ''} ago`)
      }
    }

    // Update immediately
    updateTime()

    // Set up interval based on time difference
    const now = Date.now()
    const diff = now - timestamp
    
    let interval
    if (diff < 60000) {
      // Less than 1 minute: update every second
      interval = setInterval(updateTime, 1000)
    } else if (diff < 3600000) {
      // Less than 1 hour: update every minute
      interval = setInterval(updateTime, 60000)
    }
    // After 1 hour, no need to update

    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [timestamp])

  return (
    <span className={className}>
      {timeAgo}
    </span>
  )
} 