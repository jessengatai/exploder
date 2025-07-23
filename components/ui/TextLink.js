import Link from 'next/link'

export default function TextLink({ href, children, className = '', external = false, ...props }) {
  const baseClasses = 'text-emerald-400 hover:text-emerald-200 hover:underline'
  
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