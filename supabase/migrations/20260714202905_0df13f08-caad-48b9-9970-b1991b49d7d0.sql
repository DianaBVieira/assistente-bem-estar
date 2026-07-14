
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS recurrence_type text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS interval_minutes integer,
  ADD COLUMN IF NOT EXISTS window_start time,
  ADD COLUMN IF NOT EXISTS window_end time,
  ADD COLUMN IF NOT EXISTS weekdays integer[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS times_of_day time[] NOT NULL DEFAULT '{}';

ALTER TABLE public.tasks
  DROP CONSTRAINT IF EXISTS tasks_recurrence_type_check;
ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_recurrence_type_check
  CHECK (recurrence_type IN ('none','interval','weekly'));
