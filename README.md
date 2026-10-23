# Workout Tracker

A no-bullshit workout tracking app for people who actually lift.

Or something to just scratch an itch I had.

## Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the migrations in `supabase/migrations/` via the SQL Editor
3. Copy `.env.example` to `.env.local` and add your Supabase credentials
4. `npm install && npm run dev`

## Strava Sync (optional)

Finished workouts post to Strava as Weight Training activities, with your sets in the description. Strava's API is free for personal use.

1. Create an app at [strava.com/settings/api](https://www.strava.com/settings/api). Set **Authorization Callback Domain** to your app's host (e.g. `workout-tracker-gamma-gray.vercel.app`). Strava always allows `localhost`, so local dev works without changing it.
2. Add `VITE_STRAVA_CLIENT_ID` to `.env.local` (and to Vercel's env vars).
3. Give the edge function the client ID and secret:
   - Local: copy `supabase/functions/.env.example` to `supabase/functions/.env`, then `supabase functions serve --env-file supabase/functions/.env`
   - Prod: `supabase secrets set STRAVA_CLIENT_ID=... STRAVA_CLIENT_SECRET=...` and `supabase functions deploy strava`
4. Apply `supabase/migrations/007_strava.sql`, then click **Connect Strava** on the History page.

Once connected, every finished workout uploads automatically. Older workouts have a send button on History. Deleting a workout here does not delete it on Strava.

## Tech Stack

- React + TypeScript + Vite
- Tailwind CSS v4
- Supabase (Postgres + Auth)
