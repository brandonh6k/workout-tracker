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
  scheduledTemplateIds?: string[]
  onComplete: () => void
  onCancel: () => void
}

export function ScheduleForm({
  templates,
  dayOfWeek,
  existingSchedule,
  scheduledTemplateIds = [],
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

  // Filter out templates already scheduled for this day (unless editing that specific one)
  const availableTemplates = existingSchedule
    ? templates // When editing, show all templates (but dropdown is disabled anyway)
    : templates.filter((t) => !scheduledTemplateIds.includes(t.id))

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
      const message = err instanceof Error ? err.message : 'Failed to save schedule'
      // Detect unique constraint violation (template already scheduled for this day)
      if (message.includes('duplicate') || message.includes('unique') || message.includes('23505')) {
        setError('This template is already scheduled for this day')
      } else {
        setError(message)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <ErrorMessage message={error} />}

      {/* Template selection */}
      <div className="card space-y-3">
        <label 
          htmlFor="template" 
          className="block text-xs uppercase tracking-wider"
          style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-zinc)' }}
        >
          Template
        </label>
        <select
          id="template"
          value={selectedTemplateId}
          onChange={(e) => setSelectedTemplateId(e.target.value)}
          disabled={!!existingSchedule}
          className="input w-full disabled:opacity-50"
        >
          <option value="">Choose a template...</option>
          {availableTemplates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name} ({template.template_exercises.length} exercises)
            </option>
          ))}
        </select>
      </div>

      {/* Exercise weights */}
      {selectedTemplate && (
        <div className="card space-y-4">
          <div>
            <h2 
              className="text-base tracking-wide"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ash)' }}
            >
              TARGET WEIGHTS
            </h2>
            <p 
              className="text-xs mt-1"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-zinc)' }}
            >
              Pre-filled when you start the workout
            </p>
          </div>

          <div className="space-y-2">
            {selectedTemplate.template_exercises.map((ex) => {
              const weight = exerciseWeights.find(
                (ew) => ew.exercise_name === ex.exercise_name
              )?.target_weight ?? 0

              return (
                <div
                  key={ex.id}
                  className="flex items-center justify-between gap-4 p-3 rounded"
                  style={{ background: 'var(--color-void)', border: '1px solid var(--color-steel)' }}
                >
                  <div className="flex-1 min-w-0">
                    <div 
                      className="text-sm truncate"
                      style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ash)' }}
                    >
                      {ex.exercise_name}
                    </div>
                    <div 
                      className="text-xs tabular-nums"
                      style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-zinc)' }}
                    >
                      {ex.target_sets}×{ex.target_reps}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => updateWeight(ex.exercise_name, Math.max(0, weight - 5))}
                      className="w-8 h-8 flex items-center justify-center rounded transition-colors"
                      style={{ 
                        background: 'var(--color-steel)', 
                        color: 'var(--color-ash)',
                        border: '1px solid var(--color-graphite)'
                      }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                      </svg>
                    </button>
                    <div className="flex items-center">
                      <input
                        type="number"
                        min={0}
                        step={2.5}
                        value={weight}
                        onChange={(e) =>
                          updateWeight(ex.exercise_name, parseFloat(e.target.value) || 0)
                        }
                        className="input w-16 text-center py-1.5 px-1 text-sm tabular-nums"
                      />
                      <span 
                        className="text-xs ml-1"
                        style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-zinc)' }}
                      >
                        #
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateWeight(ex.exercise_name, weight + 5)}
                      className="w-8 h-8 flex items-center justify-center rounded transition-colors"
                      style={{ 
                        background: 'var(--color-steel)', 
                        color: 'var(--color-ash)',
                        border: '1px solid var(--color-graphite)'
                      }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
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
          className="btn btn-secondary disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !selectedTemplateId}
          className="btn btn-primary disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : existingSchedule ? 'Update' : 'Schedule'}
        </button>
      </div>
    </form>
  )
}
