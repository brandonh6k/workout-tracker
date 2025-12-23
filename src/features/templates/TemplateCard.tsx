import type { TemplateWithExercises } from './api'

type Props = {
  template: TemplateWithExercises
  onEdit: () => void
  onDelete: () => void
  onDuplicate: () => void
}

export function TemplateCard({ template, onEdit, onDelete, onDuplicate }: Props) {
  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">{template.name}</h3>
        </div>

        <div className="flex gap-1">
          <button
            onClick={onEdit}
            className="p-1.5 text-gray-400 hover:text-blue-600"
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
            className="p-1.5 text-gray-400 hover:text-green-600"
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
            className="p-1.5 text-gray-400 hover:text-red-600"
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

      {template.notes && (
        <p className="text-sm text-gray-500">{template.notes}</p>
      )}

      {template.template_exercises.length > 0 ? (
        <ul className="text-sm text-gray-600 space-y-1">
          {template.template_exercises.map((exercise) => (
            <li key={exercise.id} className="flex justify-between">
              <span>{exercise.exercise_name}</span>
              <span className="text-gray-400">
                {exercise.target_sets}x{exercise.target_reps}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-400 italic">No exercises</p>
      )}
    </div>
  )
}
