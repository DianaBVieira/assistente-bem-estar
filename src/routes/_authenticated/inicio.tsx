import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  buildDosesForDate,
  greeting,
  formatTime,
  type MedicationRow,
  type LogRow,
  type ScheduledDose,
} from "@/lib/medication-utils";
import {
  Check, X, Clock, Pill, Plus, AlertCircle, CheckCircle2,
  Calendar as CalendarIcon, Stethoscope, MapPin, BarChart3, CheckSquare,
} from "lucide-react";
import { statusInfo, typeLabel, formatTime as formatApptTime, type AppointmentRow } from "@/lib/appointment-utils";
import { WaterReminder } from "@/components/WaterReminder";
import { StockStatus } from "@/components/StockStatus";
import { toast } from "sonner";
import iconAsset from "@/assets/pulso-utopia-icon.png.asset.json";

export const Route = createFileRoute("/_authenticated/inicio")({
  head: () => ({ meta: [{ title: "Início — Pulso Utopia" }] }),
  component: DashboardPage,
});

function useDashboardData() {
  return useQuery({
    queryKey: ["dashboard", new Date().toISOString().slice(0, 10)],
    queryFn: async () => {
      const today = new Date();
      const start = new Date(today); start.setHours(0, 0, 0, 0);
      const end = new Date(start); end.setDate(end.getDate() + 1);
      const in7Days = new Date(today); in7Days.setDate(in7Days.getDate() + 7);

      const [{ data: user }, medsRes, logsRes, profileRes, apptsRes] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from("medications").select("*").eq("active", true),
        supabase.from("medication_logs").select("*")
          .gte("scheduled_at", start.toISOString())
          .lt("scheduled_at", end.toISOString()),
        supabase.from("profiles").select("full_name").maybeSingle(),
        supabase.from("appointments").select("*")
          .gte("scheduled_at", today.toISOString())
          .lte("scheduled_at", in7Days.toISOString())
          .neq("status", "cancelado")
          .order("scheduled_at", { ascending: true })
          .limit(5),
      ]);
      if (medsRes.error) throw medsRes.error;
      if (logsRes.error) throw logsRes.error;

      return {
        userName: profileRes.data?.full_name ?? user.user?.email?.split("@")[0] ?? "",
        meds: (medsRes.data ?? []) as MedicationRow[],
        logs: (logsRes.data ?? []) as LogRow[],
        appts: (apptsRes.data ?? []) as AppointmentRow[],
      };
    },
  });
}

function DashboardPage() {
  const { data, isLoading } = useDashboardData();
  const qc = useQueryClient();

  const logDose = useMutation({
    mutationFn: async (args: { dose: ScheduledDose; status: "taken" | "missed" | "late" }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Sessão expirada");
      const payload = {
        user_id: user.user.id,
        medication_id: args.dose.medication.id,
        scheduled_at: args.dose.scheduledIso,
        taken_at: args.status === "missed" ? null : new Date().toISOString(),
        status: args.status,
      };
      const { error } = await supabase
        .from("medication_logs")
        .upsert(payload, { onConflict: "medication_id,scheduled_at" });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["medications-stock"] });
      const msg = vars.status === "taken" ? "Registrado como tomado ✓" :
                  vars.status === "late" ? "Registrado como tomado atrasado" :
                  "Registrado como não tomado";
      toast.success(msg);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !data) {
    return <div className="py-20 text-center text-muted-foreground">Carregando…</div>;
  }

  const doses = buildDosesForDate(data.meds, data.logs, new Date());
  const total = doses.length;
  const taken = doses.filter((d) => d.status === "taken" || d.status === "late").length;
  const pending = doses.filter((d) => d.status === "pending" || d.status === "upcoming").length;
  const missed = doses.filter((d) => d.status === "missed").length;
  const adherence = total > 0 ? Math.round((taken / total) * 100) : 0;
  const next = doses.find((d) => d.status === "upcoming" || d.status === "pending");

  const firstName = (data.userName || "").split(" ")[0];

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
          {greeting()}{firstName ? `, ${firstName}` : ""} <span className="inline-block">👋</span>
        </h1>
        <p className="text-muted-foreground text-base mt-1.5">
          {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
        </p>
      </div>

      {/* Adherence hero card */}
      <div
        className="relative overflow-hidden rounded-3xl px-6 py-7 sm:px-8 sm:py-8"
        style={{
          background: "var(--gradient-primary)",
          boxShadow: "var(--shadow-soft)",
        }}
      >
        <div className="relative z-10 max-w-[75%] text-white">
          <p className="text-sm font-medium opacity-90">Adesão de hoje</p>
          <div className="flex items-baseline gap-3 mt-2">
            <span className="text-5xl sm:text-6xl font-bold tracking-tight">{adherence}%</span>
            <span className="text-sm sm:text-base opacity-85">{taken} de {total} doses</span>
          </div>
          <div className="mt-5 h-2.5 rounded-full bg-white/20 overflow-hidden max-w-md">
            <div
              className="h-full rounded-full bg-white/95 transition-all duration-500"
              style={{ width: `${adherence}%` }}
            />
          </div>
        </div>
        {/* Floating logo bubble */}
        <div
          className="pointer-events-none absolute -right-4 top-1/2 -translate-y-1/2 hidden sm:grid place-items-center h-40 w-40 rounded-full"
          style={{ background: "var(--brand-cream)", boxShadow: "0 12px 40px rgba(0,0,0,0.15)" }}
        >
          <img src={iconAsset.url} alt="" className="h-28 w-28 object-contain" />
        </div>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={CheckCircle2} value={taken} label="Tomados"
          iconBg="bg-[#DCFCE7] text-[#22C55E]"
          sparklineColor="#22C55E"
        />
        <StatCard
          icon={Clock} value={pending} label="Pendentes"
          iconBg="bg-[#E9E4FF] text-[#5B3BD1]"
          sparklineColor="#5B3BD1"
        />
        <StatCard
          icon={AlertCircle} value={missed} label="Esquecidos"
          iconBg="bg-[#FFE4E0] text-[#FF6B5B]"
          sparklineColor="#FF6B5B"
        />
      </div>

      {/* Next dose card */}
      {next && <NextMedCard dose={next} />}

      {/* Quick actions */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Atalhos rápidos
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <QuickAction to="/medicamentos" icon={Plus} label="Adicionar remédio" tone="primary" />
          <QuickAction to="/agenda" icon={CalendarIcon} label="Ver agenda" tone="lilac" />
          <QuickAction to="/tarefas" icon={CheckSquare} label="Nova tarefa" tone="success" />
          <QuickAction to="/relatorios" icon={BarChart3} label="Relatórios" tone="coral" />
        </div>
      </section>

      <StockStatus />
      <WaterReminder />

      {/* Upcoming appointments */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-lg">Próximos compromissos</h2>
          <Button asChild size="sm" variant="ghost" className="text-primary hover:bg-primary-soft">
            <Link to="/agenda"><Plus className="w-4 h-4" /> Novo</Link>
          </Button>
        </div>
        {data.appts.length === 0 ? (
          <Card className="p-8 text-center rounded-3xl border-0" style={{ boxShadow: "var(--shadow-card)" }}>
            <CalendarIcon className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              Sem compromissos nos próximos 7 dias.
            </p>
            <Button asChild size="sm" variant="outline">
              <Link to="/agenda"><Plus className="w-4 h-4" /> Agendar</Link>
            </Button>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {data.appts.map((a) => <UpcomingApptRow key={a.id} appt={a} />)}
          </div>
        )}
      </section>

      {/* Today doses */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-lg">Medicamentos de hoje</h2>
          <Button asChild size="sm" variant="ghost" className="text-primary hover:bg-primary-soft">
            <Link to="/medicamentos"><Plus className="w-4 h-4" /> Adicionar</Link>
          </Button>
        </div>

        {doses.length === 0 ? (
          <Card className="p-10 text-center rounded-3xl border-0" style={{ boxShadow: "var(--shadow-card)" }}>
            <div className="mx-auto w-14 h-14 rounded-2xl bg-primary-soft grid place-items-center mb-3">
              <Pill className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Você ainda não tem medicamentos cadastrados para hoje.
            </p>
            <Button asChild>
              <Link to="/medicamentos"><Plus className="w-4 h-4" /> Cadastrar medicamento</Link>
            </Button>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {doses.map((dose) => (
              <DoseRow
                key={`${dose.medication.id}-${dose.scheduledIso}`}
                dose={dose}
                onLog={(status) => logDose.mutate({ dose, status })}
                disabled={logDose.isPending}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* -------------------- Sub-components -------------------- */

function Sparkline({ color, variant = "wave" }: { color: string; variant?: "wave" | "up" | "bumpy" }) {
  const paths = {
    wave: "M0 18 Q10 8, 20 14 T40 12 T60 16",
    up: "M0 20 Q10 18, 20 12 T40 8 T60 4",
    bumpy: "M0 14 Q8 22, 16 12 T32 18 T48 10 T60 16",
  };
  return (
    <svg width="60" height="24" viewBox="0 0 60 24" fill="none" className="opacity-80">
      <path d={paths[variant]} stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function StatCard({
  icon: Icon, value, label, iconBg, sparklineColor,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  label: string;
  iconBg: string;
  sparklineColor: string;
}) {
  return (
    <div
      className="relative rounded-3xl bg-card p-5 border-0 transition hover:-translate-y-0.5"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className={`w-11 h-11 rounded-2xl grid place-items-center ${iconBg}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="mt-4 flex items-end justify-between">
        <div>
          <p className="text-4xl font-bold tracking-tight leading-none">{value}</p>
          <p className="text-sm text-muted-foreground mt-1.5">{label}</p>
        </div>
        <Sparkline color={sparklineColor} variant={label === "Tomados" ? "up" : label === "Pendentes" ? "wave" : "bumpy"} />
      </div>
    </div>
  );
}

function QuickAction({
  to, icon: Icon, label, tone,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  tone: "primary" | "lilac" | "success" | "coral";
}) {
  const tones = {
    primary: "bg-[#E9E4FF] text-[#5B3BD1]",
    lilac: "bg-[#F1EDFF] text-[#7E6AD9]",
    success: "bg-[#DCFCE7] text-[#22C55E]",
    coral: "bg-[#FFE4E0] text-[#FF6B5B]",
  }[tone];
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 rounded-3xl bg-card p-4 transition hover:-translate-y-0.5 hover:shadow-md"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <span className={`grid place-items-center w-11 h-11 rounded-2xl shrink-0 ${tones}`}>
        <Icon className="w-5 h-5" />
      </span>
      <span className="font-medium text-sm text-foreground truncate">{label}</span>
    </Link>
  );
}

function NextMedCard({ dose }: { dose: ScheduledDose }) {
  const now = new Date();
  const diffMs = dose.scheduledAt.getTime() - now.getTime();
  const diffMin = Math.max(0, Math.round(diffMs / 60000));
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  const badge = diffMs <= 0
    ? "Agora"
    : h > 0 ? `Faltam ${h}h ${m.toString().padStart(2, "0")}m` : `Faltam ${m}m`;

  return (
    <div
      className="relative overflow-hidden rounded-3xl bg-card p-5 sm:p-6"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <p className="text-xs uppercase tracking-wider text-primary font-semibold">Próximo medicamento</p>
      <div className="mt-3 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-primary-soft grid place-items-center text-primary shrink-0 overflow-hidden">
          {dose.medication.photo_url ? (
            <img src={dose.medication.photo_url} alt={dose.medication.name} className="w-full h-full object-cover" />
          ) : (
            <Pill className="w-6 h-6" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-2xl font-bold truncate leading-tight">{dose.medication.name}</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            {dose.medication.dosage && <>{dose.medication.dosage} · </>}
            {formatTime(dose.scheduledAt)}
          </p>
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary">
            <Clock className="w-3 h-3" />
            {badge}
          </span>
        </div>
      </div>
      {/* Decorative illustration */}
      <div
        className="pointer-events-none absolute -right-8 -bottom-6 hidden sm:block h-40 w-56 rounded-full opacity-70"
        style={{ background: "var(--gradient-water)" }}
      />
    </div>
  );
}

function UpcomingApptRow({ appt }: { appt: AppointmentRow }) {
  const info = statusInfo(appt.status);
  const date = new Date(appt.scheduled_at);
  const isToday = date.toDateString() === new Date().toDateString();
  return (
    <Link to="/agenda" className="block">
      <div
        className="flex gap-4 items-center rounded-3xl bg-card p-4 transition hover:-translate-y-0.5"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div className="w-14 shrink-0 text-center rounded-2xl bg-primary-soft py-2">
          <div className="text-[10px] uppercase text-primary font-semibold">
            {date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}
          </div>
          <div className="text-xl font-bold leading-tight text-primary">{date.getDate()}</div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold truncate">{appt.title}</p>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${info.tone}`}>
              {isToday ? "Hoje" : info.label}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatApptTime(appt.scheduled_at)}</span>
            <span>{typeLabel(appt.type)}</span>
            {appt.doctor && (
              <span className="hidden sm:flex items-center gap-1 truncate">
                <Stethoscope className="w-3 h-3" />{appt.doctor}
              </span>
            )}
            {appt.location && (
              <span className="hidden md:flex items-center gap-1 truncate">
                <MapPin className="w-3 h-3" />{appt.location}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

function DoseRow({ dose, onLog, disabled }: {
  dose: ScheduledDose;
  onLog: (status: "taken" | "missed" | "late") => void;
  disabled: boolean;
}) {
  const done = dose.status === "taken" || dose.status === "late" || dose.status === "missed";
  const statusLabel: Record<ScheduledDose["status"], string> = {
    taken: "Tomado", late: "Atrasado", missed: "Esquecido",
    skipped: "Pulado", pending: "Pendente", upcoming: "Em breve",
  };
  const statusClass: Record<ScheduledDose["status"], string> = {
    taken: "bg-[#DCFCE7] text-[#22C55E]",
    late: "bg-[#FEF3C7] text-[#B45309]",
    missed: "bg-[#FFE4E0] text-[#FF6B5B]",
    skipped: "bg-muted text-muted-foreground",
    pending: "bg-primary-soft text-primary",
    upcoming: "bg-muted text-muted-foreground",
  };

  return (
    <div
      className="rounded-3xl bg-card p-4"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-primary-soft grid place-items-center text-primary shrink-0 overflow-hidden">
          {dose.medication.photo_url ? (
            <img src={dose.medication.photo_url} alt={dose.medication.name} className="w-full h-full object-cover" />
          ) : (
            <Pill className="w-6 h-6" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <p className="font-semibold truncate">{dose.medication.name}</p>
            <span className="text-sm font-medium text-muted-foreground shrink-0">
              {formatTime(dose.scheduledAt)}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            {dose.medication.dosage && (
              <span className="text-xs text-muted-foreground">{dose.medication.dosage}</span>
            )}
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusClass[dose.status]}`}>
              {statusLabel[dose.status]}
            </span>
          </div>
        </div>
      </div>
      {!done && (
        <div className="flex gap-2 mt-3">
          <Button size="sm" className="flex-1 rounded-xl" disabled={disabled}
                  onClick={() => onLog(dose.status === "missed" ? "late" : "taken")}>
            <Check className="w-4 h-4" /> Tomei
          </Button>
          <Button size="sm" variant="outline" className="flex-1 rounded-xl" disabled={disabled}
                  onClick={() => onLog("late")}>
            <Clock className="w-4 h-4" /> Atrasado
          </Button>
          <Button size="sm" variant="ghost" className="rounded-xl" disabled={disabled}
                  onClick={() => onLog("missed")}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
