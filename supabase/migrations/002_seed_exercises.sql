-- Seed global exercise library
-- These exercises have user_id = null so all users can see them

insert into exercises (user_id, name, category, is_custom) values
  -- Lower body
  (null, 'Barbell Squat', 'lower', false),
  (null, 'Goblet Squat', 'lower', false),
  (null, 'Front Squat', 'lower', false),
  (null, 'Bulgarian Split Squat', 'lower', false),
  (null, 'Leg Press', 'lower', false),
  (null, 'Romanian Deadlift', 'lower', false),
  (null, 'Conventional Deadlift', 'lower', false),
  (null, 'Sumo Deadlift', 'lower', false),
  (null, 'Leg Curl', 'lower', false),
  (null, 'Leg Extension', 'lower', false),
  (null, 'Calf Raise', 'lower', false),
  (null, 'Hip Thrust', 'lower', false),
  (null, 'Lunges', 'lower', false),
  (null, 'Step-Ups', 'lower', false),

  -- Upper body - push
  (null, 'Bench Press', 'push', false),
  (null, 'Incline Bench Press', 'push', false),
  (null, 'Dumbbell Bench Press', 'push', false),
  (null, 'Overhead Press', 'push', false),
  (null, 'Dumbbell Shoulder Press', 'push', false),
  (null, 'Push-Ups', 'push', false),
  (null, 'Dips', 'push', false),
  (null, 'Tricep Pushdown', 'push', false),
  (null, 'Skull Crushers', 'push', false),
  (null, 'Lateral Raise', 'push', false),
  (null, 'Front Raise', 'push', false),
  (null, 'Cable Fly', 'push', false),

  -- Upper body - pull
  (null, 'Pull-Ups', 'pull', false),
  (null, 'Chin-Ups', 'pull', false),
  (null, 'Lat Pulldown', 'pull', false),
  (null, 'Barbell Row', 'pull', false),
  (null, 'Dumbbell Row', 'pull', false),
  (null, 'Cable Row', 'pull', false),
  (null, 'Face Pull', 'pull', false),
  (null, 'Rear Delt Fly', 'pull', false),
  (null, 'Bicep Curl', 'pull', false),
  (null, 'Hammer Curl', 'pull', false),
  (null, 'Preacher Curl', 'pull', false),
  (null, 'Shrugs', 'pull', false),

  -- Core
  (null, 'Plank', 'core', false),
  (null, 'Dead Bug', 'core', false),
  (null, 'Ab Wheel Rollout', 'core', false),
  (null, 'Hanging Leg Raise', 'core', false),
  (null, 'Cable Crunch', 'core', false),
  (null, 'Russian Twist', 'core', false),
  (null, 'Pallof Press', 'core', false),
  (null, 'Side Plank', 'core', false);
