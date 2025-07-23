export default function Button({ children, onClick, className = '', variant = 'primary', size = 'md', ...props }) {
  const baseClasses = 'rounded font-medium transition-colors duration-200'
  
  const sizes = {
    sm: 'px-2 py-1 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg'
  }
  
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-700 hover:bg-gray-600 text-white',
    outline: 'border border-gray-600 hover:bg-gray-800 text-white'
  }
  
  return (
    <button 
      className={`${baseClasses} ${sizes[size]} ${variants[variant]} ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  )
} 