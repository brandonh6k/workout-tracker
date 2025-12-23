-- Migration: Separate templates from scheduled workouts
-- Run this in Supabase SQL Editor

-- 1. Remove day_of_week from workout_templates (templates are now reusable, not day-bound)
alter table workout_templates drop column if exists day_of_week;

-- 2. Simplify template_exercises: single rep target instead of range
alter table template_exercises drop column if exists target_reps_max;
alter table template_exercises rename column target_reps_min to target_reps;

-- 3. Create scheduled_workouts table (template assigned to a day)
create table scheduled_workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  template_id uuid references workout_templates on delete cascade not null,
  day_of_week int not null check (day_of_week >= 0 and day_of_week <= 6),
  created_at timestamptz default now(),
  unique(user_id, template_id, day_of_week) -- can't schedule same template twice on same day
);

-- 4. Create scheduled_exercises table (weights for each exercise in the schedule)
create table scheduled_exercises (
  id uuid primary key default gen_random_uuid(),
  scheduled_workout_id uuid references scheduled_workouts on delete cascade not null,
  exercise_name text not null,
  target_weight numeric(6,2) not null default 0,
  order_index int not null
);

-- 5. Indexes
create index idx_scheduled_workouts_user on scheduled_workouts(user_id);
create index idx_scheduled_workouts_day on scheduled_workouts(user_id, day_of_week);
create index idx_scheduled_exercises_workout on scheduled_exercises(scheduled_workout_id);

-- 6. Enable RLS
alter table scheduled_workouts enable row level security;
alter table scheduled_exercises enable row level security;

-- 7. RLS Policies for scheduled_workouts
create policy "Users can view own scheduled workouts"
  on scheduled_workouts for select
  using (user_id = auth.uid());

create policy "Users can insert own scheduled workouts"
  on scheduled_workouts for insert
  with check (user_id = auth.uid());

create policy "Users can update own scheduled workouts"
  on scheduled_workouts for update
  using (user_id = auth.uid());

create policy "Users can delete own scheduled workouts"
  on scheduled_workouts for delete
  using (user_id = auth.uid());

-- 8. RLS Policies for scheduled_exercises (access through parent)
create policy "Users can view scheduled exercises"
  on scheduled_exercises for select
  using (
    exists (
      select 1 from scheduled_workouts
      where scheduled_workouts.id = scheduled_exercises.scheduled_workout_id
      and scheduled_workouts.user_id = auth.uid()
    )
  );

create policy "Users can insert scheduled exercises"
  on scheduled_exercises for insert
  with check (
    exists (
      select 1 from scheduled_workouts
      where scheduled_workouts.id = scheduled_exercises.scheduled_workout_id
      and scheduled_workouts.user_id = auth.uid()
    )
  );

create policy "Users can update scheduled exercises"
  on scheduled_exercises for update
  using (
    exists (
      select 1 from scheduled_workouts
      where scheduled_workouts.id = scheduled_exercises.scheduled_workout_id
      and scheduled_workouts.user_id = auth.uid()
    )
  );

create policy "Users can delete scheduled exercises"
  on scheduled_exercises for delete
  using (
    exists (
      select 1 from scheduled_workouts
      where scheduled_workouts.id = scheduled_exercises.scheduled_workout_id
      and scheduled_workouts.user_id = auth.uid()
    )
  );
