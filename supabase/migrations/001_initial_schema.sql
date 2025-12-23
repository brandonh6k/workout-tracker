-- Workout Tracker Initial Schema
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

-- Exercise library (global + user-specific)
create table exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  name text not null,
  category text,
  is_custom boolean default false,
  created_at timestamptz default now(),
  unique(user_id, name)
);

-- Workout templates (weekly plans)
create table workout_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  day_of_week int check (day_of_week >= 0 and day_of_week <= 6),
  notes text,
  created_at timestamptz default now()
);

-- Exercises within templates
create table template_exercises (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references workout_templates on delete cascade not null,
  exercise_name text not null,
  target_sets int not null,
  target_reps_min int not null,
  target_reps_max int,
  order_index int not null,
  notes text
);

-- Actual workout sessions
create table workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  template_id uuid references workout_templates on delete set null,
  date date not null default current_date,
  duration_minutes int,
  notes text,
  completed boolean default false,
  created_at timestamptz default now()
);

-- Individual sets logged during workouts
create table logged_sets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references workout_sessions on delete cascade not null,
  exercise_name text not null,
  set_number int not null,
  weight numeric(6,2) not null,
  reps int not null,
  rpe numeric(3,1) check (rpe >= 1 and rpe <= 10),
  notes text,
  created_at timestamptz default now()
);

-- Indexes for common queries
create index idx_exercises_user on exercises(user_id);
create index idx_workout_templates_user on workout_templates(user_id);
create index idx_workout_sessions_user_date on workout_sessions(user_id, date);
create index idx_logged_sets_session on logged_sets(session_id);
create index idx_logged_sets_exercise on logged_sets(exercise_name);

-- Row Level Security (RLS)
alter table exercises enable row level security;
alter table workout_templates enable row level security;
alter table template_exercises enable row level security;
alter table workout_sessions enable row level security;
alter table logged_sets enable row level security;

-- RLS Policies

-- Exercises: Users can see global exercises (user_id is null) and their own
create policy "Users can view global and own exercises"
  on exercises for select
  using (user_id is null or user_id = auth.uid());

create policy "Users can insert own exercises"
  on exercises for insert
  with check (user_id = auth.uid());

create policy "Users can update own exercises"
  on exercises for update
  using (user_id = auth.uid());

create policy "Users can delete own exercises"
  on exercises for delete
  using (user_id = auth.uid());

-- Workout templates: Users can only see/modify their own
create policy "Users can view own templates"
  on workout_templates for select
  using (user_id = auth.uid());

create policy "Users can insert own templates"
  on workout_templates for insert
  with check (user_id = auth.uid());

create policy "Users can update own templates"
  on workout_templates for update
  using (user_id = auth.uid());

create policy "Users can delete own templates"
  on workout_templates for delete
  using (user_id = auth.uid());

-- Template exercises: Access through parent template
create policy "Users can view template exercises"
  on template_exercises for select
  using (
    exists (
      select 1 from workout_templates
      where workout_templates.id = template_exercises.template_id
      and workout_templates.user_id = auth.uid()
    )
  );

create policy "Users can insert template exercises"
  on template_exercises for insert
  with check (
    exists (
      select 1 from workout_templates
      where workout_templates.id = template_exercises.template_id
      and workout_templates.user_id = auth.uid()
    )
  );

create policy "Users can update template exercises"
  on template_exercises for update
  using (
    exists (
      select 1 from workout_templates
      where workout_templates.id = template_exercises.template_id
      and workout_templates.user_id = auth.uid()
    )
  );

create policy "Users can delete template exercises"
  on template_exercises for delete
  using (
    exists (
      select 1 from workout_templates
      where workout_templates.id = template_exercises.template_id
      and workout_templates.user_id = auth.uid()
    )
  );

-- Workout sessions: Users can only see/modify their own
create policy "Users can view own sessions"
  on workout_sessions for select
  using (user_id = auth.uid());

create policy "Users can insert own sessions"
  on workout_sessions for insert
  with check (user_id = auth.uid());

create policy "Users can update own sessions"
  on workout_sessions for update
  using (user_id = auth.uid());

create policy "Users can delete own sessions"
  on workout_sessions for delete
  using (user_id = auth.uid());

-- Logged sets: Access through parent session
create policy "Users can view logged sets"
  on logged_sets for select
  using (
    exists (
      select 1 from workout_sessions
      where workout_sessions.id = logged_sets.session_id
      and workout_sessions.user_id = auth.uid()
    )
  );

create policy "Users can insert logged sets"
  on logged_sets for insert
  with check (
    exists (
      select 1 from workout_sessions
      where workout_sessions.id = logged_sets.session_id
      and workout_sessions.user_id = auth.uid()
    )
  );

create policy "Users can update logged sets"
  on logged_sets for update
  using (
    exists (
      select 1 from workout_sessions
      where workout_sessions.id = logged_sets.session_id
      and workout_sessions.user_id = auth.uid()
    )
  );

create policy "Users can delete logged sets"
  on logged_sets for delete
  using (
    exists (
      select 1 from workout_sessions
      where workout_sessions.id = logged_sets.session_id
      and workout_sessions.user_id = auth.uid()
    )
  );
