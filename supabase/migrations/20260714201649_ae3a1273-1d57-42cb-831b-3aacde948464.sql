
ALTER TABLE public.medications
  ADD COLUMN IF NOT EXISTS alarm_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS alarm_message text;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS alarm_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS alarm_message text;

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS alarm_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS alarm_message text;
