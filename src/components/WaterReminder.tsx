import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { GlassWater, Settings, Check } from "lucide-react";
import { toast } from "sonner";

type WaterSettings = {
  user_id: string;
  interval_minutes: number;
  daily_goal: number;
  enabled: boolean;
};

type WaterLog = { id: string; drank_at: string };

const DEFAULT_SETTINGS: Omit<WaterSettings, "user_id"> = {
  interval_minutes: 50,
  daily_goal: 8,
  enabled: true,
};

export function WaterReminder() {
  const qc = useQueryClient();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [, setTick] = useState(0);
  const lastToastRef = useRef<number>(0);

  const { data } = useQuery({
    queryKey: ["water-today"],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Sessão expirada");

      const start = new Date(); start.setHours(0, 0, 0, 0);
      const [settingsRes, logsRes] = await Promise.all([
        supabase.from("water_settings").select("*").eq("user_id", user.user.id).maybeSingle(),
        supabase.from("water_logs").select("id,drank_at")
          .gte("drank_at", start.toISOString())
          .order("drank_at", { ascending: false }),
      ]);
      if (logsRes.error) throw logsRes.error;
      const settings: WaterSettings = settingsRes.data ?? { user_id: user.user.id, ...DEFAULT_SETTINGS };
      return { settings, logs: (logsRes.data ?? []) as WaterLog[] };
    },
  });

  const logDrink = useMutation({
    mutationFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Sessão expirada");
      const { error } = await supabase.from("water_logs").insert({ user_id: user.user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["water-today"] });
      toast.success("Água registrada 💧");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!data?.settings.enabled) return;
    const lastDrank = data.logs[0] ? new Date(data.logs[0].drank_at).getTime() : 0;
    if (!lastDrank) return;
    const intervalMs = data.settings.interval_minutes * 60 * 1000;
    const now = Date.now();
    if (now >= lastDrank + intervalMs && now - lastToastRef.current > intervalMs) {
      lastToastRef.current = now;
      toast("Hora de beber água 💧", {
        description: `Já se passaram ${data.settings.interval_minutes} min desde o último copo.`,
        action: { label: "Bebi", onClick: () => logDrink.mutate() },
        duration: 15000,
      });
    }
  });

  if (!data) return null;
  const { settings, logs } = data;
  const drankToday = logs.length;
  const goalPct = Math.min(100, Math.round((drankToday / settings.daily_goal) * 100));

  const lastDrank = logs[0] ? new Date(logs[0].drank_at).getTime() : null;
  const intervalMs = settings.interval_minutes * 60 * 1000;
  const remainingMs = lastDrank ? Math.max(0, lastDrank + intervalMs - Date.now()) : 0;
  const mins = Math.floor(remainingMs / 60000);
  const secs = Math.floor((remainingMs % 60000) / 1000);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="w-9 h-9 rounded-lg bg-sky-500/10 text-sky-600 flex items-center justify-center">
            <GlassWater className="w-5 h-5" />
          </span>
          <div>
            <p className="font-semibold leading-tight">Hidratação</p>
            <p className="text-xs text-muted-foreground">
              {drankToday}/{settings.daily_goal} copos hoje
            </p>
          </div>
        </div>
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogTrigger asChild>
            <Button size="icon" variant="ghost"><Settings className="w-4 h-4" /></Button>
          </DialogTrigger>
          <WaterSettingsDialog
            key={settings.interval_minutes + "-" + settings.daily_goal + "-" + String(settings.enabled)}
            current={settings}
            onClose={() => setSettingsOpen(false)}
          />
        </Dialog>
      </div>

      <div className="h-2 bg-muted rounded-full overflow-hidden mb-3">
        <div className="h-full bg-sky-500 transition-all" style={{ width: `${goalPct}%` }} />
      </div>

      {settings.enabled ? (
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">
              {lastDrank ? "Próximo lembrete em" : "Comece registrando o 1º copo"}
            </p>
            {lastDrank && (
              <p className="text-xl font-bold tabular-nums">
                {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
              </p>
            )}
          </div>
          <Button onClick={() => logDrink.mutate()} disabled={logDrink.isPending}>
            <Check className="w-4 h-4" /> Bebi água
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">Lembretes desativados</p>
          <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
            Ativar
          </Button>
        </div>
      )}
    </Card>
  );
}

function WaterSettingsDialog({ current, onClose }: {
  current: WaterSettings;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [intervalMin, setIntervalMin] = useState(current.interval_minutes);
  const [goal, setGoal] = useState(current.daily_goal);
  const [enabled, setEnabled] = useState(current.enabled);

  const save = useMutation({
    mutationFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Sessão expirada");
      const { error } = await supabase.from("water_settings").upsert({
        user_id: user.user.id,
        interval_minutes: intervalMin,
        daily_goal: goal,
        enabled,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["water-today"] });
      toast.success("Preferências salvas");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Lembrete de hidratação</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="water-enabled">Ativar lembretes</Label>
          <Switch id="water-enabled" checked={enabled} onCheckedChange={setEnabled} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="water-interval">Intervalo (minutos)</Label>
          <Input id="water-interval" type="number" min={5} max={240} value={intervalMin}
                 onChange={(e) => setIntervalMin(Math.max(5, Number(e.target.value) || 50))} />
          <p className="text-xs text-muted-foreground">Você será avisado a cada {intervalMin} min após o último copo.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="water-goal">Meta diária (copos)</Label>
          <Input id="water-goal" type="number" min={1} max={20} value={goal}
                 onChange={(e) => setGoal(Math.max(1, Number(e.target.value) || 8))} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>Salvar</Button>
      </DialogFooter>
    </DialogContent>
  );
}
