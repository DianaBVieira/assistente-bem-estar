import { useAlarm } from "@/lib/alarm/engine";
import { Button } from "@/components/ui/button";
import { BellRing, X, Clock } from "lucide-react";

export function AlarmOverlay() {
  const { active, dismiss, snooze, settings } = useAlarm();
  if (!active) return null;

  const time = active.scheduledAt.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="alarm-title"
    >
      <div className="w-full max-w-md rounded-3xl bg-card p-6 shadow-2xl border">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
            <div
              className="relative inline-flex h-20 w-20 items-center justify-center rounded-full text-primary-foreground"
              style={{ background: "var(--gradient-primary)" }}
            >
              <BellRing className="h-10 w-10" />
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-sm uppercase tracking-wide text-muted-foreground">
              {active.kind === "medication"
                ? "Medicamento"
                : active.kind === "task"
                  ? "Tarefa"
                  : "Compromisso"}{" "}
              • {time}
            </p>
            <h2 id="alarm-title" className="text-2xl font-bold leading-tight">
              {active.title}
            </h2>
            {active.subtitle && (
              <p className="text-muted-foreground">{active.subtitle}</p>
            )}
          </div>

          <div className="w-full grid grid-cols-2 gap-3 pt-2">
            <Button
              size="lg"
              variant="outline"
              onClick={snooze}
              className="h-14 text-base"
            >
              <Clock className="mr-1 h-5 w-5" />
              Adiar {settings?.snooze_minutes ?? 5} min
            </Button>
            <Button size="lg" onClick={dismiss} className="h-14 text-base">
              <X className="mr-1 h-5 w-5" />
              Silenciar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
