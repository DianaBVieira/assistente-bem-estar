CREATE TYPE public.health_metric_type AS ENUM ('pressao', 'glicemia', 'peso', 'sono', 'humor', 'hidratacao');

CREATE TABLE public.health_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type public.health_metric_type NOT NULL,
  value_1 numeric,
  value_2 numeric,
  value_3 numeric,
  text_value text,
  notes text,
  measured_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.health_metrics TO authenticated;
GRANT ALL ON public.health_metrics TO service_role;

ALTER TABLE public.health_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own health metrics"
ON public.health_metrics FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX health_metrics_user_type_time_idx
  ON public.health_metrics (user_id, type, measured_at DESC);

CREATE TRIGGER health_metrics_set_updated_at
BEFORE UPDATE ON public.health_metrics
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();