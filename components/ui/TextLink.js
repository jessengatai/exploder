import Link from 'next/link'

export default function TextLink({ href, children, className = '', external = false, ...props }) {
  const baseClasses = 'text-blue-300 hover:text-blue-200 hover:underline'
  
  if (external) {
    return (
      <a 
        href={href} 
        target="_blank" 
        rel="noopener noreferrer"
        className={`${baseClasses} ${className}`}
        {...props}
      >
        {children}
      </a>
    )
  }
  
  return (
    <Link href={href} className={`${baseClasses} ${className}`} {...props}>
      {children}
    </Link>
  )
} 