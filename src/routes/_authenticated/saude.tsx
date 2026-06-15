import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Activity, Plus, Heart, Droplet, Scale, Moon, Smile, GlassWater, Trash2, TrendingUp, TrendingDown,
} from "lucide-react";
import { toast } from "sonner";
import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/_authenticated/saude")({
  head: () => ({ meta: [{ title: "Saúde e Bem-estar — Minha Rotina" }] }),
  component: HealthPage,
});

type MetricType = "pressao" | "glicemia" | "peso" | "sono" | "humor" | "hidratacao";

type MetricRow = {
  id: string;
  user_id: string;
  type: MetricType;
  value_1: number | null;
  value_2: number | null;
  value_3: number | null;
  text_value: string | null;
  notes: string | null;
  measured_at: string;
};

const METRICS: Record<MetricType, {
  label: string;
  short: string;
  icon: typeof Heart;
  color: string;
  unit: string;
}> = {
  pressao:    { label: "Pressão arterial", short: "Pressão",    icon: Heart,      color: "hsl(0 72% 51%)",  unit: "mmHg" },
  glicemia:   { label: "Glicemia",         short: "Glicemia",   icon: Droplet,    color: "hsl(25 95% 53%)", unit: "mg/dL" },
  peso:       { label: "Peso",             short: "Peso",       icon: Scale,      color: "hsl(220 70% 50%)",unit: "kg" },
  sono:       { label: "Sono",             short: "Sono",       icon: Moon,       color: "hsl(260 60% 55%)",unit: "h" },
  humor:      { label: "Humor",            short: "Humor",      icon: Smile,      color: "hsl(45 90% 50%)", unit: "" },
  hidratacao: { label: "Hidratação",       short: "Água",       icon: GlassWater, color: "hsl(195 85% 45%)",unit: "copos" },
};

const MOODS = [
  { value: "otimo", label: "Ótimo", emoji: "😄" },
  { value: "bom", label: "Bom", emoji: "🙂" },
  { value: "neutro", label: "Neutro", emoji: "😐" },
  { value: "cansado", label: "Cansado", emoji: "😩" },
  { value: "triste", label: "Triste", emoji: "😢" },
];

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(local: string): string {
  return new Date(local).toISOString();
}

function formatMeasured(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

function formatMetricValue(m: MetricRow): string {
  switch (m.type) {
    case "pressao":
      return `${m.value_1 ?? "?"}/${m.value_2 ?? "?"} mmHg${m.value_3 ? ` · ${m.value_3} bpm` : ""}`;
    case "glicemia":   return `${m.value_1 ?? "?"} mg/dL`;
    case "peso":       return `${m.value_1 ?? "?"} kg`;
    case "sono":       return `${m.value_1 ?? "?"} h`;
    case "hidratacao": return `${m.value_1 ?? "?"} copos`;
    case "humor": {
      const mood = MOODS.find((x) => x.value === m.text_value);
      return mood ? `${mood.emoji} ${mood.label}` : (m.text_value ?? "—");
    }
  }
}

function HealthPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<MetricType | "todos">("todos");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MetricRow | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["health-metrics"],
    queryFn: async () => {
      const since = new Date(); since.setDate(since.getDate() - 60);
      const { data, error } = await supabase.from("health_metrics")
        .select("*")
        .gte("measured_at", since.toISOString())
        .order("measured_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as MetricRow[];
    },
  });

  const grouped = useMemo(() => {
    const g: Record<MetricType, MetricRow[]> = {
      pressao: [], glicemia: [], peso: [], sono: [], humor: [], hidratacao: [],
    };
    (data ?? []).forEach((m) => g[m.type].push(m));
    return g;
  }, [data]);

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("health_metrics").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["health-metrics"] });
      toast.success("Registro removido");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao remover"),
  });

  const visibleTypes: MetricType[] = tab === "todos"
    ? (Object.keys(METRICS) as MetricType[])
    : [tab];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" /> Saúde e Bem-estar
          </h1>
          <p className="text-sm text-muted-foreground">Acompanhe seus indicadores no dia a dia.</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(null)} className="gap-2">
              <Plus className="w-4 h-4" /> Novo registro
            </Button>
          </DialogTrigger>
          <MetricDialog
            editing={editing}
            onClose={() => { setOpen(false); setEditing(null); }}
          />
        </Dialog>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as MetricType | "todos")}>
        <TabsList className="w-full overflow-x-auto justify-start">
          <TabsTrigger value="todos">Todos</TabsTrigger>
          {(Object.keys(METRICS) as MetricType[]).map((t) => (
            <TabsTrigger key={t} value={t}>{METRICS[t].short}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={tab} className="mt-4 space-y-4">
          {isLoading ? (
            <Card className="p-6 text-center text-muted-foreground">Carregando…</Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {visibleTypes.map((t) => (
                <MetricCard
                  key={t}
                  type={t}
                  rows={grouped[t]}
                  onAdd={() => { setEditing({ ...emptyMetric(t) }); setOpen(true); }}
                  onEdit={(row) => { setEditing(row); setOpen(true); }}
                  onDelete={(id) => remove.mutate(id)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function emptyMetric(type: MetricType): MetricRow {
  return {
    id: "", user_id: "", type,
    value_1: null, value_2: null, value_3: null,
    text_value: null, notes: null,
    measured_at: new Date().toISOString(),
  };
}

function MetricCard({ type, rows, onAdd, onEdit, onDelete }: {
  type: MetricType;
  rows: MetricRow[];
  onAdd: () => void;
  onEdit: (row: MetricRow) => void;
  onDelete: (id: string) => void;
}) {
  const meta = METRICS[type];
  const Icon = meta.icon;
  const latest = rows[0];
  const previous = rows[1];

  const chartData = useMemo(() => {
    return [...rows]
      .filter((r) => r.value_1 != null)
      .reverse()
      .slice(-14)
      .map((r) => ({
        date: new Date(r.measured_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        value: Number(r.value_1),
        value2: r.value_2 != null ? Number(r.value_2) : undefined,
      }));
  }, [rows]);

  const trend = useMemo(() => {
    if (!latest?.value_1 || !previous?.value_1) return null;
    const diff = Number(latest.value_1) - Number(previous.value_1);
    if (Math.abs(diff) < 0.01) return null;
    return diff;
  }, [latest, previous]);

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${meta.color}1a`, color: meta.color }}>
            <Icon className="w-5 h-5" />
          </span>
          <div>
            <p className="font-semibold leading-tight">{meta.label}</p>
            {latest ? (
              <p className="text-xs text-muted-foreground">
                Último: {formatMeasured(latest.measured_at)}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Sem registros ainda</p>
            )}
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={onAdd} className="gap-1">
          <Plus className="w-4 h-4" /> Registrar
        </Button>
      </div>

      {latest && (
        <div className="flex items-baseline gap-3">
          <p className="text-2xl font-bold" style={{ color: meta.color }}>
            {formatMetricValue(latest)}
          </p>
          {trend != null && type !== "humor" && (
            <span className={`text-xs font-medium inline-flex items-center gap-0.5 ${
              trend > 0 ? "text-destructive" : "text-emerald-600"
            }`}>
              {trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(trend).toFixed(type === "peso" ? 1 : 0)} {meta.unit}
            </span>
          )}
        </div>
      )}

      {chartData.length >= 2 && (
        <div className="h-32 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={40} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
              />
              <Line type="monotone" dataKey="value" stroke={meta.color} strokeWidth={2} dot={{ r: 3 }} />
              {type === "pressao" && (
                <Line type="monotone" dataKey="value2" stroke={meta.color} strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3 }} />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {rows.length > 0 && (
        <div className="border-t pt-3 space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recentes</p>
          {rows.slice(0, 3).map((r) => (
            <div key={r.id} className="flex items-center justify-between text-sm group">
              <button
                onClick={() => onEdit(r)}
                className="flex-1 text-left hover:text-primary transition"
              >
                <span className="font-medium">{formatMetricValue(r)}</span>
                <span className="text-muted-foreground"> · {formatMeasured(r.measured_at)}</span>
              </button>
              <button
                onClick={() => onDelete(r.id)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition p-1"
                aria-label="Remover"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function MetricDialog({ editing, onClose }: {
  editing: MetricRow | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [type, setType] = useState<MetricType>(editing?.type ?? "pressao");
  const [v1, setV1] = useState<string>(editing?.value_1?.toString() ?? "");
  const [v2, setV2] = useState<string>(editing?.value_2?.toString() ?? "");
  const [v3, setV3] = useState<string>(editing?.value_3?.toString() ?? "");
  const [textValue, setTextValue] = useState<string>(editing?.text_value ?? "");
  const [notes, setNotes] = useState<string>(editing?.notes ?? "");
  const [measuredAt, setMeasuredAt] = useState<string>(
    toLocalInput(editing?.measured_at ?? new Date().toISOString())
  );

  const save = useMutation({
    mutationFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Sessão expirada");
      const payload = {
        user_id: user.user.id,
        type,
        value_1: v1 === "" ? null : Number(v1),
        value_2: v2 === "" ? null : Number(v2),
        value_3: v3 === "" ? null : Number(v3),
        text_value: type === "humor" ? (textValue || null) : null,
        notes: notes.trim() || null,
        measured_at: fromLocalInput(measuredAt),
      };
      if (editing?.id) {
        const { error } = await supabase.from("health_metrics").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("health_metrics").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["health-metrics"] });
      toast.success(editing?.id ? "Registro atualizado" : "Registro adicionado");
      onClose();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (type === "humor") {
      if (!textValue) { toast.error("Escolha como você se sente"); return; }
    } else if (type === "pressao") {
      if (!v1 || !v2) { toast.error("Informe sistólica e diastólica"); return; }
    } else if (!v1) {
      toast.error("Informe o valor"); return;
    }
    save.mutate();
  }

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>{editing?.id ? "Editar registro" : "Novo registro"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        {!editing?.id && (
          <div className="space-y-1.5">
            <Label>Tipo de medição</Label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(METRICS) as MetricType[]).map((t) => {
                const Icon = METRICS[t].icon;
                const active = type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`p-3 rounded-lg border text-xs font-medium flex flex-col items-center gap-1 transition ${
                      active ? "border-primary bg-primary-soft text-primary" : "border-border hover:bg-muted"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {METRICS[t].short}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {type === "pressao" && (
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1.5">
              <Label>Sistólica</Label>
              <Input type="number" inputMode="numeric" value={v1} onChange={(e) => setV1(e.target.value)} placeholder="120" />
            </div>
            <div className="space-y-1.5">
              <Label>Diastólica</Label>
              <Input type="number" inputMode="numeric" value={v2} onChange={(e) => setV2(e.target.value)} placeholder="80" />
            </div>
            <div className="space-y-1.5">
              <Label>Pulso</Label>
              <Input type="number" inputMode="numeric" value={v3} onChange={(e) => setV3(e.target.value)} placeholder="72" />
            </div>
          </div>
        )}

        {type === "glicemia" && (
          <div className="space-y-1.5">
            <Label>Glicemia (mg/dL)</Label>
            <Input type="number" inputMode="numeric" value={v1} onChange={(e) => setV1(e.target.value)} placeholder="100" />
          </div>
        )}

        {type === "peso" && (
          <div className="space-y-1.5">
            <Label>Peso (kg)</Label>
            <Input type="number" inputMode="decimal" step="0.1" value={v1} onChange={(e) => setV1(e.target.value)} placeholder="70.5" />
          </div>
        )}

        {type === "sono" && (
          <div className="space-y-1.5">
            <Label>Horas de sono</Label>
            <Input type="number" inputMode="decimal" step="0.5" value={v1} onChange={(e) => setV1(e.target.value)} placeholder="7.5" />
          </div>
        )}

        {type === "hidratacao" && (
          <div className="space-y-1.5">
            <Label>Copos de água</Label>
            <Input type="number" inputMode="numeric" value={v1} onChange={(e) => setV1(e.target.value)} placeholder="8" />
          </div>
        )}

        {type === "humor" && (
          <div className="space-y-1.5">
            <Label>Como você está se sentindo?</Label>
            <div className="grid grid-cols-5 gap-2">
              {MOODS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setTextValue(m.value)}
                  className={`p-2 rounded-lg border text-xs flex flex-col items-center gap-1 transition ${
                    textValue === m.value ? "border-primary bg-primary-soft" : "border-border hover:bg-muted"
                  }`}
                >
                  <span className="text-2xl">{m.emoji}</span>
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <Label>Data e hora</Label>
          <Input type="datetime-local" value={measuredAt} onChange={(e) => setMeasuredAt(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label>Observações (opcional)</Label>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ex.: após almoço, depois da caminhada…" />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
