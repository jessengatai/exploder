export default function Card({ children, className = '' }) {
  return (
    <div className={`p-4 border border-zinc-900 ${className}`}>
      {children}
    </div>
  )
} 