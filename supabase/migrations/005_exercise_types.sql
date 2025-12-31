-- Add exercise type to distinguish weighted, bodyweight, and cardio exercises
-- This affects how stats are displayed (e.g., bodyweight shows best reps, not best weight)

-- Add exercise_type column
ALTER TABLE exercises 
ADD COLUMN exercise_type TEXT NOT NULL DEFAULT 'weighted'
CHECK (exercise_type IN ('weighted', 'bodyweight', 'cardio'));

-- Add cardio-specific fields to logged_sets (nullable, only used for cardio)
ALTER TABLE logged_sets
ADD COLUMN duration_seconds INTEGER,
ADD COLUMN distance_meters NUMERIC(10, 2);

-- Update existing bodyweight exercises (matching seed data names exactly)
UPDATE exercises SET exercise_type = 'bodyweight' WHERE name IN (
  -- Push
  'Push-Ups',
  'Dips',
  -- Pull
  'Pull-Ups',
  'Chin-Ups',
  -- Core (most core work is bodyweight)
  'Plank',
  'Side Plank',
  'Dead Bug',
  'Ab Wheel Rollout',
  'Hanging Leg Raise',
  'Russian Twist',
  -- Lower (these can be weighted but are often bodyweight)
  'Lunges',
  'Step-Ups'
);

-- Note: No cardio exercises in seed data yet. User can add custom ones.
-- Common cardio exercises to potentially add later:
-- Rowing Machine, Treadmill, Stationary Bike, Elliptical, Stair Climber, Jump Rope
