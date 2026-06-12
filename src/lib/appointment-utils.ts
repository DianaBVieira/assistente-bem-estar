import type { Database } from "@/integrations/supabase/types";

export type AppointmentRow = Database["public"]["Tables"]["appointments"]["Row"];
export type AppointmentStatus = Database["public"]["Enums"]["appointment_status"];
export type AppointmentType = Database["public"]["Enums"]["appointment_type"];

export const APPOINTMENT_TYPES: { value: AppointmentType; label: string }[] = [
  { value: "consulta", label: "Consulta" },
  { value: "exame", label: "Exame" },
  { value: "procedimento", label: "Procedimento" },
  { value: "retorno", label: "Retorno" },
  { value: "outro", label: "Outro" },
];

export const APPOINTMENT_STATUSES: { value: AppointmentStatus; label: string; tone: string }[] = [
  { value: "agendado", label: "Agendado", tone: "bg-primary-soft text-primary" },
  { value: "realizado", label: "Realizado", tone: "bg-success/10 text-success" },
  { value: "cancelado", label: "Cancelado", tone: "bg-destructive/10 text-destructive" },
  { value: "remarcado", label: "Remarcado", tone: "bg-warning/10 text-warning-foreground" },
];

export function typeLabel(t: AppointmentType): string {
  return APPOINTMENT_TYPES.find((x) => x.value === t)?.label ?? t;
}

export function statusInfo(s: AppointmentStatus) {
  return APPOINTMENT_STATUSES.find((x) => x.value === s) ?? APPOINTMENT_STATUSES[0];
}

export function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInputValue(v: string): string {
  return new Date(v).toISOString();
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function buildMonthGrid(month: Date): Date[] {
  const first = startOfMonth(month);
  const startWeekday = first.getDay(); // 0=sun
  const days: Date[] = [];
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - startWeekday);
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    days.push(d);
  }
  return days;
}
