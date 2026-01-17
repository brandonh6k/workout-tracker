# Workout Tracker - Backlog

## Architecture / Data Model

- [x] **Separate template vs scheduled workout concepts**: Current model conflates "template" (exercise list with sets/reps) and "scheduled workout" (template + specific weights for a day). Need to rethink:
  - **Template**: Reusable exercise list (e.g., "Lower Body" = Squat 3x8, RDL 3x10, etc.)
  - **Scheduled Workout**: Template instance assigned to a day WITH target weights per exercise
  - This enables the "1-button workflow" - when you start a workout, weights are pre-filled from the schedule, not guessed from history

## UI/UX Improvements

- [ ] **UX refresh (frontend-design skill)**: Full visual overhaul using the `frontend-design` agent skill. Replace generic Tailwind defaults with a distinctive, intentional aesthetic. Scope includes: custom typography, cohesive color palette with CSS variables, motion/micro-interactions, spatial composition rethinking, and atmosphere (backgrounds, textures). Multi-session effort - consider scoping to specific pages (dashboard, active workout) first. This is also a sandbox exercise to test the skill on a non-trivial codebase.

- [x] **Simplify rep target in templates**: Change from rep range (min-max) to single rep target. Ranges add complexity without value - you know what you're aiming for.

- [ ] **Remove rep ranges from logging**: You did X reps, not a range. Simplify to single value.

- [x] **Configurable rest periods**: Rest time should be set per-exercise in the template (not hardcoded 90s). Compounds may need 3min, isolation 60s. Add `rest_seconds` column to `template_exercises`.

- [x] **Dark mode toggle**: Add light/dark theme toggle. Save preference to localStorage. Because OMG MY EYES.

- [ ] **Rest day marking**: Visual indicator on weekly calendar for intentional rest days vs. unscheduled days.

## Content / Exercise Library

- [ ] **Exercise info links / how-tos**: Add reference links, images, or instructional content for each exercise. Similar to Strengthlevel exercise pages - form cues, muscle groups, video demos, etc.

## Workflow Design (Phase 2)

- [ ] **1-button-per-set logging flow**: Gold standard is Next/Done button for 95% of sets. Pre-filled from scheduled weights. Only tap into details for exceptions (weight change, rep variance, notes). Rest timer starts automatically on set completion.

## Cardio Support

- [ ] **Cardio logging flow**: Different UI for cardio exercises (duration, distance, pace instead of weight/reps). Fields already in `logged_sets` (duration_seconds, distance_meters) but logging UI not implemented.

- [ ] **Cardio stats**: Best duration, best distance, best pace, total sessions.

## Ad-hoc Workouts

- [ ] **Ad-hoc workout session**: Start an empty workout without a pre-planned template. Add exercises on the fly, log sets dynamically. Useful for days when you deviate from the plan.

## Logging Enhancements

- [ ] **RPE/RIR per set**: Optional field to log Rate of Perceived Exertion (1-10) or Reps in Reserve. Useful for tracking intensity beyond just weight/reps.

- [ ] **Notes per set**: Optional notes field for individual sets (e.g., "form felt off", "left knee twinge"). Currently only template-level notes exist.

## Data & Infrastructure

- [ ] **Offline support / PWA**: Make app installable and functional offline. Use IndexedDB for local storage, sync when back online. Critical for basement/garage gyms with spotty WiFi.

- [ ] **Data export (CSV/JSON)**: Allow users to export their workout history. User owns their data.

## Code Quality / Refactoring

- [ ] **useReducer for ActiveWorkout**: The `ActiveWorkout` component has complex nested state with 12+ setState calls. Refactoring to `useReducer` would centralize state mutations, simplify rollback logic, and make the component easier to test.

- [ ] **Data fetching hooks for Dashboard/Progress**: Extract `useDashboardData()` and `useExerciseHistory(exerciseName)` hooks to separate data fetching concerns from UI components. Currently, `DashboardPage` and `ExerciseHistoryView` have parallel API calls mixed into the component.

## Performance

- [ ] **Code splitting / lazy loading**: Bundle is ~850KB which triggers Vite's size warning. Use `React.lazy()` to split by route and lazy-load heavy dependencies (Recharts is ~300KB). Target: under 500KB initial bundle.

## Testing

- [ ] **API layer tests**: Add tests for API functions with Supabase mocking. Would require setting up a mock Supabase client or using MSW (Mock Service Worker) to intercept requests.

- [ ] **ActiveWorkout component tests**: Complex component with state management, timers, and API calls. Would benefit from the useReducer refactor first to make state transitions more testable.

- [ ] **Integration tests**: End-to-end flows like "create template -> schedule workout -> complete workout -> view progress". Could use Playwright or Cypress.

## Active Workout UX (from real usage feedback)

- [x] **Weight change doesn't propagate to remaining sets**: When you adjust weight mid-exercise, it should update all subsequent sets of that exercise, not just the current one.

- [ ] **Reps adjustment on mobile is wonky**: The rep adjustment UI is awkward on mobile. Needs better touch targets or different interaction pattern.

- [ ] **Rest screen "up next" is too low**: The upcoming exercise info is off-screen on mobile unless you scroll. Should be visible without scrolling.

- [ ] **Rest screen shows wrong "next" after last set**: After completing the last set of an exercise, rest screen still shows the exercise you just finished instead of the next exercise.

- [ ] **Flip exercise overlay header layout**: Move cancel to right, time to left. Add "set X of Y" next to "exercise X of Y". Consider progress bars instead of numbers.

- [ ] **Refactor rest screen from overlay to state**: Currently rest timer is an overlay on the workout screen, which causes positioning issues ("up next" too low, etc.). Should be a separate render state - you're either in "active set" state or "resting" state. Cleaner mental model, fixes multiple UX issues, and makes it easier to add features like changeover notes.

- [ ] **Skip remaining sets / advance to next exercise**: Button to skip remaining sets of current exercise and move to the next one. For time-crunched workouts where you can only do 2 of 3 scheduled sets.

- [x] **Extend rest button**: Add "+30s" button on rest screen to extend rest period. Sometimes you need a bit more recovery.

- [x] **Dashboard still shows "Start Workout" after completing today's scheduled workout**: Should hide or change to "Workout Complete" if you've already done that scheduled workout today.

- [x] **Dashboard "This Week" doesn't update after workout completion**: Volume stats don't refresh after finishing a workout - have to navigate away and back. Should refresh on workout complete.

## Workout Prep & Transitions

- [ ] **Workout prep popup**: Before starting, show a checklist based on schedule - "You'll need: Dumbbells, Barbell, Bench" etc. Help user set up before starting the clock.

- [ ] **Between-exercise changeover notes**: Add notes field per exercise for setup reminders like "Adjust Bowflex to X", "Grab 25lb dumbbells", "Move bench to incline". Show during transition.

## Exercise Library Enhancements

- [ ] **Endurance exercise category**: Add support for exercises like Farmer's Carries where the metric is time/distance held, not reps. New `exercise_type` value.

- [ ] **Single-arm/unilateral exercises ("both sides")**: Support for exercises like DB Row where you do each side separately before rest. Workflow: Left arm reps → Right arm reps → Rest timer starts. Could be a toggle on the exercise in template ("unilateral") that doubles the set flow. Track left/right independently or just prompt for both sides before completing the "set".

- [ ] **Supersets**: Group exercises to be performed back-to-back with minimal rest between, then longer rest after the superset.

- [ ] **"+Create exercise" button not working**: The create exercise option in autocomplete isn't clickable/functional.

## Navigation / Layout

- [x] **Sticky top menu**: Header navigation should stick to top when scrolling so you can always navigate.

## Data Management

- [x] **Delete workout sessions**: Ability to delete logged workouts from History page. Useful for testing/mistakes. Should have confirmation dialog since it deletes all logged sets.

## Bugs

- [x] **History dates are off by one day**: Workouts done on Friday show as Thursday. Likely a timezone issue with date storage/display.

- [x] **Dashboard exercise list has arbitrary 5-item limit**: "Today's Workout" only shows 5 exercises with "+N more". Either remove the limit or make it expandable/accordion.

## Security / Access Control

- [x] **Admin tab restricted to specific accounts**: Hide Admin tab for non-admin users. For now, whitelist specific email (brandon.hunt@gmail.com). Prevents random Vercel visitors from messing with exercise library.

## Future Phases

- [x] Phase 2: Workout Logging
- [x] Phase 3: Progress Tracking
- [x] Phase 4: Dashboard + Polish
