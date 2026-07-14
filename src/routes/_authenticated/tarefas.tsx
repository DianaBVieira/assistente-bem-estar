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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle2, Plus, Trash2, Pencil, ListTodo, Droplet, Footprints,
  Pill, Stethoscope, Sparkles, Flag, Calendar as CalendarIcon, Bell,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/tarefas")({
  head: () => ({ meta: [{ title: "Tarefas — Minha Rotina" }] }),
  component: TasksPage,
});

type Priority = "baixa" | "media" | "alta";
type TaskRow = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string | null;
  priority: Priority;
  due_at: string | null;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  alarm_enabled?: boolean;
  alarm_message?: string | null;
};

const PRIORITY_LABEL: Record<Priority, string> = { baixa: "Baixa", media: "Média", alta: "Alta" };
const PRIORITY_CLASS: Record<Priority, string> = {
  baixa: "bg-muted text-muted-foreground",
  media: "bg-primary-soft text-primary",
  alta: "bg-destructive/10 text-destructive",
};

const SUGGESTIONS: { title: string; category: string; icon: typeof Droplet }[] = [
  { title: "Beber água", category: "Saúde", icon: Droplet },
  { title: "Fazer caminhada", category: "Exercício", icon: Footprints },
  { title: "Comprar remédios", category: "Medicamentos", icon: Pill },
  { title: "Marcar consulta", category: "Saúde", icon: Stethoscope },
];

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(s: string): string | null {
  if (!s) return null;
  return new Date(s).toISOString();
}

function formatDue(iso: string | null): string {
  if (!iso) return "Sem prazo";
  const d = new Date(iso);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const day = new Date(d); day.setHours(0, 0, 0, 0);
  const diff = Math.round((day.getTime() - today.getTime()) / 86400000);
  const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (diff === 0) return `Hoje • ${time}`;
  if (diff === 1) return `Amanhã • ${time}`;
  if (diff === -1) return `Ontem • ${time}`;
  if (diff < 0) return `Atrasada • ${d.toLocaleDateString("pt-BR")}`;
  return `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} • ${time}`;
}

function TasksPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"pendentes" | "concluidas">("pendentes");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TaskRow | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("completed", { ascending: true })
        .order("due_at", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as TaskRow[];
    },
  });

  const toggleDone = useMutation({
    mutationFn: async (t: TaskRow) => {
      const completed = !t.completed;
      const { error } = await supabase
        .from("tasks")
        .update({ completed, completed_at: completed ? new Date().toISOString() : null })
        .eq("id", t.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks"] }); toast.success("Tarefa removida"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const tasks = data ?? [];
  const pendentes = useMemo(() => tasks.filter((t) => !t.completed), [tasks]);
  const concluidas = useMemo(() => tasks.filter((t) => t.completed), [tasks]);
  const showing = tab === "pendentes" ? pendentes : concluidas;

  const totalToday = pendentes.filter((t) => {
    if (!t.due_at) return false;
    return new Date(t.due_at).toDateString() === new Date().toDateString();
  }).length;
  const overdue = pendentes.filter((t) => t.due_at && new Date(t.due_at) < new Date()).length;

  function openNew() { setEditing(null); setOpen(true); }
  function openEdit(t: TaskRow) { setEditing(t); setOpen(true); }

  async function quickAdd(title: string, category: string) {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("tasks").insert({
      user_id: u.user.id, title, category, priority: "media",
    });
    if (error) toast.error(error.message);
    else { toast.success("Tarefa adicionada"); qc.invalidateQueries({ queryKey: ["tasks"] }); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tarefas</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Organize sua rotina e ações do dia.
          </p>
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4" /> Nova</Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-primary-soft text-primary">
            <ListTodo className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold mt-2">{pendentes.length}</p>
          <p className="text-xs text-muted-foreground">Pendentes</p>
        </Card>
        <Card className="p-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-success/10 text-success">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold mt-2">{totalToday}</p>
          <p className="text-xs text-muted-foreground">Para hoje</p>
        </Card>
        <Card className="p-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-destructive/10 text-destructive">
            <Flag className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold mt-2">{overdue}</p>
          <p className="text-xs text-muted-foreground">Atrasadas</p>
        </Card>
      </div>

      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-2 flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> Sugestões rápidas
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {SUGGESTIONS.map((s) => (
            <button key={s.title}
              onClick={() => quickAdd(s.title, s.category)}
              className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-full border border-border bg-card hover:bg-muted text-sm transition">
              <s.icon className="w-4 h-4 text-primary" />
              {s.title}
            </button>
          ))}
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="pendentes">Pendentes ({pendentes.length})</TabsTrigger>
          <TabsTrigger value="concluidas">Concluídas ({concluidas.length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Carregando…</div>
      ) : showing.length === 0 ? (
        <Card className="p-8 text-center">
          <CheckCircle2 className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-4">
            {tab === "pendentes" ? "Nenhuma tarefa pendente. Tudo em dia!" : "Você ainda não concluiu tarefas."}
          </p>
          {tab === "pendentes" && (
            <Button onClick={openNew}><Plus className="w-4 h-4" /> Adicionar tarefa</Button>
          )}
        </Card>
      ) : (
        <div className="space-y-2">
          {showing.map((t) => (
            <TaskItem
              key={t.id}
              task={t}
              onToggle={() => toggleDone.mutate(t)}
              onEdit={() => openEdit(t)}
              onDelete={() => remove.mutate(t.id)}
            />
          ))}
        </div>
      )}

      <TaskDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        onSaved={() => qc.invalidateQueries({ queryKey: ["tasks"] })}
      />
    </div>
  );
}

function TaskItem({ task, onToggle, onEdit, onDelete }: {
  task: TaskRow;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const overdue = !task.completed && task.due_at && new Date(task.due_at) < new Date();
  return (
    <Card className="p-3">
      <div className="flex items-start gap-3">
        <Checkbox checked={task.completed} onCheckedChange={onToggle} className="mt-1" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={`font-semibold ${task.completed ? "line-through text-muted-foreground" : ""}`}>
              {task.title}
            </p>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${PRIORITY_CLASS[task.priority]}`}>
              {PRIORITY_LABEL[task.priority]}
            </span>
            {task.category && (
              <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-muted text-muted-foreground">
                {task.category}
              </span>
            )}
          </div>
          {task.description && (
            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{task.description}</p>
          )}
          <p className={`text-xs mt-1 ${overdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
            <CalendarIcon className="w-3 h-3 inline mr-1" />
            {formatDue(task.due_at)}
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <Button size="icon" variant="ghost" onClick={onEdit} aria-label="Editar">
            <Pencil className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={onDelete} aria-label="Excluir">
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

function TaskDialog({ open, onOpenChange, editing, onSaved }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: TaskRow | null;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState<Priority>("media");
  const [dueAt, setDueAt] = useState("");
  const defaultTaskMsg = (t: string) => `Lembrete de tarefa: ${t || "sua tarefa"}.`;
  const [alarmEnabled, setAlarmEnabled] = useState(true);
  const [alarmMessage, setAlarmMessage] = useState("");
  const [saving, setSaving] = useState(false);

  // reset when opening
  useMemo(() => {
    if (open) {
      setTitle(editing?.title ?? "");
      setDescription(editing?.description ?? "");
      setCategory(editing?.category ?? "");
      setPriority(editing?.priority ?? "media");
      setDueAt(toLocalInput(editing?.due_at ?? null));
    }
  }, [open, editing]);

  async function handleSave() {
    if (!title.trim()) { toast.error("Informe o título"); return; }
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sessão expirada");
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        category: category.trim() || null,
        priority,
        due_at: fromLocalInput(dueAt),
      };
      if (editing) {
        const { error } = await supabase.from("tasks").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success("Tarefa atualizada");
      } else {
        const { error } = await supabase.from("tasks").insert({ ...payload, user_id: u.user.id });
        if (error) throw error;
        toast.success("Tarefa criada");
      }
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar tarefa" : "Nova tarefa"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="t-title">Título *</Label>
            <Input id="t-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Beber 2L de água" />
          </div>
          <div>
            <Label htmlFor="t-desc">Descrição</Label>
            <Textarea id="t-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="t-cat">Categoria</Label>
              <Input id="t-cat" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Saúde, Casa..." />
            </div>
            <div>
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="t-due">Prazo</Label>
            <Input id="t-due" type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
