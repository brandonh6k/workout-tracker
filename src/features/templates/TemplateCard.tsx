import type { TemplateWithExercises } from './api'

type Props = {
  template: TemplateWithExercises
  onEdit: () => void
  onDelete: () => void
  onDuplicate: () => void
}

export function TemplateCard({ template, onEdit, onDelete, onDuplicate }: Props) {
  const exerciseCount = template.template_exercises.length
  
  return (
    <div 
      className="group relative overflow-hidden transition-all rounded"
      style={{ 
        padding: 0,
        background: 'var(--color-iron)',
        border: '1px solid var(--color-steel)'
      }}
    >
      {/* Accent bar */}
      <div 
        className="absolute top-0 left-0 w-1 h-full"
        style={{ background: 'var(--color-ember)' }}
      />
      
      <div className="p-4 pl-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <h3 
              className="text-lg tracking-wide truncate"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-bone)' }}
            >
              {template.name.toUpperCase()}
            </h3>
            <div 
              className="flex items-center gap-2 mt-1 text-xs"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-zinc)' }}
            >
              <span>{exerciseCount} exercise{exerciseCount !== 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-0.5 opacity-50 group-hover:opacity-100 transition-opacity">
            <button
              onClick={onEdit}
              className="p-2 rounded transition-colors hover:bg-[var(--color-steel)]"
              style={{ color: 'var(--color-slate)' }}
              title="Edit"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
            <button
              onClick={onDuplicate}
              className="p-2 rounded transition-colors hover:bg-[var(--color-steel)]"
              style={{ color: 'var(--color-slate)' }}
              title="Duplicate"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </button>
            <button
              onClick={onDelete}
              className="p-2 rounded transition-colors hover:bg-[var(--color-danger-muted)]"
              style={{ color: 'var(--color-slate)' }}
              title="Delete"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Notes */}
        {template.notes && (
          <p 
            className="text-sm mb-3 line-clamp-2"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-zinc)' }}
          >
            {template.notes}
          </p>
        )}

        {/* Exercise list */}
        {exerciseCount > 0 ? (
          <div 
            className="pt-3 space-y-1.5"
            style={{ borderTop: '1px solid var(--color-steel)' }}
          >
            {template.template_exercises.map((exercise) => (
              <div 
                key={exercise.id} 
                className="flex justify-between items-center text-sm"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                <span style={{ color: 'var(--color-ash)' }}>{exercise.exercise_name}</span>
                <span 
                  className="tabular-nums"
                  style={{ color: 'var(--color-zinc)' }}
                >
                  {exercise.target_sets}×{exercise.target_reps}
                  {exercise.is_amrap && <span style={{ color: 'var(--color-ember)' }}>+</span>}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p 
            className="text-sm italic pt-3"
            style={{ 
              fontFamily: 'var(--font-mono)', 
              color: 'var(--color-zinc)',
              borderTop: '1px solid var(--color-steel)'
            }}
          >
            No exercises defined
          </p>
        )}
      </div>
    </div>
  )
}
