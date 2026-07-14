import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { HeartPulse, Home, Pill, Calendar, BarChart3, LogOut, ListTodo, Sparkles, Activity, Siren, FileText, BellRing } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { AlarmProvider } from "@/lib/alarm/engine";
import { AlarmOverlay } from "@/components/AlarmOverlay";

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
  useSidebar,
} from "@/components/ui/sidebar";


const nav = [
  { to: "/inicio", label: "Início", icon: Home },
  { to: "/medicamentos", label: "Remédios", icon: Pill },
  { to: "/agenda", label: "Agenda", icon: Calendar },
  { to: "/tarefas", label: "Tarefas", icon: ListTodo },
  { to: "/saude", label: "Saúde", icon: Activity },
  { to: "/documentos", label: "Docs", icon: FileText },
  { to: "/alarmes", label: "Alarmes", icon: BellRing },
  { to: "/assistente", label: "Assistente", icon: Sparkles },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/emergencia", label: "SOS", icon: Siren },
] as const;

function NavLink({
  to,
  label,
  icon: Icon,
  active,
}: {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
}) {
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={active} tooltip={label}>
        <Link
          to={to}
          className="flex items-center gap-2"
          onClick={() => {
            if (isMobile) setOpenMobile(false);
          }}
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span className="truncate">{label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

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
    <AlarmProvider>
    <>
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
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                label={item.label}
                icon={item.icon}
                active={pathname.startsWith(item.to)}
              />
            ))}
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
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border bg-background/80 px-3 backdrop-blur sm:px-4 md:h-16">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="h-11 w-11 [&_svg]:size-6 md:h-9 md:w-9 md:[&_svg]:size-4" />
            <Link
              to="/inicio"
              className="flex items-center gap-2 font-semibold md:hidden"
            >
              <span
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-primary-foreground"
                style={{ background: "var(--gradient-primary)" }}
              >
                <HeartPulse className="h-5 w-5" />
              </span>
              <span className="truncate">Minha Rotina</span>
            </Link>
          </div>

          <button
            onClick={handleSignOut}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground md:h-9 md:w-9"
            aria-label="Sair"
          >
            <LogOut className="h-5 w-5 md:h-4 md:w-4" />
          </button>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
    </SidebarInset>
    </SidebarProvider>
    <AlarmOverlay />
    </>
    </AlarmProvider>
  );
}
