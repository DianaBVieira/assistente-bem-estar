
-- Stock columns on medications
ALTER TABLE public.medications
  ADD COLUMN IF NOT EXISTS stock_quantity integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_threshold integer NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS pills_per_dose integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS alert_phone text;

-- Decrement stock when a dose is logged as taken or late
CREATE OR REPLACE FUNCTION public.decrement_med_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  per_dose integer;
BEGIN
  IF NEW.status IN ('taken','late') THEN
    SELECT COALESCE(pills_per_dose,1) INTO per_dose
      FROM public.medications WHERE id = NEW.medication_id;
    UPDATE public.medications
       SET stock_quantity = GREATEST(stock_quantity - COALESCE(per_dose,1), 0)
     WHERE id = NEW.medication_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_decrement_med_stock ON public.medication_logs;
CREATE TRIGGER trg_decrement_med_stock
AFTER INSERT ON public.medication_logs
FOR EACH ROW EXECUTE FUNCTION public.decrement_med_stock();

-- Water settings (one row per user)
CREATE TABLE IF NOT EXISTS public.water_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  interval_minutes integer NOT NULL DEFAULT 50,
  daily_goal integer NOT NULL DEFAULT 8,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.water_settings TO authenticated;
GRANT ALL ON public.water_settings TO service_role;
ALTER TABLE public.water_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own water_settings"
  ON public.water_settings FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_water_settings_updated
BEFORE UPDATE ON public.water_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Water logs (each glass drunk)
CREATE TABLE IF NOT EXISTS public.water_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  drank_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.water_logs TO authenticated;
GRANT ALL ON public.water_logs TO service_role;
ALTER TABLE public.water_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own water_logs"
  ON public.water_logs FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS water_logs_user_date_idx
  ON public.water_logs(user_id, drank_at DESC);
