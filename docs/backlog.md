# Workout Tracker - Backlog

## Architecture / Data Model

- [x] **Separate template vs scheduled workout concepts**: Current model conflates "template" (exercise list with sets/reps) and "scheduled workout" (template + specific weights for a day). Need to rethink:
  - **Template**: Reusable exercise list (e.g., "Lower Body" = Squat 3x8, RDL 3x10, etc.)
  - **Scheduled Workout**: Template instance assigned to a day WITH target weights per exercise
  - This enables the "1-button workflow" - when you start a workout, weights are pre-filled from the schedule, not guessed from history

## UI/UX Improvements

- [x] **Simplify rep target in templates**: Change from rep range (min-max) to single rep target. Ranges add complexity without value - you know what you're aiming for.

- [ ] **Remove rep ranges from logging**: You did X reps, not a range. Simplify to single value.

## Content / Exercise Library

- [ ] **Exercise info links / how-tos**: Add reference links, images, or instructional content for each exercise. Similar to Strengthlevel exercise pages - form cues, muscle groups, video demos, etc.

## Workflow Design (Phase 2)

- [ ] **1-button-per-set logging flow**: Gold standard is Next/Done button for 95% of sets. Pre-filled from scheduled weights. Only tap into details for exceptions (weight change, rep variance, notes). Rest timer starts automatically on set completion.

## Future Phases

- Phase 2: Workout Logging
- Phase 3: Progress Tracking
- Phase 4: Dashboard + Polish
