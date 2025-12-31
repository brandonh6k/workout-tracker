type AdjustMode = 'weight' | 'reps' | null

type Props = {
  weight: number
  reps: number
  setNumber: number
  totalSets: number
  adjustMode: AdjustMode
  onAdjustModeChange: (mode: AdjustMode) => void
  onAdjustWeight: (delta: number) => void
  onAdjustReps: (delta: number) => void
}

export function SetDisplay({
  weight,
  reps,
  setNumber,
  totalSets,
  adjustMode,
  onAdjustModeChange,
  onAdjustWeight,
  onAdjustReps,
}: Props) {
  return (
    <div className="flex flex-col items-center mb-8">
      {/* Weight - clickable to adjust */}
      <button
        onClick={() => onAdjustModeChange(adjustMode === 'weight' ? null : 'weight')}
        className={`text-6xl font-bold transition-colors ${
          adjustMode === 'weight' ? 'text-blue-400' : 'hover:text-gray-300'
        }`}
      >
        {weight}<span className="text-3xl text-gray-400">#</span>
      </button>

      {/* Weight adjustment controls */}
      {adjustMode === 'weight' && (
        <div className="flex items-center justify-center gap-2 mt-2 mb-2">
          <button
            onClick={() => onAdjustWeight(-5)}
            className="w-12 h-12 bg-gray-700 rounded-lg text-xl hover:bg-gray-600"
          >
            -5
          </button>
          <button
            onClick={() => onAdjustWeight(-2.5)}
            className="w-12 h-12 bg-gray-700 rounded-lg hover:bg-gray-600"
          >
            -2.5
          </button>
          <button
            onClick={() => onAdjustWeight(2.5)}
            className="w-12 h-12 bg-gray-700 rounded-lg hover:bg-gray-600"
          >
            +2.5
          </button>
          <button
            onClick={() => onAdjustWeight(5)}
            className="w-12 h-12 bg-gray-700 rounded-lg text-xl hover:bg-gray-600"
          >
            +5
          </button>
        </div>
      )}

      {/* Reps - clickable to adjust */}
      <button
        onClick={() => onAdjustModeChange(adjustMode === 'reps' ? null : 'reps')}
        className={`text-4xl mt-4 transition-colors ${
          adjustMode === 'reps' ? 'text-blue-400' : 'text-gray-300 hover:text-gray-100'
        }`}
      >
        {reps} reps
      </button>

      {/* Reps adjustment controls */}
      {adjustMode === 'reps' && (
        <div className="flex items-center justify-center gap-4 mt-2">
          <button
            onClick={() => onAdjustReps(-1)}
            className="w-12 h-12 bg-gray-700 rounded-lg text-xl hover:bg-gray-600"
          >
            -1
          </button>
          <button
            onClick={() => onAdjustReps(1)}
            className="w-12 h-12 bg-gray-700 rounded-lg text-xl hover:bg-gray-600"
          >
            +1
          </button>
        </div>
      )}

      <div className="text-sm text-gray-500 mt-6">
        Set {setNumber} of {totalSets}
      </div>
    </div>
  )
}
