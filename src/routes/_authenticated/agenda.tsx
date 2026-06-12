import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus, Calendar as CalendarIcon, MapPin, User as UserIcon, Stethoscope,
  Pencil, Trash2, ChevronLeft, ChevronRight, Check, X, RotateCcw, List, Grid3x3,
} from "lucide-react";
import { toast } from "sonner";
import {
  type AppointmentRow,
  type AppointmentStatus,
  type AppointmentType,
  APPOINTMENT_TYPES,
  APPOINTMENT_STATUSES,
  typeLabel,
  statusInfo,
  toLocalInputValue,
  fromLocalInputValue,
  formatDateTime,
  formatTime,
  sameDay,
  buildMonthGrid,
} from "@/lib/appointment-utils";

export const Route = createFileRoute("/_authenticated/agenda")({
  head: () => ({ meta: [{ title: "Agenda — Minha Rotina" }] }),
  component: AgendaPage,
});

function useAppointments() {
  return useQuery({
    queryKey: ["appointments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as AppointmentRow[];
    },
  });
}

function AgendaPage() {
  const { data: appts, isLoading } = useAppointments();
  const [view, setView] = useState<"list" | "calendar">("list");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AppointmentRow | null>(null);
  const [presetDate, setPresetDate] = useState<Date | null>(null);

  function openNew(d?: Date) {
    setEditing(null);
    setPresetDate(d ?? null);
    setOpen(true);
  }
  function openEdit(a: AppointmentRow) {
    setEditing(a);
    setPresetDate(null);
    setOpen(true);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agenda</h1>
          <p className="text-sm text-muted-foreground">Consultas, exames e compromissos</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditing(null); setPresetDate(null); } }}>
          <DialogTrigger asChild>
            <Button onClick={() => openNew()}><Plus className="w-4 h-4" /> Novo</Button>
          </DialogTrigger>
          <AppointmentDialog
            key={editing?.id ?? presetDate?.toISOString() ?? "new"}
            editing={editing}
            presetDate={presetDate}
            onClose={() => { setOpen(false); setEditing(null); setPresetDate(null); }}
          />
        </Dialog>
      </div>

      <div className="inline-flex rounded-lg bg-muted p-1">
        <button
          onClick={() => setView("list")}
          className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-1.5 transition ${
            view === "list" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
          }`}
        >
          <List className="w-4 h-4" /> Lista
        </button>
        <button
          onClick={() => setView("calendar")}
          className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-1.5 transition ${
            view === "calendar" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
          }`}
        >
          <Grid3x3 className="w-4 h-4" /> Calendário
        </button>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-muted-foreground">Carregando…</div>
      ) : view === "list" ? (
        <ListView appts={appts ?? []} onEdit={openEdit} onNew={() => openNew()} />
      ) : (
        <CalendarView appts={appts ?? []} onEdit={openEdit} onDayClick={openNew} />
      )}
    </div>
  );
}

function ListView({ appts, onEdit, onNew }: {
  appts: AppointmentRow[];
  onEdit: (a: AppointmentRow) => void;
  onNew: () => void;
}) {
  const now = new Date();
  const upcoming = appts.filter((a) => new Date(a.scheduled_at) >= now && a.status !== "cancelado");
  const past = appts.filter((a) => new Date(a.scheduled_at) < now || a.status === "cancelado");

  if (appts.length === 0) {
    return (
      <Card className="p-10 text-center">
        <CalendarIcon className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
        <h3 className="font-semibold">Nenhum compromisso ainda</h3>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
          Cadastre suas consultas, exames e compromissos.
        </p>
        <Button onClick={onNew}><Plus className="w-4 h-4" /> Cadastrar primeiro</Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <section>
        <h2 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">
          Próximos ({upcoming.length})
        </h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum compromisso futuro.</p>
        ) : (
          <div className="space-y-2">
            {upcoming.map((a) => <AppointmentCard key={a.id} appt={a} onEdit={onEdit} />)}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">
            Histórico ({past.length})
          </h2>
          <div className="space-y-2">
            {past.map((a) => <AppointmentCard key={a.id} appt={a} onEdit={onEdit} />)}
          </div>
        </section>
      )}
    </div>
  );
}

function AppointmentCard({ appt, onEdit }: { appt: AppointmentRow; onEdit: (a: AppointmentRow) => void }) {
  const qc = useQueryClient();
  const info = statusInfo(appt.status);

  const updateStatus = useMutation({
    mutationFn: async (status: AppointmentStatus) => {
      const { error } = await supabase.from("appointments").update({ status }).eq("id", appt.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Status atualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("appointments").delete().eq("id", appt.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Compromisso removido");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const date = new Date(appt.scheduled_at);

  return (
    <Card className="p-4">
      <div className="flex gap-3">
        <div className="w-14 shrink-0 text-center">
          <div className="text-xs uppercase text-muted-foreground font-medium">
            {date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}
          </div>
          <div className="text-2xl font-bold leading-tight">{date.getDate()}</div>
          <div className="text-xs text-muted-foreground">{formatTime(appt.scheduled_at)}</div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <h3 className="font-semibold leading-tight flex-1 min-w-0">{appt.title}</h3>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${info.tone}`}>
              {info.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{typeLabel(appt.type)}</p>

          <div className="mt-2 space-y-1 text-sm">
            {appt.doctor && (
              <p className="flex items-center gap-1.5 text-muted-foreground">
                <Stethoscope className="w-3.5 h-3.5" />
                Dr(a). {appt.doctor}{appt.specialty ? ` • ${appt.specialty}` : ""}
              </p>
            )}
            {appt.location && (
              <p className="flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="w-3.5 h-3.5" />
                {appt.location}{appt.address ? ` — ${appt.address}` : ""}
              </p>
            )}
            {appt.notes && (
              <p className="text-xs text-muted-foreground italic line-clamp-2">{appt.notes}</p>
            )}
          </div>

          {appt.status === "agendado" && (
            <div className="flex gap-2 mt-3 flex-wrap">
              <Button size="sm" variant="default" disabled={updateStatus.isPending}
                      onClick={() => updateStatus.mutate("realizado")}>
                <Check className="w-4 h-4" /> Realizado
              </Button>
              <Button size="sm" variant="outline" disabled={updateStatus.isPending}
                      onClick={() => updateStatus.mutate("remarcado")}>
                <RotateCcw className="w-4 h-4" /> Remarcar
              </Button>
              <Button size="sm" variant="ghost" disabled={updateStatus.isPending}
                      onClick={() => updateStatus.mutate("cancelado")}>
                <X className="w-4 h-4" /> Cancelar
              </Button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1 shrink-0">
          <Button size="icon" variant="ghost" onClick={() => onEdit(appt)}>
            <Pencil className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="ghost"
                  onClick={() => { if (confirm(`Remover "${appt.title}"?`)) del.mutate(); }}>
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

function CalendarView({ appts, onEdit, onDayClick }: {
  appts: AppointmentRow[];
  onEdit: (a: AppointmentRow) => void;
  onDayClick: (d: Date) => void;
}) {
  const [month, setMonth] = useState(() => {
    const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d;
  });
  const [selected, setSelected] = useState<Date>(new Date());

  const days = useMemo(() => buildMonthGrid(month), [month]);
  const apptsByDay = useMemo(() => {
    const map = new Map<string, AppointmentRow[]>();
    for (const a of appts) {
      const d = new Date(a.scheduled_at);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const arr = map.get(key) ?? [];
      arr.push(a);
      map.set(key, arr);
    }
    return map;
  }, [appts]);

  function keyOf(d: Date) { return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; }

  function prevMonth() { const d = new Date(month); d.setMonth(d.getMonth() - 1); setMonth(d); }
  function nextMonth() { const d = new Date(month); d.setMonth(d.getMonth() + 1); setMonth(d); }

  const selectedAppts = (apptsByDay.get(keyOf(selected)) ?? []).sort(
    (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
  );

  const today = new Date();
  const weekdays = ["D", "S", "T", "Q", "Q", "S", "S"];

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <Button size="icon" variant="ghost" onClick={prevMonth}><ChevronLeft className="w-4 h-4" /></Button>
          <h2 className="font-semibold capitalize">
            {month.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
          </h2>
          <Button size="icon" variant="ghost" onClick={nextMonth}><ChevronRight className="w-4 h-4" /></Button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground mb-1">
          {weekdays.map((w, i) => <div key={i} className="py-1">{w}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((d) => {
            const inMonth = d.getMonth() === month.getMonth();
            const isToday = sameDay(d, today);
            const isSelected = sameDay(d, selected);
            const dayAppts = apptsByDay.get(keyOf(d)) ?? [];
            return (
              <button
                key={d.toISOString()}
                onClick={() => setSelected(d)}
                className={`aspect-square rounded-lg text-sm flex flex-col items-center justify-center relative transition ${
                  isSelected ? "bg-primary text-primary-foreground font-semibold"
                  : isToday ? "bg-primary-soft text-primary font-semibold"
                  : inMonth ? "hover:bg-muted text-foreground"
                  : "text-muted-foreground/40 hover:bg-muted/50"
                }`}
              >
                <span>{d.getDate()}</span>
                {dayAppts.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5">
                    {dayAppts.slice(0, 3).map((a) => (
                      <span key={a.id}
                            className={`w-1 h-1 rounded-full ${
                              isSelected ? "bg-primary-foreground" : "bg-primary"
                            }`} />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold capitalize">
            {selected.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
          </h3>
          <Button size="sm" variant="outline" onClick={() => onDayClick(selected)}>
            <Plus className="w-4 h-4" /> Adicionar
          </Button>
        </div>
        {selectedAppts.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            Nenhum compromisso neste dia.
          </Card>
        ) : (
          <div className="space-y-2">
            {selectedAppts.map((a) => <AppointmentCard key={a.id} appt={a} onEdit={onEdit} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function AppointmentDialog({ editing, presetDate, onClose }: {
  editing: AppointmentRow | null;
  presetDate: Date | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const defaultDate = editing
    ? toLocalInputValue(editing.scheduled_at)
    : toLocalInputValue((presetDate ?? defaultFuture()).toISOString());

  const [title, setTitle] = useState(editing?.title ?? "");
  const [type, setType] = useState<AppointmentType>(editing?.type ?? "consulta");
  const [doctor, setDoctor] = useState(editing?.doctor ?? "");
  const [specialty, setSpecialty] = useState(editing?.specialty ?? "");
  const [location, setLocation] = useState(editing?.location ?? "");
  const [address, setAddress] = useState(editing?.address ?? "");
  const [scheduledAt, setScheduledAt] = useState(defaultDate);
  const [duration, setDuration] = useState(editing?.duration_minutes ?? 30);
  const [reminder, setReminder] = useState(editing?.reminder_minutes_before ?? 60);
  const [status, setStatus] = useState<AppointmentStatus>(editing?.status ?? "agendado");
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return toast.error("Informe um título");
    if (!scheduledAt) return toast.error("Informe data e hora");
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Sessão expirada");
      const payload = {
        user_id: userData.user.id,
        title: title.trim(),
        type,
        doctor: doctor.trim() || null,
        specialty: specialty.trim() || null,
        location: location.trim() || null,
        address: address.trim() || null,
        scheduled_at: fromLocalInputValue(scheduledAt),
        duration_minutes: duration,
        reminder_minutes_before: reminder,
        status,
        notes: notes.trim() || null,
      };
      if (editing) {
        const { error } = await supabase.from("appointments").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success("Compromisso atualizado");
      } else {
        const { error } = await supabase.from("appointments").insert(payload);
        if (error) throw error;
        toast.success("Compromisso cadastrado");
      }
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{editing ? "Editar compromisso" : "Novo compromisso"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="title">Título*</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)}
                 placeholder="ex: Consulta com Dr. João" required />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select value={type} onValueChange={(v) => setType(v as AppointmentType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {APPOINTMENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as AppointmentStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {APPOINTMENT_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="when">Data e hora*</Label>
          <Input id="when" type="datetime-local" value={scheduledAt}
                 onChange={(e) => setScheduledAt(e.target.value)} required />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="duration">Duração (min)</Label>
            <Input id="duration" type="number" min={5} step={5} value={duration}
                   onChange={(e) => setDuration(Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reminder">Lembrete antes (min)</Label>
            <Input id="reminder" type="number" min={0} step={5} value={reminder}
                   onChange={(e) => setReminder(Number(e.target.value))} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="doctor">Médico</Label>
            <Input id="doctor" value={doctor} onChange={(e) => setDoctor(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="specialty">Especialidade</Label>
            <Input id="specialty" value={specialty} onChange={(e) => setSpecialty(e.target.value)}
                   placeholder="ex: Cardiologia" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="location">Local</Label>
          <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)}
                 placeholder="ex: Hospital São Lucas" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="address">Endereço</Label>
          <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="notes">Observações</Label>
          <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                    placeholder="Levar exames anteriores, jejum, etc." />
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function defaultFuture(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d;
}

// keep formatDateTime referenced for potential future use
void formatDateTime;
