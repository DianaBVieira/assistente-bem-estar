import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { MedicationRow } from "@/lib/medication-utils";

function buildWhatsAppLink(phone: string | null, message: string) {
  const clean = (phone ?? "").replace(/\D/g, "");
  const base = clean ? `https://wa.me/${clean}` : `https://wa.me/`;
  return `${base}?text=${encodeURIComponent(message)}`;
}

export function StockStatus() {
  const { data, isLoading } = useQuery({
    queryKey: ["medications-stock"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medications")
        .select("*")
        .eq("active", true);
      if (error) throw error;
      return (data ?? []) as MedicationRow[];
    },
  });

  if (isLoading || !data) return null;

  const tracked = data.filter((m) => (m.stock_quantity ?? 0) > 0);
  const low = tracked.filter(
    (m) => (m.stock_quantity ?? 0) <= (m.stock_threshold ?? 4),
  );

  if (tracked.length === 0) return null;

  if (low.length === 0) {
    return (
      <Card className="p-4 flex items-center gap-3">
        <span className="w-9 h-9 rounded-lg bg-success/10 text-success flex items-center justify-center">
          <CheckCircle2 className="w-5 h-5" />
        </span>
        <div className="flex-1">
          <p className="font-semibold leading-tight">Estoque em dia</p>
          <p className="text-xs text-muted-foreground">
            Todos os medicamentos têm comprimidos suficientes.
          </p>
        </div>
      </Card>
    );
  }

  const message = `Olá! Preciso comprar:\n${low
    .map((m) => `• ${m.name} (restam ${m.stock_quantity})`)
    .join("\n")}`;
  const firstPhone = low.find((m) => m.alert_phone)?.alert_phone ?? null;

  return (
    <Card className="p-4 border-warning/40 bg-warning/5">
      <div className="flex items-start gap-3">
        <span className="w-9 h-9 rounded-lg bg-warning/15 text-warning-foreground flex items-center justify-center shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold leading-tight">
            Estoque baixo ({low.length})
          </p>
          <p className="text-xs text-muted-foreground mb-2">
            Está na hora de comprar:
          </p>
          <ul className="space-y-1 mb-3">
            {low.slice(0, 4).map((m) => (
              <li key={m.id} className="flex items-center justify-between text-sm">
                <span className="truncate font-medium">{m.name}</span>
                <span className="text-xs text-destructive font-semibold shrink-0 ml-2">
                  {m.stock_quantity} restantes
                </span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link to="/medicamentos"><Package className="w-3.5 h-3.5" /> Ver medicamentos</Link>
            </Button>
            <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-600/90">
              <a href={buildWhatsAppLink(firstPhone, message)} target="_blank" rel="noopener noreferrer">
                Avisar no WhatsApp
              </a>
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
