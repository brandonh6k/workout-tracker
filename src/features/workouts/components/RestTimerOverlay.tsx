type Props = {
  secondsRemaining: number
  isAmrap: boolean
  currentReps: number
  onAdjustReps: (delta: number) => void
  onSkip: () => void
}

export function RestTimerOverlay({
  secondsRemaining,
  isAmrap,
  currentReps,
  onAdjustReps,
  onSkip,
}: Props) {
  const isLastTenSeconds = secondsRemaining <= 10
  const minutes = Math.floor(secondsRemaining / 60)
  const seconds = secondsRemaining % 60

  return (
    <div className="absolute inset-0 bg-gray-900/95 flex flex-col items-center justify-center z-10">
      <div className="text-gray-400 text-3xl font-bold mb-4">Rest</div>
      <div
        className={`font-bold mb-4 transition-all ${
          isLastTenSeconds
            ? 'text-9xl text-sky-400'
            : 'text-8xl text-white'
        }`}
      >
        {minutes}:{seconds.toString().padStart(2, '0')}
      </div>

      {isAmrap && (
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="text-gray-400 text-sm mb-2 text-center">
            Adjust last set reps (AMRAP)
          </div>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => onAdjustReps(-1)}
              className="w-12 h-12 bg-gray-700 rounded-lg text-xl hover:bg-gray-600"
            >
              -1
            </button>
            <div className="w-20 text-center text-3xl font-bold">
              {currentReps}
            </div>
            <button
              onClick={() => onAdjustReps(1)}
              className="w-12 h-12 bg-gray-700 rounded-lg text-xl hover:bg-gray-600"
            >
              +1
            </button>
          </div>
        </div>
      )}

      <button
        onClick={onSkip}
        className="px-6 py-3 bg-gray-700 rounded-lg text-lg hover:bg-gray-600"
      >
        Skip Rest
      </button>
    </div>
  )
}
