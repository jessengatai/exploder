import Link from 'next/link'

export default function TextLink({ href, children, className = '', external = false, ...props }) {
  const baseClasses = 'text-indigo-300 hover:text-indigo-200 hover:underline'
  
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