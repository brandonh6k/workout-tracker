# Workout Tracker App - PRD v1.0

## Product Vision
A no-bullshit workout tracking web app for people who actually lift. Clean interface, fast logging, clear progress visualization. Built for strength training with planned workouts and historical tracking.

---

## Core User Problems
1. **Current state sucks**: Typing workouts into Apple Notes is tedious and provides zero insights
2. **Can't see progress**: No easy way to know if you're actually getting stronger week-over-week
3. **Planning is manual**: Have to remember what weights/reps you did last time
4. **Most apps are overcomplicated**: Bloated with social features, premium tiers, and shit you don't need

---

## User Personas

### Primary: "The Home Gym Lifter" (55M, consistent, goal-oriented)
- Trains 5-6x/week in home gym
- Wants strength progression, not aesthetics or social validation
- Values simplicity and data accuracy over gamification
- Needs quick logging (30-min workout windows)
- Wants to see: "Am I stronger than last month?"

---

## Core Features (v1.0)

### 1. Workout Planning
**User Story**: As a lifter, I want to plan my weekly workout split so I know what I'm doing each day.

**Requirements**:
- Create named workout templates (e.g., "Monday - Lower Body")
- Add exercises to templates with target sets/reps (e.g., "Goblet Squats: 3x8-10")
- Assign templates to specific days of the week
- View weekly calendar showing planned workouts
- Ability to duplicate/edit templates
- Exercise library with common movements (or free-form text entry)

**Nice-to-have**:
- Notes field per workout (e.g., "Start deadlifts at 135#")
- Rest day marking

---

### 2. Workout Logging
**User Story**: As a lifter mid-workout, I want to quickly log my sets so I can focus on training, not data entry.

**Requirements**:
- Start workout from planned template OR ad-hoc entry
- For each exercise, log:
  - Weight used (per set or same for all sets)
  - Reps completed (per set)
  - Optional: RPE (1-10) or RIR (reps in reserve)
  - Optional: Notes (e.g., "form felt off", "left knee twinge")
- Auto-populate previous workout's weights as starting suggestion
- Quick increment/decrement buttons for weights (±5# or ±10#)
- Save incomplete workouts (life happens)
- Timer between sets (optional, non-intrusive)

**UX Priorities**:
- Fast: Should log a 3-set exercise in <30 seconds
- Mobile-friendly: Large touch targets, minimal typing
- Offline-capable: Don't lose data if WiFi drops in basement

---

### 3. Progress Tracking
**User Story**: As a lifter, I want to see if I'm getting stronger over time so I know my program is working.

**Requirements**:
- Exercise history view: All logged instances of an exercise with date, weight, reps
- Estimated 1RM calculation and trend (using Epley or Brzycki formula)
- Volume tracking: Total weight moved per exercise/workout/week
- Personal records: Highlight PRs (heaviest weight, most reps at weight, highest volume)
- Comparison view: "This week vs. 4 weeks ago" for key lifts
- Simple line charts for key metrics over time

**Key Metrics to Track**:
- Weight × Reps (volume)
- Estimated 1RM
- Total weekly volume
- Workout frequency/adherence

---

### 4. Dashboard/Home View
**User Story**: As a lifter, I want to see my training status at a glance.

**Requirements**:
- Today's planned workout (if any)
- Recent workout history (last 5-7 sessions)
- Current week's training volume vs. previous week
- Upcoming workouts this week
- Quick-start button for today's workout OR log ad-hoc session

---

## Non-Functional Requirements

### Performance
- Page load <2 seconds on mobile 4G
- Logging a set <500ms response time
- Works offline with sync when reconnected

### Data
- User owns their data (export to CSV/JSON)
- No data deletion without explicit user action
- Privacy: No social features, no data sharing, no ads

### Platform
- Web-first (responsive design for mobile/tablet/desktop)
- PWA-capable (installable, offline support)
- Modern browsers only (Chrome/Safari/Firefox, last 2 versions)

---

## Out of Scope (v1.0)

**Explicitly NOT building**:
- Social features (sharing workouts, following friends, leaderboards)
- Nutrition tracking
- Cardio tracking beyond basic time/distance
- AI coaching or form analysis
- Integrations with wearables (Garmin, Apple Watch, etc.)
- Premium tiers or monetization
- Exercise video library
- Workout recommendations/auto-generation

---

## Technical Architecture (High-Level)

### Stack Suggestions
**Frontend**:
- React or Svelte (fast, component-based)
- TailwindCSS (rapid UI development)
- LocalStorage + IndexedDB for offline capability
- Chart.js or Recharts for visualizations

**Backend**:
- Node.js + Express OR serverless functions (Vercel/Netlify)
- PostgreSQL for relational workout data
- REST API (or GraphQL if complexity warrants)

**Auth**:
- Simple email/password (bcrypt)
- JWT tokens
- Optional: OAuth with Google (convenience)

**Hosting**:
- Frontend: Vercel, Netlify, or Cloudflare Pages
- Backend: Railway, Render, or Fly.io
- DB: Supabase, PlanetScale, or Neon

---

## Data Model (Simplified)

### Core Tables

**users**
- id, email, password_hash, created_at

**workout_templates**
- id, user_id, name, day_of_week, notes

**template_exercises**
- id, template_id, exercise_name, target_sets, target_reps_min, target_reps_max, order

**workout_sessions**
- id, user_id, template_id (nullable), date, duration_minutes, notes, completed

**logged_sets**
- id, session_id, exercise_name, set_number, weight, reps, rpe, notes

---

## MVP Success Metrics

**Adoption** (if multi-user):
- 10 active users logging workouts 3x/week for 4+ weeks

**Engagement** (single user):
- 80%+ adherence to planned workouts
- <60 seconds average time to log a full exercise (3 sets)
- Zero data loss incidents

**Usefulness**:
- User can answer "Am I stronger than last month?" in <10 seconds
- User voluntarily abandons Apple Notes after Week 2

---

## Open Questions / Decisions Needed

1. **Single-user vs. multi-user?**
   - Single-user (just you): Simpler, faster to build, no auth complexity
   - Multi-user: Slightly more complex but allows friends/family to use

2. **Bodyweight tracking?**
   - Track user's bodyweight over time? (Relevant for strength-to-weight ratios)
   - Could be useful but adds scope

3. **Exercise auto-complete/validation?**
   - Free-form text entry (flexible, fast) vs. curated exercise list (consistent, analyzable)
   - Hybrid: Free-form with suggestions?

4. **Progressive overload suggestions?**
   - "You did 3x8 @ 30# last week, try 3x8 @ 35# this week"
   - Could be v1.1 feature

5. **Rest timer necessity?**
   - Nice-to-have or critical for logging flow?
   - Could use phone's existing timer

---

## Phase 2 Ideas (Post-MVP)

- Deload week planning/tracking
- Program templates (e.g., "5/3/1", "Starting Strength")
- Plate calculator (for barbell loading)
- Video upload for form checks (personal use only)
- Progressive overload auto-suggestions
- Body measurements tracking (waist, arms, etc.)
- Export workout history as PDF report
- Dark mode (because obviously)

---

## Implementation Priority

**Week 1-2**: Core data model, auth, basic CRUD for templates
**Week 3-4**: Workout logging UI, set/rep entry flow
**Week 5-6**: Progress tracking views, charts, history
**Week 7**: Polish, offline support, mobile optimization
**Week 8**: Testing, bug fixes, deployment

---

## Design Principles

1. **Speed over features**: Fast logging beats fancy features
2. **Data integrity**: Never lose a logged workout
3. **Clarity over cleverness**: Simple UI, obvious actions
4. **Progressive disclosure**: Advanced features hidden until needed
5. **Respect the user's time**: No unnecessary clicks or screens

---

## Why This Will Work

**Existing apps suck because**:
- Strong (app): Paywalled features, cluttered UI
- Hevy: Social-first, too many features
- FitNotes: Android-only, dated UI
- Spreadsheets: Manual, no mobile UX

**This app wins by**:
- Built for strength training specifically
- Zero bullshit: No ads, no social, no upsells
- Fast: Optimized for 30-min workout windows
- Clear progress: Easy to see "am I getting stronger?"

---

## End Goal

A workout tracker you actually want to use. Simple enough to log a workout in 2 minutes. Smart enough to show you meaningful progress. Fast enough to not interrupt your training flow.

Built by a lifter, for lifters who care about results, not gamification.