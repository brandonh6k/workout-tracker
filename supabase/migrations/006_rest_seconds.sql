-- Add configurable rest period per exercise in templates
-- Default 90 seconds, NULL means use default

ALTER TABLE template_exercises
ADD COLUMN rest_seconds int DEFAULT 90;

-- Add comment for documentation
COMMENT ON COLUMN template_exercises.rest_seconds IS 'Rest period in seconds after completing a set of this exercise. Default 90s.';
