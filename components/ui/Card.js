export default function Card({ children, className = '' }) {
  return (
    <div className={`p-6 border border-zinc-900 ${className}`}>
      {children}
    </div>
  )
} 