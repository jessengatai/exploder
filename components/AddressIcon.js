import { useEffect, useRef } from 'react'
import jazzicon from '@metamask/jazzicon'

export default function AddressIcon({ address, size = 20, className = '' }) {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!address || !containerRef.current) return

    const container = containerRef.current
    
    // Clear previous content
    container.innerHTML = ''
    
    // Generate jazzicon
    const icon = jazzicon(size, parseInt(address.slice(2, 10), 16))
    
    // Add to container
    container.appendChild(icon)
  }, [address, size])

  if (!address) return null

  return (
    <div
      ref={containerRef}
      className={`inline-block rounded ${className}`}
    />
  )
} 