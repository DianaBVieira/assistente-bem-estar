import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const SendInput = z.object({ message: z.string().min(1).max(2000) });

type ChatRow = { role: "user" | "assistant"; content: string };

function todayPtBr() {
  return new Date().toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });
}

export const sendAssistantMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => SendInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Configuração de IA indisponível.");

    // Save user message
    const { error: insErr } = await supabase
      .from("chat_messages")
      .insert({ user_id: userId, role: "user", content: data.message });
    if (insErr) throw new Error(insErr.message);

    // Build context: history (last 20) + summary of user's data
    const [histRes, medsRes, apptsRes, tasksRes, profileRes] = await Promise.all([
      supabase.from("chat_messages").select("role,content")
        .order("created_at", { ascending: false }).limit(20),
      supabase.from("medications").select("name,dosage,times,frequency,notes").eq("active", true).limit(20),
      supabase.from("appointments").select("title,type,doctor,specialty,location,scheduled_at,status")
        .gte("scheduled_at", new Date().toISOString())
        .order("scheduled_at", { ascending: true }).limit(10),
      supabase.from("tasks").select("title,priority,due_at,completed,category")
        .eq("completed", false).limit(15),
      supabase.from("profiles").select("full_name").maybeSingle(),
    ]);

    const history = ((histRes.data ?? []) as ChatRow[]).reverse();

    const name = profileRes.data?.full_name ?? "Usuário";
    const meds = (medsRes.data ?? []) as { name: string; dosage: string | null; times: string[]; frequency: string | null; notes: string | null }[];
    const appts = (apptsRes.data ?? []) as { title: string; type: string; doctor: string | null; specialty: string | null; location: string | null; scheduled_at: string; status: string }[];
    const tasks = (tasksRes.data ?? []) as { title: string; priority: string; due_at: string | null; category: string | null }[];

    const ctxLines: string[] = [];
    ctxLines.push(`Hoje é ${todayPtBr()}.`);
    ctxLines.push(`Nome do usuário: ${name}.`);
    if (meds.length) {
      ctxLines.push("Medicamentos ativos:");
      meds.forEach((m) => ctxLines.push(`- ${m.name}${m.dosage ? ` (${m.dosage})` : ""} — horários: ${m.times.join(", ") || "—"}${m.frequency ? ` • ${m.frequency}` : ""}`));
    } else {
      ctxLines.push("Sem medicamentos cadastrados.");
    }
    if (appts.length) {
      ctxLines.push("Próximos compromissos:");
      appts.forEach((a) => {
        const dt = new Date(a.scheduled_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
        ctxLines.push(`- ${dt} • ${a.title} (${a.type})${a.doctor ? ` • Dr(a). ${a.doctor}` : ""}${a.location ? ` • ${a.location}` : ""}`);
      });
    }
    if (tasks.length) {
      ctxLines.push("Tarefas pendentes:");
      tasks.forEach((t) => {
        const due = t.due_at ? new Date(t.due_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "sem prazo";
        ctxLines.push(`- [${t.priority}] ${t.title} • ${due}${t.category ? ` • ${t.category}` : ""}`);
      });
    }

    const system = `Você é a "Minha Rotina", uma assistente pessoal de saúde, medicamentos e organização para usuários falantes do português do Brasil.

Seu tom é acolhedor, claro, objetivo e gentil — como uma cuidadora atenciosa. Use frases curtas e linguagem simples. Use markdown (listas, **negrito**) quando ajudar.

Você tem acesso ao contexto atual do usuário abaixo. Use essas informações para responder com precisão sobre medicamentos, compromissos e tarefas dele.

IMPORTANTE: Você NÃO é médico. Para sintomas, dosagens novas, efeitos colaterais sérios ou emergências, oriente o usuário a procurar um profissional de saúde. Nunca recomende interromper medicação por conta própria.

--- CONTEXTO DO USUÁRIO ---
${ctxLines.join("\n")}
--- FIM DO CONTEXTO ---`;

    // Call Lovable AI
    const { generateText } = await import("ai");
    const { createLovableAiGatewayProvider } = await import("@/lib/ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(apiKey);

    let assistantText = "";
    try {
      const result = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        system,
        messages: history.map((m) => ({ role: m.role, content: m.content })),
      });
      assistantText = result.text?.trim() || "Desculpe, não consegui gerar uma resposta agora.";
    } catch (e) {
      const msg = (e as Error).message || "";
      if (msg.includes("429")) {
        assistantText = "Estou recebendo muitas solicitações no momento. Tente novamente em alguns instantes.";
      } else if (msg.includes("402")) {
        assistantText = "Os créditos de IA do aplicativo se esgotaram. Avise o administrador para recarregar.";
      } else {
        assistantText = "Tive um problema para responder agora. Pode tentar de novo?";
      }
    }

    await supabase
      .from("chat_messages")
      .insert({ user_id: userId, role: "assistant", content: assistantText });

    return { reply: assistantText };
  });

export const clearAssistantChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("chat_messages")
      .delete()
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
