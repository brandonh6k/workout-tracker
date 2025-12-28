-- Add AMRAP (As Many Reps As Possible) support to template exercises
-- Run this in Supabase SQL Editor

alter table template_exercises 
add column is_amrap boolean not null default false;

-- For AMRAP exercises, target_reps becomes the minimum/starting suggestion
comment on column template_exercises.is_amrap is 
  'When true, this is an AMRAP set. target_reps is used as default for first set, subsequent sets default to previous actual reps.';
