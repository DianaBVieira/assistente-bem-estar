
-- Appointment status enum
CREATE TYPE public.appointment_status AS ENUM ('agendado','realizado','cancelado','remarcado');
CREATE TYPE public.appointment_type AS ENUM ('consulta','exame','procedimento','retorno','outro');

CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  type public.appointment_type NOT NULL DEFAULT 'consulta',
  doctor text,
  specialty text,
  location text,
  address text,
  scheduled_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 30,
  status public.appointment_status NOT NULL DEFAULT 'agendado',
  notes text,
  reminder_minutes_before integer NOT NULL DEFAULT 60,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own appointments" ON public.appointments
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX appointments_user_scheduled_idx ON public.appointments(user_id, scheduled_at);

CREATE TRIGGER set_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
