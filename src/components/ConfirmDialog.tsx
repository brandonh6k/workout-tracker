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

  const variantStyles = {
    danger: {
      button: 'bg-red-600 hover:bg-red-700 text-white',
      header: 'bg-red-50 dark:bg-red-900/30',
      footer: 'bg-red-100 dark:bg-red-900/20 border-red-200 dark:border-red-800',
      title: 'text-red-900 dark:text-red-200',
      message: 'text-red-700 dark:text-red-300',
    },
    warning: {
      button: 'bg-yellow-600 hover:bg-yellow-700 text-white',
      header: 'bg-yellow-50 dark:bg-yellow-900/30',
      footer: 'bg-yellow-100 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
      title: 'text-yellow-900 dark:text-yellow-200',
      message: 'text-yellow-700 dark:text-yellow-300',
    },
    default: {
      button: 'bg-blue-600 hover:bg-blue-700 text-white',
      header: 'bg-white dark:bg-gray-800',
      footer: 'bg-gray-50 dark:bg-gray-700 border-gray-100 dark:border-gray-600',
      title: 'text-gray-900 dark:text-white',
      message: 'text-gray-600 dark:text-gray-300',
    },
  }

  const styles = variantStyles[variant]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden"
      >
        <div className={`p-6 ${styles.header}`}>
          <h2 id="dialog-title" className={`text-lg font-semibold mb-2 ${styles.title}`}>
            {title}
          </h2>
          <p className={styles.message}>{message}</p>
        </div>

        <div className={`flex justify-end gap-3 px-6 py-4 border-t ${styles.footer}`}>
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md hover:bg-gray-50 dark:hover:bg-gray-500 font-medium text-sm"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmButtonRef}
            onClick={onConfirm}
            className={`px-4 py-2 rounded-md font-medium text-sm ${styles.button}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
