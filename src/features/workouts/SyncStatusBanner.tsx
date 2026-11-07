import { workoutSync, useWorkoutSyncStatus } from './workoutSync'

export function SyncStatusBanner() {
  const { pending, lastError } = useWorkoutSyncStatus()
  if (pending === 0 || !lastError) return null

  return (
    <div
      role="status"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2"
      style={{
        background: 'var(--color-iron)',
        border: '1px solid var(--color-ember)',
        borderRadius: 'var(--radius-md)',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.8125rem',
        color: 'var(--color-ash)',
      }}
    >
      <span>
        {pending} change{pending !== 1 ? 's' : ''} saved on this device, waiting to sync
      </span>
      <button onClick={() => void workoutSync.flush()} style={{ color: 'var(--color-ember)' }}>
        Retry
      </button>
    </div>
  )
}
