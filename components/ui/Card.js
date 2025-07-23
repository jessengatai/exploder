export default function Card({ children, className = '' }) {
  return (
    <div className={`bg-black p-6 border border-gray-900 ${className}`}>
      {children}
    </div>
  )
} 