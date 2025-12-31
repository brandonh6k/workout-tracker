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
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Template Details</h2>

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Template Name *
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Lower Body"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
            Notes (optional)
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any notes about this workout..."
            rows={2}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Exercises */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Exercises</h2>

        {exercises.length === 0 ? (
          <p className="text-gray-500 italic py-4 text-center">
            No exercises yet. Click "Add Exercise" to get started.
          </p>
        ) : (
          <div className="space-y-4">
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

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={addExercise}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            + Add Exercise
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium disabled:opacity-50"
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
    <div className="border border-gray-200 rounded-lg p-4 space-y-3">
      <div className="flex items-start gap-3">
        {/* Reorder buttons */}
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => onMove('up')}
            disabled={index === 0}
            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
            title="Move up"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => onMove('down')}
            disabled={index === totalCount - 1}
            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
            title="Move down"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          className="p-2 text-gray-400 hover:text-red-500"
          title="Remove exercise"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Sets and reps */}
      <div className="flex flex-wrap gap-3 pl-9">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Sets:</label>
          <input
            type="number"
            min={1}
            max={20}
            value={exercise.target_sets}
            onChange={(e) => onUpdate({ target_sets: parseInt(e.target.value) || 1 })}
            className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">
            {exercise.is_amrap ? 'Min reps:' : 'Reps:'}
          </label>
          <input
            type="number"
            min={1}
            max={100}
            value={exercise.target_reps}
            onChange={(e) => onUpdate({ target_reps: parseInt(e.target.value) || 1 })}
            className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={exercise.is_amrap}
            onChange={(e) => onUpdate({ is_amrap: e.target.checked })}
            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-600">AMRAP</span>
        </label>

        <div className="flex-1 min-w-[150px]">
          <input
            type="text"
            value={exercise.notes}
            onChange={(e) => onUpdate({ notes: e.target.value })}
            placeholder="Notes (optional)"
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
          />
        </div>
      </div>
    </div>
  )
}
