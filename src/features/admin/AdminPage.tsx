import { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { getAllExercises, updateExerciseType, updateExerciseCategory, updateExercise, deleteCustomExercise, mergeExercises } from './api'
import type { Exercise, ExerciseType } from '../../types'

type TypeFilter = 'all' | 'weighted' | 'bodyweight' | 'cardio' | 'custom'

export function AdminPage() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [mergeSource, setMergeSource] = useState<Exercise | null>(null)
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null)

  useEffect(() => {
    loadExercises()
  }, [])

  const loadExercises = async () => {
    setIsLoading(true)
    try {
      const data = await getAllExercises()
      setExercises(data)
    } catch (err) {
      console.error('Failed to load exercises:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Get unique categories for filter pills
  const categories = useMemo(() => {
    const cats = new Set<string>()
    exercises.forEach((e) => {
      if (e.category) cats.add(e.category)
    })
    return Array.from(cats).sort()
  }, [exercises])

  const handleTypeChange = async (exercise: Exercise, newType: ExerciseType) => {
    try {
      await updateExerciseType(exercise.id, newType)
      setExercises((prev) =>
        prev.map((e) => (e.id === exercise.id ? { ...e, exercise_type: newType } : e))
      )
    } catch (err) {
      console.error('Failed to update exercise type:', err)
      toast.error('Failed to update exercise type')
    }
  }

  const handleCategoryChange = async (exercise: Exercise, newCategory: string | null) => {
    try {
      await updateExerciseCategory(exercise.id, newCategory)
      setExercises((prev) =>
        prev.map((e) => (e.id === exercise.id ? { ...e, category: newCategory } : e))
      )
    } catch (err) {
      console.error('Failed to update exercise category:', err)
      toast.error('Failed to update category')
    }
  }

  const handleSaveEdit = async (exerciseId: string, updates: { name?: string; category?: string | null; exercise_type?: ExerciseType }) => {
    try {
      await updateExercise(exerciseId, updates)
      setExercises((prev) =>
        prev.map((e) => (e.id === exerciseId ? { ...e, ...updates } : e))
      )
      setEditingExercise(null)
      toast.success('Exercise updated')
    } catch (err) {
      console.error('Failed to update exercise:', err)
      toast.error('Failed to update exercise')
    }
  }

  const handleDelete = async (exercise: Exercise) => {
    if (!exercise.is_custom) return

    try {
      await deleteCustomExercise(exercise.id)
      setExercises((prev) => prev.filter((e) => e.id !== exercise.id))
      toast.success(`Deleted "${exercise.name}"`)
    } catch (err) {
      console.error('Failed to delete exercise:', err)
      toast.error('Failed to delete exercise')
    }
  }

  const handleConfirmMerge = async (targetName: string) => {
    if (!mergeSource || !targetName) return

    try {
      const result = await mergeExercises(mergeSource.name, targetName)
      
      if (mergeSource.is_custom) {
        await deleteCustomExercise(mergeSource.id)
        setExercises((prev) => prev.filter((e) => e.id !== mergeSource.id))
      }
      
      toast.success(`Merged! Updated ${result.loggedSets} sets, ${result.templateExercises} templates, ${result.scheduledExercises} scheduled.`)
      setMergeSource(null)
    } catch (err) {
      console.error('Failed to merge exercises:', err)
      toast.error('Failed to merge exercises')
    }
  }

  // Filter exercises by search (name OR category), type filter, and category filter
  const filteredExercises = exercises.filter((e) => {
    // Search filter - matches name or category
    if (search) {
      const searchLower = search.toLowerCase()
      const nameMatch = e.name.toLowerCase().includes(searchLower)
      const categoryMatch = e.category?.toLowerCase().includes(searchLower)
      if (!nameMatch && !categoryMatch) return false
    }
    // Type filter
    if (typeFilter === 'custom') {
      if (!e.is_custom) return false
    } else if (typeFilter !== 'all') {
      if (e.exercise_type !== typeFilter) return false
    }
    // Category filter
    if (categoryFilter && e.category !== categoryFilter) return false
    return true
  })

  const typeCounts = {
    all: exercises.length,
    weighted: exercises.filter((e) => e.exercise_type === 'weighted').length,
    bodyweight: exercises.filter((e) => e.exercise_type === 'bodyweight').length,
    cardio: exercises.filter((e) => e.exercise_type === 'cardio').length,
    custom: exercises.filter((e) => e.is_custom).length,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 
          className="text-2xl tracking-wide"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-bone)' }}
        >
          ADMIN
        </h1>
        <p 
          className="text-sm mt-1"
          style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-zinc)' }}
        >
          Exercise library management
        </p>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div 
          className="px-4 py-3"
          style={{ borderBottom: '1px solid var(--color-steel)' }}
        >
          <h2 
            className="text-sm tracking-wide"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ash)' }}
          >
            EXERCISE LIBRARY
          </h2>
          <p 
            className="text-xs mt-0.5"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-zinc)' }}
          >
            {exercises.length} total exercises
          </p>
        </div>

        {/* Filters */}
        <div 
          className="px-4 py-3 space-y-3"
          style={{ borderBottom: '1px solid var(--color-steel)', background: 'var(--color-void)' }}
        >
          <input
            type="text"
            placeholder="Search by name or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input w-full"
          />
          
          {/* Type filter pills */}
          <div className="flex flex-wrap gap-2">
            {(['all', 'weighted', 'bodyweight', 'cardio', 'custom'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setTypeFilter(f)}
                className="px-3 py-1 text-xs uppercase tracking-wider rounded transition-colors"
                style={{ 
                  fontFamily: 'var(--font-mono)',
                  background: typeFilter === f ? 'var(--color-ember)' : 'var(--color-steel)',
                  color: typeFilter === f ? 'var(--color-void)' : 'var(--color-ash)'
                }}
              >
                {f} ({typeCounts[f]})
              </button>
            ))}
          </div>

          {/* Category filter pills */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              <span 
                className="text-[10px] uppercase tracking-wider"
                style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-zinc)' }}
              >
                Category:
              </span>
              <button
                onClick={() => setCategoryFilter(null)}
                className="px-2 py-0.5 text-[10px] uppercase tracking-wider rounded transition-colors"
                style={{ 
                  fontFamily: 'var(--font-mono)',
                  background: categoryFilter === null ? 'var(--color-graphite)' : 'transparent',
                  color: categoryFilter === null ? 'var(--color-chalk)' : 'var(--color-zinc)',
                  border: `1px solid ${categoryFilter === null ? 'var(--color-graphite)' : 'var(--color-steel)'}`
                }}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className="px-2 py-0.5 text-[10px] uppercase tracking-wider rounded transition-colors"
                  style={{ 
                    fontFamily: 'var(--font-mono)',
                    background: categoryFilter === cat ? 'var(--color-graphite)' : 'transparent',
                    color: categoryFilter === cat ? 'var(--color-chalk)' : 'var(--color-zinc)',
                    border: `1px solid ${categoryFilter === cat ? 'var(--color-graphite)' : 'var(--color-steel)'}`
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Exercise List */}
        {isLoading ? (
          <div 
            className="p-6 text-center"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-zinc)' }}
          >
            Loading...
          </div>
        ) : filteredExercises.length === 0 ? (
          <div 
            className="p-6 text-center"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-zinc)' }}
          >
            No exercises found
          </div>
        ) : (
          <div>
            {filteredExercises.map((exercise, i) => (
              <ExerciseRow
                key={exercise.id}
                exercise={exercise}
                categories={categories}
                onTypeChange={handleTypeChange}
                onCategoryChange={handleCategoryChange}
                onEdit={() => setEditingExercise(exercise)}
                onDelete={handleDelete}
                onMerge={() => setMergeSource(exercise)}
                isLast={i === filteredExercises.length - 1}
              />
            ))}
          </div>
        )}
      </div>

      {/* Merge Dialog */}
      {mergeSource && (
        <MergeDialog
          source={mergeSource}
          exercises={exercises.filter((e) => e.id !== mergeSource.id)}
          onConfirm={handleConfirmMerge}
          onCancel={() => setMergeSource(null)}
        />
      )}

      {/* Edit Dialog */}
      {editingExercise && (
        <EditDialog
          exercise={editingExercise}
          categories={categories}
          onSave={handleSaveEdit}
          onCancel={() => setEditingExercise(null)}
        />
      )}

    </div>
  )
}

// Close button component for dialogs
function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="absolute top-3 right-3 text-xl leading-none transition-colors hover-text-chalk"
      style={{ color: 'var(--color-zinc)' }}
      title="Close"
    >
      ×
    </button>
  )
}

type MergeStep = 'select' | 'confirm'

function MergeDialog({
  source,
  exercises,
  onConfirm,
  onCancel,
}: {
  source: Exercise
  exercises: Exercise[]
  onConfirm: (targetName: string) => void
  onCancel: () => void
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null)
  const [step, setStep] = useState<MergeStep>('select')

  const filteredExercises = exercises.filter((e) =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />

      <div
        className="relative rounded shadow-xl w-full max-w-md mx-4"
        style={{ background: 'var(--color-iron)', border: '1px solid var(--color-steel)' }}
      >
        <CloseButton onClick={onCancel} />

        {step === 'select' ? (
          <>
            <div className="px-4 py-3 pr-10" style={{ borderBottom: '1px solid var(--color-steel)' }}>
              <h3
                className="text-sm tracking-wide"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-bone)' }}
              >
                MERGE EXERCISE
              </h3>
              <p
                className="text-xs mt-0.5"
                style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-zinc)' }}
              >
                Merge "{source.name}" into another exercise
              </p>
            </div>

            <div className="p-4 space-y-3">
              <input
                type="text"
                placeholder="Search for target exercise..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setSelectedTarget(null)
                }}
                className="input w-full text-sm"
                autoFocus
              />

              <div
                className="max-h-60 overflow-y-auto rounded"
                style={{ border: '1px solid var(--color-steel)' }}
              >
                {filteredExercises.length === 0 ? (
                  <div
                    className="p-3 text-sm italic"
                    style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-zinc)' }}
                  >
                    No exercises found
                  </div>
                ) : (
                  filteredExercises.map((exercise) => (
                    <button
                      key={exercise.id}
                      onClick={() => setSelectedTarget(exercise.name)}
                      className="w-full px-3 py-2 text-left text-sm flex items-center justify-between transition-colors"
                      style={{
                        fontFamily: 'var(--font-mono)',
                        background: selectedTarget === exercise.name ? 'var(--color-steel)' : 'transparent',
                        color: selectedTarget === exercise.name ? 'var(--color-ember)' : 'var(--color-ash)',
                      }}
                    >
                      <span>{exercise.name}</span>
                      {exercise.is_custom && (
                        <span className="text-xs" style={{ color: 'var(--color-zinc)' }}>custom</span>
                      )}
                    </button>
                  ))
                )}
              </div>

              {selectedTarget && (
                <div
                  className="text-sm p-2 rounded"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    background: 'var(--color-steel)',
                    color: 'var(--color-ash)',
                  }}
                >
                  Will merge <strong style={{ color: 'var(--color-chalk)' }}>{source.name}</strong> → <strong style={{ color: 'var(--color-ember)' }}>{selectedTarget}</strong>
                </div>
              )}
            </div>

            <div className="px-4 py-3 flex justify-end gap-2" style={{ borderTop: '1px solid var(--color-steel)' }}>
              <button
                onClick={onCancel}
                className="btn-ghost text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => setStep('confirm')}
                disabled={!selectedTarget}
                className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="px-4 py-3 pr-10" style={{ borderBottom: '1px solid var(--color-steel)' }}>
              <h3
                className="text-sm tracking-wide"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-bone)' }}
              >
                CONFIRM MERGE
              </h3>
            </div>

            <div className="p-4 space-y-4">
              <p
                className="text-sm"
                style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ash)' }}
              >
                Merge <strong style={{ color: 'var(--color-chalk)' }}>"{source.name}"</strong> into{' '}
                <strong style={{ color: 'var(--color-ember)' }}>"{selectedTarget}"</strong>?
              </p>

              <div
                className="rounded p-3 space-y-2"
                style={{ background: 'var(--color-steel)', border: '1px solid var(--color-concrete)' }}
              >
                <p
                  className="text-sm"
                  style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ember)' }}
                >
                  This will update:
                </p>
                <ul
                  className="text-sm list-disc list-inside space-y-1"
                  style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ash)' }}
                >
                  <li>All logged sets with this exercise</li>
                  <li>All template exercises</li>
                  <li>All scheduled exercises</li>
                </ul>
              </div>

              <p
                className="text-sm"
                style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-danger)' }}
              >
                This action cannot be undone.
              </p>
            </div>

            <div className="px-4 py-3 flex justify-end gap-2" style={{ borderTop: '1px solid var(--color-steel)' }}>
              <button
                onClick={() => setStep('select')}
                className="btn-ghost text-sm"
              >
                Back
              </button>
              <button
                onClick={() => onConfirm(selectedTarget!)}
                className="btn-danger text-sm"
              >
                Confirm Merge
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function EditDialog({
  exercise,
  categories,
  onSave,
  onCancel,
}: {
  exercise: Exercise
  categories: string[]
  onSave: (exerciseId: string, updates: { name?: string; category?: string | null; exercise_type?: ExerciseType }) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(exercise.name)
  const [category, setCategory] = useState(exercise.category ?? '')
  const [exerciseType, setExerciseType] = useState<ExerciseType>(exercise.exercise_type)

  const handleSave = () => {
    onSave(exercise.id, {
      name: name.trim(),
      category: category.trim() || null,
      exercise_type: exerciseType,
    })
  }

  const hasChanges =
    name.trim() !== exercise.name ||
    (category.trim() || null) !== exercise.category ||
    exerciseType !== exercise.exercise_type

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />

      <div
        className="relative rounded shadow-xl w-full max-w-md mx-4"
        style={{ background: 'var(--color-iron)', border: '1px solid var(--color-steel)' }}
      >
        <CloseButton onClick={onCancel} />

        <div className="px-4 py-3 pr-10" style={{ borderBottom: '1px solid var(--color-steel)' }}>
          <h3
            className="text-sm tracking-wide"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-bone)' }}
          >
            EDIT EXERCISE
          </h3>
        </div>

        <div className="p-4 space-y-4">
          {/* Name */}
          <div>
            <label
              className="block text-xs uppercase tracking-wider mb-1"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-zinc)' }}
            >
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input w-full text-sm"
            />
          </div>

          {/* Category */}
          <div>
            <label
              className="block text-xs uppercase tracking-wider mb-1"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-zinc)' }}
            >
              Category
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., push, pull, core, lower"
              className="input w-full text-sm"
              list="category-suggestions"
            />
            <datalist id="category-suggestions">
              {categories.map((cat) => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
          </div>

          {/* Type */}
          <div>
            <label
              className="block text-xs uppercase tracking-wider mb-1"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-zinc)' }}
            >
              Type
            </label>
            <select
              value={exerciseType}
              onChange={(e) => setExerciseType(e.target.value as ExerciseType)}
              className="input w-full text-sm"
            >
              <option value="weighted">Weighted</option>
              <option value="bodyweight">Bodyweight</option>
              <option value="cardio">Cardio</option>
            </select>
          </div>

          {exercise.is_custom && (
            <p
              className="text-xs"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-zinc)' }}
            >
              This is a custom exercise you created.
            </p>
          )}
        </div>

        <div className="px-4 py-3 flex justify-end gap-2" style={{ borderTop: '1px solid var(--color-steel)' }}>
          <button onClick={onCancel} className="btn-ghost text-sm">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || !hasChanges}
            className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

function ExerciseRow({
  exercise,
  categories,
  onTypeChange,
  onCategoryChange,
  onEdit,
  onDelete,
  onMerge,
  isLast = false,
}: {
  exercise: Exercise
  categories: string[]
  onTypeChange: (exercise: Exercise, type: ExerciseType) => void
  onCategoryChange: (exercise: Exercise, category: string | null) => void
  onEdit: () => void
  onDelete: (exercise: Exercise) => void
  onMerge: () => void
  isLast?: boolean
}) {
  const [editingCategory, setEditingCategory] = useState(false)
  const [editingType, setEditingType] = useState(false)

  const handleCategoryChange = (value: string) => {
    onCategoryChange(exercise, value || null)
    setEditingCategory(false)
  }

  const handleTypeChange = (value: ExerciseType) => {
    onTypeChange(exercise, value)
    setEditingType(false)
  }

  return (
    <div 
      className="px-4 py-3 flex items-center justify-between gap-4 group"
      style={{ borderBottom: isLast ? 'none' : '1px solid var(--color-steel)' }}
    >
      {/* Left side: name and pills */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span 
            className="truncate text-sm"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ash)' }}
          >
            {exercise.name}
          </span>
          {exercise.is_custom && (
            <span 
              className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded"
              style={{ 
                fontFamily: 'var(--font-mono)',
                background: 'var(--color-ember)',
                color: 'var(--color-void)'
              }}
            >
              Custom
            </span>
          )}
        </div>
        
        {/* Pills row */}
        <div className="flex items-center gap-2 mt-1">
          {/* Category pill/dropdown */}
          {editingCategory ? (
            <select
              value={exercise.category ?? ''}
              onChange={(e) => handleCategoryChange(e.target.value)}
              onBlur={() => setEditingCategory(false)}
              className="input text-xs py-0.5 px-1.5"
              autoFocus
            >
              <option value="">none</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          ) : (
            <button
              onClick={() => setEditingCategory(true)}
              className="text-[10px] px-2 py-0.5 rounded transition-colors"
              style={{ 
                fontFamily: 'var(--font-mono)',
                background: exercise.category ? 'var(--color-steel)' : 'transparent',
                color: exercise.category ? 'var(--color-ash)' : 'var(--color-graphite)',
                border: `1px ${exercise.category ? 'solid' : 'dashed'} var(--color-steel)`
              }}
              title="Click to change category"
            >
              {exercise.category || 'no category'}
            </button>
          )}

          {/* Type pill/dropdown */}
          {editingType ? (
            <select
              value={exercise.exercise_type}
              onChange={(e) => handleTypeChange(e.target.value as ExerciseType)}
              onBlur={() => setEditingType(false)}
              className="input text-xs py-0.5 px-1.5"
              autoFocus
            >
              <option value="weighted">Weighted</option>
              <option value="bodyweight">Bodyweight</option>
              <option value="cardio">Cardio</option>
            </select>
          ) : (
            <button
              onClick={() => setEditingType(true)}
              className="text-[10px] uppercase px-2 py-0.5 rounded transition-colors"
              style={{ 
                fontFamily: 'var(--font-mono)',
                background: exercise.exercise_type === 'bodyweight' 
                  ? 'var(--color-success-muted)'
                  : exercise.exercise_type === 'cardio'
                    ? 'var(--color-info)'
                    : 'var(--color-steel)',
                color: 'var(--color-chalk)'
              }}
              title="Click to change type"
            >
              {exercise.exercise_type}
            </button>
          )}
        </div>
      </div>

      {/* Right side: action icons */}
      <div className="flex items-center gap-0.5 opacity-50 group-hover:opacity-100 transition-opacity">
        {/* Edit icon */}
        <button
          onClick={onEdit}
          className="p-1.5 rounded transition-colors hover:bg-[var(--color-steel)]"
          style={{ color: 'var(--color-slate)' }}
          title="Edit exercise"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>

        {/* Merge icon */}
        <button
          onClick={onMerge}
          className="p-1.5 rounded transition-colors hover:bg-[var(--color-steel)]"
          style={{ color: 'var(--color-slate)' }}
          title="Merge into another exercise"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </button>

        {/* Delete icon (custom only) */}
        {exercise.is_custom && (
          <button
            onClick={() => onDelete(exercise)}
            className="p-1.5 rounded transition-colors hover:bg-[var(--color-danger-muted)]"
            style={{ color: 'var(--color-slate)' }}
            title="Delete custom exercise"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
