import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { HeartPulse, LogOut } from "lucide-react";
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
  { to: "/inicio", label: "Início", icon: HeartPulse },
  { to: "/medicamentos", label: "Remédios", icon: HeartPulse },
  { to: "/agenda", label: "Agenda", icon: HeartPulse },
  { to: "/tarefas", label: "Tarefas", icon: HeartPulse },
  { to: "/saude", label: "Saúde", icon: HeartPulse },
  { to: "/documentos", label: "Docs", icon: HeartPulse },
  { to: "/assistente", label: "Assistente", icon: HeartPulse },
  { to: "/relatorios", label: "Relatórios", icon: HeartPulse },
  { to: "/emergencia", label: "SOS", icon: HeartPulse },
] as const;
