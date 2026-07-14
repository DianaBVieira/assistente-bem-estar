export type MedicationRow = {
  id: string;
  user_id: string;
  name: string;
  photo_url: string | null;
  dosage: string | null;
  frequency: string | null;
  times: string[];
  start_date: string;
  end_date: string | null;
  doctor: string | null;
  notes: string | null;
  active: boolean;
  stock_quantity: number;
  stock_threshold: number;
  pills_per_dose: number;
  alert_phone: string | null;
  alarm_enabled?: boolean;
  alarm_message?: string | null;
};

export type LogRow = {
  id: string;
  medication_id: string;
  scheduled_at: string;
  taken_at: string | null;
  status: "taken" | "missed" | "late" | "skipped";
  notes: string | null;
};

export type ScheduledDose = {
  medication: MedicationRow;
  scheduledAt: Date;
  scheduledIso: string;
  log?: LogRow;
  status: "pending" | "taken" | "missed" | "late" | "skipped" | "upcoming";
};

/** Build scheduled doses for a given date (local time), based on medication.times[] like ["08:00","20:00"]. */
export function buildDosesForDate(
  meds: MedicationRow[],
  logs: LogRow[],
  date: Date,
): ScheduledDose[] {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const logsByKey = new Map<string, LogRow>();
  for (const log of logs) {
    const t = new Date(log.scheduled_at).getTime();
    logsByKey.set(`${log.medication_id}|${t}`, log);
  }

  const out: ScheduledDose[] = [];
  const now = new Date();
  const dayIso = dayStart.toISOString().slice(0, 10);

  for (const med of meds) {
    if (!med.active) continue;
    if (med.start_date > dayIso) continue;
    if (med.end_date && med.end_date < dayIso) continue;

    for (const time of med.times ?? []) {
      const [h, m] = time.split(":").map(Number);
      if (Number.isNaN(h)) continue;
      const dt = new Date(dayStart);
      dt.setHours(h, m || 0, 0, 0);
      const iso = dt.toISOString();
      const log = logsByKey.get(`${med.id}|${dt.getTime()}`);

      let status: ScheduledDose["status"];
      if (log) status = log.status as ScheduledDose["status"];
      else if (dt.getTime() > now.getTime()) status = "upcoming";
      else if (now.getTime() - dt.getTime() > 60 * 60 * 1000) status = "missed";
      else status = "pending";

      out.push({ medication: med, scheduledAt: dt, scheduledIso: iso, log, status });
    }
  }

  out.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
  return out;
}

export function formatTime(d: Date) {
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function formatDate(d: Date) {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}
