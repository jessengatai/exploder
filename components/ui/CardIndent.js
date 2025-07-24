export default function CardIndent({ children, className = '' }) {
  return (
    <div className={`bg-zinc-900/40 border border-zinc-900/60 p-4 ${className}`}>
      {children}
    </div>
  )
} 