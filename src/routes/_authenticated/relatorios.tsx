import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
  LineChart, Line,
} from "recharts";
import { Download, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";
import { buildDosesForDate, type MedicationRow, type LogRow } from "@/lib/medication-utils";
import { exportAdherencePdf } from "@/lib/pdf-report";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios — Minha Rotina" }] }),
  component: ReportsPage,
});

type Period = "7" | "30" | "90" | "365";

function ReportsPage() {
  const [period, setPeriod] = useState<Period>("30");

  const days = parseInt(period, 10);
  const { data, isLoading } = useQuery({
    queryKey: ["report", period],
    queryFn: async () => {
      const end = new Date(); end.setHours(23, 59, 59, 999);
      const start = new Date(end); start.setDate(start.getDate() - days + 1); start.setHours(0, 0, 0, 0);

      const [medsRes, logsRes, profileRes] = await Promise.all([
        supabase.from("medications").select("*"),
        supabase.from("medication_logs").select("*")
          .gte("scheduled_at", start.toISOString())
          .lte("scheduled_at", end.toISOString()),
        supabase.from("profiles").select("full_name").maybeSingle(),
      ]);
      if (medsRes.error) throw medsRes.error;
      if (logsRes.error) throw logsRes.error;

      return {
        meds: (medsRes.data ?? []) as MedicationRow[],
        logs: (logsRes.data ?? []) as LogRow[],
        start, end,
        userName: profileRes.data?.full_name ?? "",
      };
    },
  });

  const stats = useMemo(() => {
    if (!data) return null;
    const dayBuckets: { date: string; label: string; total: number; taken: number; missed: number; adherence: number }[] = [];
    const missedByHour = new Map<string, number>();
    const missedByMed = new Map<string, { name: string; count: number }>();
    let totalScheduled = 0, totalTaken = 0, totalMissed = 0;

    for (let i = 0; i < days; i++) {
      const d = new Date(data.start); d.setDate(d.getDate() + i);
      const doses = buildDosesForDate(data.meds, data.logs, d);
      let dayTaken = 0, dayMissed = 0;
      for (const dose of doses) {
        const isPast = dose.scheduledAt.getTime() < Date.now();
        if (!isPast) continue;
        totalScheduled++;
        if (dose.status === "taken" || dose.status === "late") { dayTaken++; totalTaken++; }
        else if (dose.status === "missed") {
          dayMissed++; totalMissed++;
          const h = `${dose.scheduledAt.getHours().toString().padStart(2, "0")}:00`;
          missedByHour.set(h, (missedByHour.get(h) ?? 0) + 1);
          const cur = missedByMed.get(dose.medication.id) ?? { name: dose.medication.name, count: 0 };
          cur.count++;
          missedByMed.set(dose.medication.id, cur);
        }
      }
      const dayTotal = dayTaken + dayMissed;
      dayBuckets.push({
        date: d.toISOString().slice(0, 10),
        label: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        total: dayTotal,
        taken: dayTaken,
        missed: dayMissed,
        adherence: dayTotal > 0 ? Math.round((dayTaken / dayTotal) * 100) : 0,
      });
    }

    const adherence = totalScheduled > 0 ? Math.round((totalTaken / totalScheduled) * 100) : 0;
    const hourly = Array.from(missedByHour.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([hour, count]) => ({ hour, count }));
    const topMissed = Array.from(missedByMed.values())
      .sort((a, b) => b.count - a.count).slice(0, 5);

    return { dayBuckets, totalScheduled, totalTaken, totalMissed, adherence, hourly, topMissed };
  }, [data, days]);

  if (isLoading || !data || !stats) {
    return <div className="py-20 text-center text-muted-foreground">Carregando…</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>
          <p className="text-sm text-muted-foreground">Acompanhe sua adesão e padrões</p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="365">Último ano</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => exportAdherencePdf({
            userName: data.userName,
            periodLabel: periodLabel(period),
            stats, start: data.start, end: data.end,
          })}>
            <Download className="w-4 h-4" /> PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="w-9 h-9 rounded-lg bg-primary-soft text-primary flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold mt-2">{stats.adherence}%</p>
          <p className="text-xs text-muted-foreground">Taxa de adesão</p>
        </Card>
        <Card className="p-4">
          <div className="w-9 h-9 rounded-lg bg-success/10 text-success flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold mt-2">{stats.totalTaken}</p>
          <p className="text-xs text-muted-foreground">Tomados</p>
        </Card>
        <Card className="p-4">
          <div className="w-9 h-9 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center">
            <AlertCircle className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold mt-2">{stats.totalMissed}</p>
          <p className="text-xs text-muted-foreground">Esquecidos</p>
        </Card>
      </div>

      <Card className="p-4">
        <h3 className="font-semibold mb-3">Evolução da adesão</h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats.dayBuckets}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="label" stroke="var(--color-muted-foreground)" fontSize={11} />
              <YAxis domain={[0, 100]} stroke="var(--color-muted-foreground)" fontSize={11} />
              <Tooltip formatter={(v) => [`${v}%`, "Adesão"]} contentStyle={{ borderRadius: 8 }} />
              <Line type="monotone" dataKey="adherence" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="font-semibold mb-3">Doses por dia</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.dayBuckets}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="label" stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={{ borderRadius: 8 }} />
                <Bar dataKey="taken" stackId="a" fill="var(--color-success)" name="Tomados" />
                <Bar dataKey="missed" stackId="a" fill="var(--color-destructive)" name="Esquecidos" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold mb-3">Horários mais esquecidos</h3>
          {stats.hourly.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Nenhum esquecimento registrado 🎉
            </p>
          ) : (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.hourly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="hour" stroke="var(--color-muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
                  <Tooltip contentStyle={{ borderRadius: 8 }} />
                  <Bar dataKey="count" fill="var(--color-warning)" name="Esquecimentos" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      <Card className="p-4">
        <h3 className="font-semibold mb-3">Medicamentos mais esquecidos</h3>
        {stats.topMissed.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">Nenhum esquecimento no período.</p>
        ) : (
          <div className="space-y-2">
            {stats.topMissed.map((m) => (
              <div key={m.name} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <span className="text-sm font-medium">{m.name}</span>
                <span className="text-sm text-destructive font-semibold">{m.count}x</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function periodLabel(p: Period) {
  return { "7": "Últimos 7 dias", "30": "Últimos 30 dias", "90": "Últimos 90 dias", "365": "Último ano" }[p];
}
