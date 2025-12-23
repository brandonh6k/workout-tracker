import { useNavigate } from 'react-router-dom'
import { useTemplates, WeeklyCalendar, type TemplateWithExercises } from '../templates'

export function DashboardPage() {
  const { templates, isLoading, error } = useTemplates()
  const navigate = useNavigate()

  const today = new Date().getDay()
  const todaysTemplates = templates.filter((t) => t.day_of_week === today)

  const handleSelectTemplate = (template: TemplateWithExercises) => {
    // TODO: Navigate to start workout with this template
    console.log('Selected template:', template.name)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        Failed to load data: {error.message}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Today's Workout */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Today's Workout
        </h2>

        {todaysTemplates.length > 0 ? (
          <div className="space-y-3">
            {todaysTemplates.map((template) => (
              <div
                key={template.id}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">{template.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {template.template_exercises.length} exercises
                    </p>
                  </div>
                  <button
                    onClick={() => handleSelectTemplate(template)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium text-sm"
                  >
                    Start Workout
                  </button>
                </div>

                {template.template_exercises.length > 0 && (
                  <ul className="mt-3 text-sm text-gray-600 space-y-1">
                    {template.template_exercises.slice(0, 5).map((ex) => (
                      <li key={ex.id} className="flex justify-between">
                        <span>{ex.exercise_name}</span>
                        <span className="text-gray-400">
                          {ex.target_sets}x{ex.target_reps_min}
                          {ex.target_reps_max &&
                          ex.target_reps_max !== ex.target_reps_min
                            ? `-${ex.target_reps_max}`
                            : ''}
                        </span>
                      </li>
                    ))}
                    {template.template_exercises.length > 5 && (
                      <li className="text-gray-400 italic">
                        +{template.template_exercises.length - 5} more
                      </li>
                    )}
                  </ul>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div>
            <p className="text-gray-500 mb-4">No workout planned for today</p>
            <button
              onClick={() => navigate('/templates')}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 font-medium text-sm"
            >
              View Templates
            </button>
          </div>
        )}
      </div>

      {/* Weekly Calendar */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Weekly Schedule
        </h2>
        <WeeklyCalendar
          templates={templates}
          onSelectTemplate={handleSelectTemplate}
        />
      </div>

      {/* Recent Workouts Placeholder */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Recent Workouts
        </h2>
        <p className="text-gray-500 italic">No workouts logged yet</p>
      </div>
    </div>
  )
}
