
CREATE TABLE public.alarm_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  default_sound TEXT NOT NULL DEFAULT 'bell',
  custom_sound_url TEXT,
  volume NUMERIC NOT NULL DEFAULT 0.9 CHECK (volume >= 0 AND volume <= 1),
  vibrate BOOLEAN NOT NULL DEFAULT true,
  tts_enabled BOOLEAN NOT NULL DEFAULT true,
  tts_voice TEXT NOT NULL DEFAULT 'alloy',
  ring_seconds INT NOT NULL DEFAULT 30 CHECK (ring_seconds BETWEEN 5 AND 120),
  snooze_minutes INT NOT NULL DEFAULT 5 CHECK (snooze_minutes BETWEEN 1 AND 60),
  push_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.alarm_settings TO authenticated;
GRANT ALL ON public.alarm_settings TO service_role;

ALTER TABLE public.alarm_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own alarm settings" ON public.alarm_settings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_alarm_settings_updated
  BEFORE UPDATE ON public.alarm_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
