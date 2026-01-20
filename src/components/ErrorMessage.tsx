type Props = {
  message: string
}

export function ErrorMessage({ message }: Props) {
  return (
    <div 
      className="px-4 py-3 rounded flex items-start gap-3"
      style={{ 
        background: 'var(--color-danger-muted)',
        border: '1px solid var(--color-danger)',
        fontFamily: 'var(--font-mono)',
        color: 'var(--color-chalk)',
        fontSize: '0.875rem'
      }}
    >
      <svg 
        className="w-5 h-5 flex-shrink-0 mt-0.5" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
        style={{ color: 'var(--color-danger)' }}
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <span>{message}</span>
    </div>
  )
}
