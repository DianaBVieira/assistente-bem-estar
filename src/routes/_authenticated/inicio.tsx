import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  buildDosesForDate,
  greeting,
  formatTime,
  type MedicationRow,
  type LogRow,
  type ScheduledDose,
} from "@/lib/medication-utils";
import { Check, X, Clock, Pill, Plus, AlertCircle, CheckCircle2, Calendar as CalendarIcon, Stethoscope, MapPin } from "lucide-react";
import { statusInfo, typeLabel, formatTime as formatApptTime, type AppointmentRow } from "@/lib/appointment-utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/inicio")({
  head: () => ({ meta: [{ title: "Início — Minha Rotina" }] }),
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {greeting()}{firstName ? `, ${firstName}` : ""} 👋
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
        </p>
      </div>

      {/* Adherence card */}
      <Card className="p-5 border-0" style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-soft)" }}>
        <div className="text-primary-foreground">
          <p className="text-sm opacity-90">Adesão de hoje</p>
          <div className="flex items-end gap-2 mt-1">
            <span className="text-4xl font-bold">{adherence}%</span>
            <span className="text-sm opacity-80 pb-1.5">{taken} de {total} doses</span>
          </div>
          <div className="mt-3 h-2 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all"
                 style={{ width: `${adherence}%` }} />
          </div>
        </div>
      </Card>

      {/* Stat grid */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={CheckCircle2} value={taken} label="Tomados" tone="success" />
        <StatCard icon={Clock} value={pending} label="Pendentes" tone="primary" />
        <StatCard icon={AlertCircle} value={missed} label="Esquecidos" tone="destructive" />
      </div>

      {/* Next dose */}
      {next && (
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Próximo medicamento</p>
          <div className="mt-2 flex items-center gap-3">
            <MedAvatar med={next.medication} />
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{next.medication.name}</p>
              <p className="text-sm text-muted-foreground">
                {next.medication.dosage && `${next.medication.dosage} • `}
                {formatTime(next.scheduledAt)}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Today doses */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Medicamentos de hoje</h2>
          <Button asChild size="sm" variant="ghost">
            <Link to="/medicamentos"><Plus className="w-4 h-4" /> Adicionar</Link>
          </Button>
        </div>

        {doses.length === 0 ? (
          <Card className="p-8 text-center">
            <Pill className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              Você ainda não tem medicamentos cadastrados para hoje.
            </p>
            <Button asChild>
              <Link to="/medicamentos"><Plus className="w-4 h-4" /> Cadastrar medicamento</Link>
            </Button>
          </Card>
        ) : (
          <div className="space-y-2">
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
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, value, label, tone }: {
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  label: string;
  tone: "success" | "primary" | "destructive";
}) {
  const colors = {
    success: "text-success bg-success/10",
    primary: "text-primary bg-primary-soft",
    destructive: "text-destructive bg-destructive/10",
  }[tone];
  return (
    <Card className="p-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colors}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-2xl font-bold mt-2">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </Card>
  );
}

function MedAvatar({ med }: { med: MedicationRow }) {
  return (
    <div className="w-12 h-12 rounded-xl bg-primary-soft flex items-center justify-center text-primary overflow-hidden shrink-0">
      {med.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={med.photo_url} alt={med.name} className="w-full h-full object-cover" />
      ) : (
        <Pill className="w-5 h-5" />
      )}
    </div>
  );
}

function DoseRow({ dose, onLog, disabled }: {
  dose: ScheduledDose;
  onLog: (status: "taken" | "missed" | "late") => void;
  disabled: boolean;
}) {
  const done = dose.status === "taken" || dose.status === "late" || dose.status === "missed";
  const statusLabel: Record<ScheduledDose["status"], string> = {
    taken: "Tomado",
    late: "Atrasado",
    missed: "Esquecido",
    skipped: "Pulado",
    pending: "Pendente",
    upcoming: "Em breve",
  };
  const statusClass: Record<ScheduledDose["status"], string> = {
    taken: "bg-success/10 text-success",
    late: "bg-warning/10 text-warning-foreground",
    missed: "bg-destructive/10 text-destructive",
    skipped: "bg-muted text-muted-foreground",
    pending: "bg-primary-soft text-primary",
    upcoming: "bg-muted text-muted-foreground",
  };

  return (
    <Card className="p-3">
      <div className="flex items-center gap-3">
        <MedAvatar med={dose.medication} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <p className="font-semibold truncate">{dose.medication.name}</p>
            <span className="text-sm font-medium text-muted-foreground shrink-0">
              {formatTime(dose.scheduledAt)}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {dose.medication.dosage && (
              <span className="text-xs text-muted-foreground">{dose.medication.dosage}</span>
            )}
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${statusClass[dose.status]}`}>
              {statusLabel[dose.status]}
            </span>
          </div>
        </div>
      </div>
      {!done && (
        <div className="flex gap-2 mt-3">
          <Button size="sm" className="flex-1" disabled={disabled}
                  onClick={() => onLog(dose.status === "missed" ? "late" : "taken")}>
            <Check className="w-4 h-4" /> Tomei
          </Button>
          <Button size="sm" variant="outline" className="flex-1" disabled={disabled}
                  onClick={() => onLog("late")}>
            <Clock className="w-4 h-4" /> Atrasado
          </Button>
          <Button size="sm" variant="ghost" disabled={disabled}
                  onClick={() => onLog("missed")}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}
    </Card>
  );
}
