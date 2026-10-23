-- Strava sync: OAuth tokens per user, and the Strava activity a session was uploaded as

create table strava_connections (
  user_id uuid primary key references auth.users on delete cascade,
  athlete_id bigint not null,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  scope text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- No policies: tokens are only readable by the strava edge function (service role)
alter table strava_connections enable row level security;

-- Strava's create-activity endpoint has no idempotency key; this column is the duplicate guard
alter table workout_sessions add column strava_activity_id bigint;
