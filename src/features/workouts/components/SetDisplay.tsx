type AdjustMode = 'weight' | 'reps' | null

type Props = {
  weight: number
  reps: number
  adjustMode: AdjustMode
  onAdjustModeChange: (mode: AdjustMode) => void
  onAdjustWeight: (delta: number) => void
  onAdjustReps: (delta: number) => void
}

export function SetDisplay({
  weight,
  reps,
  adjustMode,
  onAdjustModeChange,
  onAdjustWeight,
  onAdjustReps,
}: Props) {
  return (
    <div className="flex flex-col items-center mb-8 w-full max-w-xs">
      {/* Weight - clickable to adjust */}
      <button
        onClick={() => onAdjustModeChange(adjustMode === 'weight' ? null : 'weight')}
        className="transition-all"
        style={{ 
          fontFamily: 'var(--font-display)',
          fontSize: '5rem',
          fontWeight: 700,
          color: adjustMode === 'weight' ? 'var(--color-ember)' : 'var(--color-chalk)',
          lineHeight: 1,
          textShadow: adjustMode === 'weight' ? '0 0 30px rgba(245, 158, 11, 0.4)' : 'none'
        }}
      >
        {weight}
        <span 
          className="text-3xl ml-1"
          style={{ color: 'var(--color-zinc)' }}
        >
          #
        </span>
      </button>

      {/* Weight adjustment controls */}
      {adjustMode === 'weight' && (
        <div 
          className="flex items-center justify-center gap-2 mt-3 mb-2 p-2 animate-fade-in"
          style={{ 
            background: 'var(--color-steel)',
            borderRadius: 'var(--radius-md)'
          }}
        >
          <AdjustButton onClick={() => onAdjustWeight(-5)} label="−5" />
          <AdjustButton onClick={() => onAdjustWeight(-2.5)} label="−2.5" small />
          <AdjustButton onClick={() => onAdjustWeight(2.5)} label="+2.5" small />
          <AdjustButton onClick={() => onAdjustWeight(5)} label="+5" />
        </div>
      )}

      {/* Reps - clickable to adjust */}
      <button
        onClick={() => onAdjustModeChange(adjustMode === 'reps' ? null : 'reps')}
        className="mt-4 transition-all"
        style={{ 
          fontFamily: 'var(--font-display)',
          fontSize: '2.5rem',
          fontWeight: 600,
          color: adjustMode === 'reps' ? 'var(--color-ember)' : 'var(--color-ash)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}
      >
        {reps} <span style={{ color: 'var(--color-zinc)', fontSize: '1.5rem' }}>reps</span>
      </button>

      {/* Reps adjustment controls */}
      {adjustMode === 'reps' && (
        <div 
          className="flex items-center justify-center gap-3 mt-3 p-2 animate-fade-in"
          style={{ 
            background: 'var(--color-steel)',
            borderRadius: 'var(--radius-md)'
          }}
        >
          <AdjustButton onClick={() => onAdjustReps(-1)} label="−1" />
          <AdjustButton onClick={() => onAdjustReps(1)} label="+1" />
        </div>
      )}

    </div>
  )
}

function AdjustButton({ 
  onClick, 
  label, 
  small 
}: { 
  onClick: () => void
  label: string
  small?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className="btn-control"
      style={{ 
        width: small ? '3.5rem' : '3rem',
        height: '3rem',
        fontSize: small ? '0.875rem' : '1.125rem'
      }}
    >
      {label}
    </button>
  )
}
