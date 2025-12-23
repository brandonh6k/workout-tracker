import { Link } from 'react-router-dom'
import type { TemplateWithExercises } from './api'

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
]

type Props = {
  templates: TemplateWithExercises[]
  onSelectTemplate?: (template: TemplateWithExercises) => void
}

export function WeeklyCalendar({ templates, onSelectTemplate }: Props) {
  const today = new Date().getDay()

  // Group templates by day of week
  const templatesByDay = DAYS_OF_WEEK.map((day) => ({
    ...day,
    templates: templates.filter((t) => t.day_of_week === day.value),
  }))

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="grid grid-cols-7 border-b border-gray-200">
        {DAYS_OF_WEEK.map((day) => (
          <div
            key={day.value}
            className={`px-2 py-3 text-center text-sm font-medium ${
              day.value === today
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-700'
            }`}
          >
            <span className="hidden sm:inline">{day.label}</span>
            <span className="sm:hidden">{day.short}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 min-h-[120px]">
        {templatesByDay.map((day) => (
          <div
            key={day.value}
            className={`border-r last:border-r-0 border-gray-100 p-2 ${
              day.value === today ? 'bg-blue-50/50' : ''
            }`}
          >
            {day.templates.length === 0 ? (
              <div className="text-xs text-gray-400 italic text-center mt-4">
                Rest
              </div>
            ) : (
              <div className="space-y-2">
                {day.templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => onSelectTemplate?.(template)}
                    className="w-full text-left p-2 rounded bg-blue-100 hover:bg-blue-200 transition-colors"
                  >
                    <div className="text-xs font-medium text-blue-900 truncate">
                      {template.name}
                    </div>
                    <div className="text-xs text-blue-600">
                      {template.template_exercises.length} exercises
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Unscheduled templates */}
      {templates.some((t) => t.day_of_week === null) && (
        <div className="border-t border-gray-200 p-4">
          <div className="text-sm font-medium text-gray-700 mb-2">
            Unscheduled Templates
          </div>
          <div className="flex flex-wrap gap-2">
            {templates
              .filter((t) => t.day_of_week === null)
              .map((template) => (
                <button
                  key={template.id}
                  onClick={() => onSelectTemplate?.(template)}
                  className="text-left px-3 py-2 rounded bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  <div className="text-sm font-medium text-gray-900">
                    {template.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {template.template_exercises.length} exercises
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}

      {templates.length === 0 && (
        <div className="p-8 text-center">
          <p className="text-gray-500 mb-4">No workout templates yet</p>
          <Link
            to="/templates"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Create your first template
          </Link>
        </div>
      )}
    </div>
  )
}
