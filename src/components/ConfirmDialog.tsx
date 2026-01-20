import { useEffect, useRef } from 'react'

type Props = {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'default'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const confirmButtonRef = useRef<HTMLButtonElement>(null)

  // Focus trap and escape key handling
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    confirmButtonRef.current?.focus()

    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onCancel])

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  const getButtonStyle = () => {
    if (variant === 'danger') {
      return { background: 'var(--color-danger)', color: 'var(--color-chalk)' }
    }
    if (variant === 'warning') {
      return { background: 'var(--color-heat)', color: 'var(--color-void)' }
    }
    return { background: 'var(--color-ember)', color: 'var(--color-void)' }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0, 0, 0, 0.75)' }}
        onClick={onCancel}
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className="relative max-w-sm w-full mx-4 overflow-hidden rounded animate-slide-up"
        style={{ 
          background: 'var(--color-iron)',
          border: '1px solid var(--color-steel)',
          boxShadow: 'var(--shadow-lg)'
        }}
      >
        <div className="p-6">
          <h2 
            id="dialog-title" 
            className="text-lg tracking-wide mb-2"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-bone)' }}
          >
            {title.toUpperCase()}
          </h2>
          <p 
            className="text-sm"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-zinc)' }}
          >
            {message}
          </p>
        </div>

        <div 
          className="flex justify-end gap-3 px-6 py-4"
          style={{ borderTop: '1px solid var(--color-steel)', background: 'var(--color-void)' }}
        >
          <button
            onClick={onCancel}
            className="btn btn-secondary text-sm"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmButtonRef}
            onClick={onConfirm}
            className="btn text-sm"
            style={getButtonStyle()}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
