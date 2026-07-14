import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { HeartPulse, Home, Pill, Calendar, BarChart3, LogOut, ListTodo, Sparkles, Activity, Siren, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const nav = [
  { to: "/inicio", label: "Início", icon: Home },
  { to: "/medicamentos", label: "Remédios", icon: Pill },
  { to: "/agenda", label: "Agenda", icon: Calendar },
  { to: "/tarefas", label: "Tarefas", icon: ListTodo },
  { to: "/saude", label: "Saúde", icon: Activity },
  { to: "/documentos", label: "Docs", icon: FileText },
  { to: "/assistente", label: "Assistente", icon: Sparkles },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/emergencia", label: "SOS", icon: Siren },
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
    <SidebarProvider defaultOpen>
      <Sidebar collapsible="icon" variant="sidebar">
        <SidebarHeader>
          <Link
            to="/inicio"
            className="flex items-center gap-2 px-2 py-3 font-semibold"
          >
            <span
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-primary-foreground"
              style={{ background: "var(--gradient-primary)" }}
            >
              <HeartPulse className="h-4 w-4" />
            </span>
            <span className="truncate group-data-[collapsible=icon]:hidden">
              Minha Rotina
            </span>
          </Link>
        </SidebarHeader>

        <SidebarContent>
          <SidebarMenu>
            {nav.map((item) => {
              const active = pathname.startsWith(item.to);
              return (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton
                    asChild
                    isActive={active}
                    tooltip={item.label}
                  >
                    <Link to={item.to} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Sair">
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2"
                  aria-label="Sair"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  <span className="truncate">Sair</span>
                </button>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border bg-background/80 px-4 backdrop-blur">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <Link
              to="/inicio"
              className="flex items-center gap-2 font-semibold md:hidden"
            >
              <span
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-primary-foreground"
                style={{ background: "var(--gradient-primary)" }}
              >
                <HeartPulse className="h-4 w-4" />
              </span>
              <span className="truncate">Minha Rotina</span>
            </Link>
          </div>

          <button
            onClick={handleSignOut}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Sair"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </header>

        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
