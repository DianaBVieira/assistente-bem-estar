import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Home, Pill, Calendar, BarChart3, LogOut, ListTodo, Sparkles, Activity, Siren, FileText, BellRing, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { AlarmProvider } from "@/lib/alarm/engine";
import { AlarmOverlay } from "@/components/AlarmOverlay";
import logoAsset from "@/assets/pulso-utopia-logo.png.asset.json";
import iconAsset from "@/assets/pulso-utopia-icon.png.asset.json";

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
      <SidebarMenuButton
        asChild
        isActive={active}
        tooltip={label}
        className="h-11 rounded-xl data-[active=true]:bg-primary-soft data-[active=true]:text-primary data-[active=true]:font-semibold hover:bg-primary-soft/60"
      >
        <Link
          to={to}
          className="flex items-center gap-3"
          onClick={() => {
            if (isMobile) setOpenMobile(false);
          }}
        >
          <Icon className={`h-5 w-5 shrink-0 ${active ? "text-primary" : "text-muted-foreground"}`} strokeWidth={active ? 2.25 : 1.75} />
          <span className="truncate">{label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function useUserProfile() {
  return useQuery({
    queryKey: ["user-profile-shell"],
    queryFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes.user;
      if (!user) return null;
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .maybeSingle();
      const fullName = profile?.full_name || user.email?.split("@")[0] || "Você";
      const initials = fullName
        .split(" ")
        .map((n) => n[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase();
      return {
        fullName,
        email: user.email ?? "",
        avatarUrl: (profile as { avatar_url?: string | null } | null)?.avatar_url ?? null,
        initials,
      };
    },
    staleTime: 60_000,
  });
}

function SidebarUserCard() {
  const { data } = useUserProfile();
  if (!data) return null;
  return (
    <div className="mx-2 mb-1 rounded-2xl border border-sidebar-border bg-gradient-to-br from-primary-soft/70 to-transparent p-3 group-data-[collapsible=icon]:hidden">
      <div className="flex items-center gap-3">
        <div className="relative h-10 w-10 shrink-0 rounded-full ring-2 ring-primary/20 overflow-hidden bg-primary text-primary-foreground grid place-items-center text-sm font-semibold">
          {data.avatarUrl ? (
            <img src={data.avatarUrl} alt={data.fullName} className="h-full w-full object-cover" />
          ) : (
            <span>{data.initials || "U"}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground truncate leading-tight">{data.fullName}</p>
          <div className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#3E2B63] to-[#7660A8] px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm">
            <Crown className="h-2.5 w-2.5" />
            Premium
          </div>
        </div>
      </div>
    </div>
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
      <Sidebar collapsible="icon" variant="sidebar" className="border-r border-sidebar-border">
        <SidebarHeader className="border-b border-sidebar-border/70">
          <Link
            to="/inicio"
            className="flex items-center gap-2.5 px-2 py-3"
          >
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F4EFE7] shadow-sm overflow-hidden">
              <img src={iconAsset.url} alt="Pulso Utopia" className="h-8 w-8 object-contain" />
            </span>
            <span className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
              <img
                src={logoAsset.url}
                alt="Pulso Utopia"
                className="h-5 w-auto object-contain object-left"
              />
            </span>
          </Link>
        </SidebarHeader>

        <SidebarContent className="px-1">
          <SidebarMenu className="gap-1 py-2">
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

        <SidebarFooter className="gap-2">
          <SidebarUserCard />
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Sair" className="h-11 rounded-xl">
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-3"
                  aria-label="Sair"
                >
                  <LogOut className="h-5 w-5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
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
            <SidebarTrigger className="h-11 w-11 rounded-xl [&_svg]:size-6 md:h-9 md:w-9 md:[&_svg]:size-4" />
            <Link
              to="/inicio"
              className="flex items-center gap-2 font-semibold md:hidden"
            >
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F4EFE7] overflow-hidden">
                <img src={iconAsset.url} alt="Pulso Utopia" className="h-8 w-8 object-contain" />
              </span>
              <img src={logoAsset.url} alt="Pulso Utopia" className="h-5 w-auto object-contain" />
            </Link>
          </div>

          <button
            onClick={handleSignOut}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground md:h-9 md:w-9"
            aria-label="Sair"
          >
            <LogOut className="h-5 w-5 md:h-4 md:w-4" strokeWidth={1.75} />
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
