export default function Card({ children, className = '' }) {
  return (
    <div className={`bg-black p-4 border border-gray-900 rounded-xl ${className}`}>
      {children}
    </div>
  )
} 