import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { HeartPulse, Home, Pill, Calendar, BarChart3, LogOut, ListTodo, Sparkles, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";

const nav = [
  { to: "/inicio", label: "Início", icon: Home },
  { to: "/medicamentos", label: "Remédios", icon: Pill },
  { to: "/agenda", label: "Agenda", icon: Calendar },
  { to: "/tarefas", label: "Tarefas", icon: ListTodo },
  { to: "/saude", label: "Saúde", icon: Activity },
  { to: "/assistente", label: "Assistente", icon: Sparkles },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      {/* Top bar */}
      <header className="sticky top-0 z-30 backdrop-blur bg-background/80 border-b border-border">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/inicio" className="flex items-center gap-2 font-semibold">
            <span className="inline-flex w-8 h-8 rounded-lg items-center justify-center text-primary-foreground"
                  style={{ background: "var(--gradient-primary)" }}>
              <HeartPulse className="w-4 h-4" />
            </span>
            Minha Rotina
          </Link>
          <nav className="hidden md:flex gap-1">
            {nav.map((item) => {
              const active = pathname.startsWith(item.to);
              return (
                <Link key={item.to} to={item.to}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                        active ? "bg-primary-soft text-primary" : "text-muted-foreground hover:bg-muted"
                      }`}>
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <button onClick={handleSignOut}
                  className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition"
                  aria-label="Sair">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>

      {/* Bottom nav (mobile) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-card border-t border-border z-30">
        <div className="flex">
          {nav.map((item) => {
            const active = pathname.startsWith(item.to);
            return (
              <Link key={item.to} to={item.to}
                    className={`flex-1 py-3 flex flex-col items-center gap-1 text-xs font-medium transition ${
                      active ? "text-primary" : "text-muted-foreground"
                    }`}>
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
