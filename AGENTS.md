# Workout Tracker - Agent Context

## Project Overview

Personal workout tracking app. Basement gym use case - single user, offline-friendly priority.

- **Stack**: React 19 + TypeScript + Tailwind CSS v4 + Supabase
- **Deployment**: Vercel (auto-deploy on push to main)
- **Repo**: https://github.com/brandonh6k/workout-tracker
- **Test runner**: Vitest (49 unit + 40 integration tests)

## Domain Model

### Core Concept: Template vs Scheduled Workout

This distinction is fundamental to the app's design:

- **Template** (`workout_templates` + `template_exercises`): Reusable exercise list with sets/reps/rest time. Example: "Lower Body" = Squat 3x8, RDL 3x10, etc.
- **Scheduled Workout** (`scheduled_workouts` + `scheduled_exercises`): Template instance assigned to a day of week WITH target weights per exercise. Enables "1-button workflow" - weights are pre-filled when starting.
- **Workout Session** (`workout_sessions` + `logged_sets`): Actual logged workout with completed sets.

### Exercise Types

- `weighted` - Standard weight training (bench, squat, etc.)
- `bodyweight` - No weight tracking needed (pull-ups, etc.)
- `cardio` - Duration/distance instead of weight/reps (not fully implemented yet)

### Key Fields

- `template_exercises.rest_seconds` - Per-exercise rest time (default 90s, configurable 60s-5min)
- `template_exercises.is_amrap` - "As Many Reps As Possible" flag for final sets
- `logged_sets.rpe` - Rate of Perceived Exertion (optional, not in UI yet)
- `logged_sets.duration_seconds`, `distance_meters` - For cardio (schema ready, UI not implemented)

## Architecture Decisions

### Date/Timezone Handling

**Problem**: JavaScript parses "YYYY-MM-DD" strings as UTC midnight, causing off-by-one errors in US timezones.

**Solution**: `parseLocalDate()` in `src/lib/utils.ts` detects date-only strings and constructs Date with local timezone components. All date display functions use this.

### State Management

`ActiveWorkout` uses `useReducer` with a dedicated `workoutReducer.ts`. Dashboard data fetching is extracted into `useDashboardData` hook. Other pages use `useState` directly.

### Admin Access Control

Simple email whitelist in `src/components/Layout.tsx`. Only `brandon.hunt@gmail.com` sees Admin tab. Not a security boundary (Supabase RLS handles that), just UI cleanup.

### Dashboard Data Refresh

`useDashboardData` hook encapsulates all dashboard data fetching (comparison, recent workouts, weekly volume, completed session data). Exposes a `refresh()` function called after workout completion.

## File Organization

```
src/
  features/           # Feature modules (vertical slices)
    admin/            # Exercise library management
    auth/             # Login/signup, AuthContext
    dashboard/        # Main dashboard page
    progress/         # Stats, comparisons, history views
    schedule/         # Weekly schedule management
    templates/        # Template CRUD, WeeklyCalendar
    workouts/         # ActiveWorkout, HistoryPage
  components/         # Shared UI components
  lib/                # Utilities, Supabase client
  types/              # TypeScript types, database.ts
```

Each feature has:
- `index.ts` - Public exports (barrel file)
- `*Api.ts` or `api.ts` - Supabase queries (progress/ split into exerciseApi.ts + volumeApi.ts)
- `*Page.tsx` - Page components
- `use*.ts` - Custom hooks (where applicable)

## Code Conventions

- **Functional over OOP** - No classes, use functions and hooks
- **Types in database.ts** - Mirror Supabase schema, export convenience types
- **API functions throw on error** - Callers handle with try/catch
- **Design system** - CSS custom properties (`var(--color-ember)`, `var(--font-display)`, etc.) defined in `index.css`, not Tailwind `dark:` variants. Hover utilities: `hover-text-chalk`, `hover-text-zinc`, `hover-text-danger`, `hover-bg-concrete`, `nav-link`/`nav-link-active`
- **Toast notifications** - Using `sonner` for user feedback

## Testing

- Unit tests in `*.test.ts` files alongside source
- Vitest + React Testing Library + jsdom
- Currently 49 unit tests covering utils, reducer, API functions, and key components
- Integration tests in `src/test/integration/` — 40 tests against local Supabase
  - Auth, templates, workouts, schedule, exercises, RLS isolation
  - Require local Supabase running (`npm run db:start`)
  - Separate Vitest config (`vitest.integration.config.ts`): Node env, sequential, 15s timeout

## Commands

```bash
npm run dev              # Start dev server (port 5173)
npm run build            # TypeScript check + Vite build
npm run lint             # ESLint
npm run test:run         # Unit tests only (49)
npm run test             # Unit tests in watch mode
npm run test:integration # Integration tests (40, needs local Supabase)
npm run test:all         # Both unit + integration
```

## Database Migrations

Located in `supabase/migrations/`. Applied in order:
1. `001_initial_schema.sql` - Base tables
2. `002_seed_exercises.sql` - Exercise library
3. `003_scheduled_workouts.sql` - Schedule tables
4. `004_amrap_sets.sql` - AMRAP flag
5. `005_exercise_types.sql` - Exercise type enum
6. `006_rest_seconds.sql` - Per-exercise rest time

## Known Tech Debt

- Bundle is ~890KB (Recharts is ~300KB) - needs lazy loading
- Integration tests cover Supabase API + RLS; no mocked API-layer unit tests yet
- Some components still use inline styles for design system colors instead of utility classes

## Backlog Location

`docs/backlog.md` - Organized by category, checkboxes for completion status. Includes user feedback items from real usage.

## This Project as Agent Skill Sandbox

This repo doubles as a testing ground for agent skills on a non-trivial codebase:
- Real domain complexity (not a todo app)
- Actual user feedback driving backlog
- Multiple feature areas to exercise different skills
- `frontend-design` skill UX refresh is queued for testing

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
