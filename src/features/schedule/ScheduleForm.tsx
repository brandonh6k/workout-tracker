import { useState, useEffect } from 'react'
import type { TemplateWithExercises } from '../templates'
import type { ScheduledWorkoutWithDetails } from './api'
import { ErrorMessage } from '../../components/ErrorMessage'
import * as api from './api'

type ExerciseWeight = {
  exercise_name: string
  target_weight: number
  order_index: number
}

type Props = {
  templates: TemplateWithExercises[]
  dayOfWeek: number
  existingSchedule?: ScheduledWorkoutWithDetails
  onComplete: () => void
  onCancel: () => void
}

export function ScheduleForm({
  templates,
  dayOfWeek,
  existingSchedule,
  onComplete,
  onCancel,
}: Props) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    existingSchedule?.template_id ?? ''
  )
  const [exerciseWeights, setExerciseWeights] = useState<ExerciseWeight[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId)

  // When template changes, reset weights
  useEffect(() => {
    if (!selectedTemplate) {
      setExerciseWeights([])
      return
    }

    if (existingSchedule && existingSchedule.template_id === selectedTemplateId) {
      // Use existing weights
      setExerciseWeights(
        selectedTemplate.template_exercises.map((ex, index) => {
          const existing = existingSchedule.scheduled_exercises.find(
            (se) => se.exercise_name === ex.exercise_name
          )
          return {
            exercise_name: ex.exercise_name,
            target_weight: existing?.target_weight ?? 0,
            order_index: index,
          }
        })
      )
    } else {
      // New schedule, initialize with zeros
      setExerciseWeights(
        selectedTemplate.template_exercises.map((ex, index) => ({
          exercise_name: ex.exercise_name,
          target_weight: 0,
          order_index: index,
        }))
      )
    }
  }, [selectedTemplateId, selectedTemplate, existingSchedule])

  const updateWeight = (exerciseName: string, weight: number) => {
    setExerciseWeights((prev) =>
      prev.map((ew) =>
        ew.exercise_name === exerciseName ? { ...ew, target_weight: weight } : ew
      )
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!selectedTemplateId) {
      setError('Select a template')
      return
    }

    setIsSubmitting(true)
    try {
      if (existingSchedule) {
        await api.updateScheduledWorkout(existingSchedule.id, exerciseWeights)
      } else {
        await api.scheduleWorkout(selectedTemplateId, dayOfWeek, exerciseWeights)
      }
      onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save schedule')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <ErrorMessage message={error} />}

      {/* Template selection */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <label htmlFor="template" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Select Template
        </label>
        <select
          id="template"
          value={selectedTemplateId}
          onChange={(e) => setSelectedTemplateId(e.target.value)}
          disabled={!!existingSchedule}
          className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800"
        >
          <option value="">Choose a template...</option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name} ({template.template_exercises.length} exercises)
            </option>
          ))}
        </select>
      </div>

      {/* Exercise weights */}
      {selectedTemplate && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Target Weights</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Set the target weight for each exercise. These will be pre-filled when you start the workout.
          </p>

          <div className="space-y-3">
            {selectedTemplate.template_exercises.map((ex) => {
              const weight = exerciseWeights.find(
                (ew) => ew.exercise_name === ex.exercise_name
              )?.target_weight ?? 0

              return (
                <div
                  key={ex.id}
                  className="flex items-center justify-between gap-4 p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">{ex.exercise_name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {ex.target_sets} sets x {ex.target_reps} reps
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateWeight(ex.exercise_name, Math.max(0, weight - 5))}
                      className="w-8 h-8 flex items-center justify-center border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={0}
                      step={2.5}
                      value={weight}
                      onChange={(e) =>
                        updateWeight(ex.exercise_name, parseFloat(e.target.value) || 0)
                      }
                      className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-center bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <span className="text-gray-500 dark:text-gray-400">#</span>
                    <button
                      type="button"
                      onClick={() => updateWeight(ex.exercise_name, weight + 5)}
                      className="w-8 h-8 flex items-center justify-center border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200"
                    >
                      +
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 font-medium disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !selectedTemplateId}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : existingSchedule ? 'Update Schedule' : 'Schedule Workout'}
        </button>
      </div>
    </form>
  )
}
