import { useState } from 'react'
import { ExerciseAutocomplete } from '../../components/ExerciseAutocomplete'
import { ErrorMessage } from '../../components/ErrorMessage'
import type { TemplateWithExercises } from './api'
import type { TemplateExerciseInsert } from '../../types'

type ExerciseFormData = {
  id: string // Local ID for React key
  exercise_name: string
  target_sets: number
  target_reps: number
  is_amrap: boolean
  rest_seconds: number
  notes: string
}

type Props = {
  initialData?: TemplateWithExercises
  onSubmit: (
    template: { name: string; notes: string | null },
    exercises: Omit<TemplateExerciseInsert, 'template_id'>[]
  ) => Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
}

export function TemplateForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: Props) {
  const [name, setName] = useState(initialData?.name ?? '')
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [exercises, setExercises] = useState<ExerciseFormData[]>(
    initialData?.template_exercises.map((ex) => ({
      id: ex.id,
      exercise_name: ex.exercise_name,
      target_sets: ex.target_sets,
      target_reps: ex.target_reps,
      is_amrap: ex.is_amrap,
      rest_seconds: ex.rest_seconds ?? 90,
      notes: ex.notes ?? '',
    })) ?? []
  )
  const [error, setError] = useState<string | null>(null)

  const addExercise = () => {
    setExercises([
      ...exercises,
      {
        id: crypto.randomUUID(),
        exercise_name: '',
        target_sets: 3,
        target_reps: 8,
        is_amrap: false,
        rest_seconds: 90,
        notes: '',
      },
    ])
  }

  const updateExercise = (id: string, updates: Partial<ExerciseFormData>) => {
    setExercises(
      exercises.map((ex) => (ex.id === id ? { ...ex, ...updates } : ex))
    )
  }

  const removeExercise = (id: string) => {
    setExercises(exercises.filter((ex) => ex.id !== id))
  }

  const moveExercise = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= exercises.length) return

    const newExercises = [...exercises]
    const [removed] = newExercises.splice(index, 1)
    newExercises.splice(newIndex, 0, removed)
    setExercises(newExercises)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Template name is required')
      return
    }

    const validExercises = exercises.filter((ex) => ex.exercise_name.trim())
    if (validExercises.length === 0) {
      setError('Add at least one exercise')
      return
    }

    try {
      await onSubmit(
        {
          name: name.trim(),
          notes: notes.trim() || null,
        },
        validExercises.map((ex, index) => ({
          exercise_name: ex.exercise_name.trim(),
          target_sets: ex.target_sets,
          target_reps: ex.target_reps,
          is_amrap: ex.is_amrap,
          rest_seconds: ex.rest_seconds,
          order_index: index,
          notes: ex.notes.trim() || null,
        }))
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <ErrorMessage message={error} />}

      {/* Template details */}
      <div className="card space-y-4">
        <h2 
          className="text-base tracking-wide"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ash)' }}
        >
          TEMPLATE DETAILS
        </h2>

        <div>
          <label 
            htmlFor="name" 
            className="block text-xs uppercase tracking-wider mb-2"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-zinc)' }}
          >
            Name *
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Lower Body"
            className="input w-full"
          />
        </div>

        <div>
          <label 
            htmlFor="notes" 
            className="block text-xs uppercase tracking-wider mb-2"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-zinc)' }}
          >
            Notes (optional)
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any notes about this workout..."
            rows={2}
            className="input w-full resize-none"
          />
        </div>
      </div>

      {/* Exercises */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 
            className="text-base tracking-wide"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ash)' }}
          >
            EXERCISES
          </h2>
          <span 
            className="text-xs tabular-nums"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-zinc)' }}
          >
            {exercises.length} exercise{exercises.length !== 1 ? 's' : ''}
          </span>
        </div>

        {exercises.length === 0 ? (
          <div 
            className="py-8 text-center rounded"
            style={{ background: 'var(--color-void)', border: '1px dashed var(--color-graphite)' }}
          >
            <p 
              className="text-sm mb-1"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-zinc)' }}
            >
              No exercises yet
            </p>
            <p 
              className="text-xs"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-graphite)' }}
            >
              Add exercises to build your template
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {exercises.map((exercise, index) => (
              <ExerciseRow
                key={exercise.id}
                exercise={exercise}
                index={index}
                totalCount={exercises.length}
                onUpdate={(updates) => updateExercise(exercise.id, updates)}
                onRemove={() => removeExercise(exercise.id)}
                onMove={(direction) => moveExercise(index, direction)}
              />
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={addExercise}
          className="w-full py-3 rounded text-sm uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
          style={{ 
            fontFamily: 'var(--font-display)',
            background: 'var(--color-void)',
            border: '1px dashed var(--color-graphite)',
            color: 'var(--color-ember)'
          }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Exercise
        </button>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="btn btn-secondary disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn btn-primary disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : initialData ? 'Save Changes' : 'Create Template'}
        </button>
      </div>
    </form>
  )
}

type ExerciseRowProps = {
  exercise: ExerciseFormData
  index: number
  totalCount: number
  onUpdate: (updates: Partial<ExerciseFormData>) => void
  onRemove: () => void
  onMove: (direction: 'up' | 'down') => void
}

function ExerciseRow({
  exercise,
  index,
  totalCount,
  onUpdate,
  onRemove,
  onMove,
}: ExerciseRowProps) {
  return (
    <div 
      className="rounded p-4 space-y-3"
      style={{ background: 'var(--color-void)', border: '1px solid var(--color-steel)' }}
    >
      <div className="flex items-start gap-3">
        {/* Index + Reorder buttons */}
        <div className="flex flex-col items-center gap-0.5 pt-1">
          <span 
            className="text-xs tabular-nums mb-1 w-5 text-center"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-zinc)' }}
          >
            {index + 1}
          </span>
          <button
            type="button"
            onClick={() => onMove('up')}
            disabled={index === 0}
            className="p-1 rounded transition-colors hover:bg-[var(--color-steel)] disabled:opacity-30"
            style={{ color: 'var(--color-slate)' }}
            title="Move up"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => onMove('down')}
            disabled={index === totalCount - 1}
            className="p-1 rounded transition-colors hover:bg-[var(--color-steel)] disabled:opacity-30"
            style={{ color: 'var(--color-slate)' }}
            title="Move down"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Exercise name */}
        <div className="flex-1">
          <ExerciseAutocomplete
            value={exercise.exercise_name}
            onChange={(value) => onUpdate({ exercise_name: value })}
            placeholder="Exercise name"
          />
        </div>

        {/* Remove button */}
        <button
          type="button"
          onClick={onRemove}
          className="p-2 rounded transition-colors hover:bg-[var(--color-danger-muted)]"
          style={{ color: 'var(--color-slate)' }}
          title="Remove exercise"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Sets, reps, and options */}
      <div 
        className="flex flex-wrap gap-3 pl-8 pt-3"
        style={{ borderTop: '1px solid var(--color-steel)' }}
      >
        <div className="flex items-center gap-2">
          <label 
            className="text-xs uppercase tracking-wider"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-zinc)' }}
          >
            Sets
          </label>
          <input
            type="number"
            min={1}
            max={20}
            value={exercise.target_sets}
            onChange={(e) => onUpdate({ target_sets: parseInt(e.target.value) || 0 })}
            onBlur={(e) => {
              const val = parseInt(e.target.value)
              if (!val || val < 1) onUpdate({ target_sets: 1 })
              else if (val > 20) onUpdate({ target_sets: 20 })
            }}
            className="input w-14 text-center py-1 px-2"
          />
        </div>

        <div className="flex items-center gap-2">
          <label 
            className="text-xs uppercase tracking-wider"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-zinc)' }}
          >
            {exercise.is_amrap ? 'Min' : 'Reps'}
          </label>
          <input
            type="number"
            min={1}
            max={100}
            value={exercise.target_reps}
            onChange={(e) => onUpdate({ target_reps: parseInt(e.target.value) || 0 })}
            onBlur={(e) => {
              const val = parseInt(e.target.value)
              if (!val || val < 1) onUpdate({ target_reps: 1 })
              else if (val > 100) onUpdate({ target_reps: 100 })
            }}
            className="input w-14 text-center py-1 px-2"
          />
        </div>

        <label 
          className="flex items-center gap-2 cursor-pointer px-2 py-1 rounded transition-colors"
          style={{ 
            background: exercise.is_amrap ? 'var(--color-steel)' : 'transparent',
            border: `1px solid ${exercise.is_amrap ? 'var(--color-ember)' : 'var(--color-graphite)'}` 
          }}
        >
          <input
            type="checkbox"
            checked={exercise.is_amrap}
            onChange={(e) => onUpdate({ is_amrap: e.target.checked })}
            className="sr-only"
          />
          <span 
            className="text-xs uppercase tracking-wider"
            style={{ 
              fontFamily: 'var(--font-mono)', 
              color: exercise.is_amrap ? 'var(--color-ember)' : 'var(--color-zinc)' 
            }}
          >
            AMRAP
          </span>
        </label>

        <div className="flex items-center gap-2">
          <label 
            className="text-xs uppercase tracking-wider"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-zinc)' }}
          >
            Rest
          </label>
          <select
            value={exercise.rest_seconds}
            onChange={(e) => onUpdate({ rest_seconds: parseInt(e.target.value) })}
            className="input py-1 px-2 text-sm"
          >
            <option value={60}>1:00</option>
            <option value={90}>1:30</option>
            <option value={120}>2:00</option>
            <option value={150}>2:30</option>
            <option value={180}>3:00</option>
            <option value={240}>4:00</option>
            <option value={300}>5:00</option>
          </select>
        </div>

        <div className="flex-1 min-w-[140px]">
          <input
            type="text"
            value={exercise.notes}
            onChange={(e) => onUpdate({ notes: e.target.value })}
            placeholder="Notes..."
            className="input w-full py-1 px-2 text-sm"
          />
        </div>
      </div>
    </div>
  )
}
