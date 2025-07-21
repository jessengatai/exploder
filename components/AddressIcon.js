import { useEffect, useRef } from 'react'
import blockies from 'blockies'

export default function AddressIcon({ address, size = 20, className = '' }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!address || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    
    // Clear canvas
    ctx.clearRect(0, 0, size, size)
    
    // Generate blockie
    const icon = blockies({
      seed: address.toLowerCase(),
      size: 8,
      scale: size / 8
    })
    
    // Draw to canvas
    ctx.drawImage(icon, 0, 0)
  }, [address, size])

  if (!address) return null

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={`inline-block rounded ${className}`}
      style={{ imageRendering: 'pixelated' }}
    />
  )
} 