import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { sendAssistantMessage, clearAssistantChat } from "@/lib/assistant.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Send, Trash2, HeartPulse, Pill, Calendar, ListTodo } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/assistente")({
  head: () => ({ meta: [{ title: "Assistente IA — Minha Rotina" }] }),
  component: AssistantPage,
});

type Msg = { id: string; role: "user" | "assistant"; content: string; created_at: string };

const SUGGESTIONS = [
  { icon: Pill, text: "Quais remédios devo tomar agora?" },
  { icon: Calendar, text: "Tenho consultas esta semana?" },
  { icon: ListTodo, text: "O que ainda preciso fazer hoje?" },
  { icon: HeartPulse, text: "Dicas para lembrar de beber água" },
];

function AssistantPage() {
  const qc = useQueryClient();
  const sendFn = useServerFn(sendAssistantMessage);
  const clearFn = useServerFn(clearAssistantChat);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["chat_messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("id,role,content,created_at")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Msg[];
    },
  });

  const send = useMutation({
    mutationFn: async (message: string) => sendFn({ data: { message } }),
    onMutate: async (message) => {
      await qc.cancelQueries({ queryKey: ["chat_messages"] });
      const prev = qc.getQueryData<Msg[]>(["chat_messages"]) ?? [];
      const optimistic: Msg = {
        id: `temp-${Date.now()}`, role: "user", content: message,
        created_at: new Date().toISOString(),
      };
      qc.setQueryData<Msg[]>(["chat_messages"], [...prev, optimistic]);
      return { prev };
    },
    onError: (e: Error, _m, ctx) => {
      if (ctx?.prev) qc.setQueryData(["chat_messages"], ctx.prev);
      toast.error(e.message);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["chat_messages"] }),
  });

  const clear = useMutation({
    mutationFn: () => clearFn({ data: undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["chat_messages"] }); toast.success("Conversa apagada"); },
    onError: (e: Error) => toast.error(e.message),
  });

  // Auto-scroll on new message
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, send.isPending]);

  // Keep focus on textarea
  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { if (!send.isPending) inputRef.current?.focus(); }, [send.isPending]);

  function handleSubmit(text?: string) {
    const value = (text ?? input).trim();
    if (!value || send.isPending) return;
    setInput("");
    send.mutate(value);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  const empty = !isLoading && messages.length === 0;

  return (
    <div className="flex flex-col h-[calc(100vh-9rem)] md:h-[calc(100vh-7rem)]">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <span className="inline-flex w-9 h-9 rounded-xl items-center justify-center text-primary-foreground"
                  style={{ background: "var(--gradient-primary)" }}>
              <Sparkles className="w-4 h-4" />
            </span>
            Assistente
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Tire dúvidas sobre seus remédios, agenda e rotina.
          </p>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => {
            if (confirm("Apagar toda a conversa?")) clear.mutate();
          }}>
            <Trash2 className="w-4 h-4" /> Limpar
          </Button>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pr-1">
        {empty && (
          <div className="py-6">
            <Card className="p-5 border-0" style={{ background: "var(--gradient-primary)" }}>
              <div className="text-primary-foreground">
                <p className="font-semibold">Olá! Eu sou sua assistente.</p>
                <p className="text-sm opacity-90 mt-1">
                  Posso ajudar com seus medicamentos, lembretes, compromissos e dicas
                  para a sua rotina. Como posso ajudar hoje?
                </p>
              </div>
            </Card>
            <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium mt-5 mb-2">
              Sugestões
            </p>
            <div className="grid sm:grid-cols-2 gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s.text}
                  onClick={() => handleSubmit(s.text)}
                  className="text-left p-3 rounded-xl border border-border bg-card hover:bg-muted transition flex items-start gap-3">
                  <s.icon className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span className="text-sm">{s.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => <MessageBubble key={m.id} msg={m} />)}

        {send.isPending && (
          <div className="flex gap-3 items-start">
            <Avatar />
            <div className="flex items-center gap-1 pt-2">
              <Dot /> <Dot delay={150} /> <Dot delay={300} />
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 sticky bottom-0 bg-background pt-2">
        <div className="flex gap-2 items-end">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Pergunte algo sobre sua rotina…"
            rows={1}
            className="resize-none min-h-[44px] max-h-32"
            disabled={send.isPending}
          />
          <Button size="icon" className="h-11 w-11 shrink-0"
                  onClick={() => handleSubmit()}
                  disabled={!input.trim() || send.isPending}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-1.5">
          A assistente pode cometer erros. Sempre consulte um profissional de saúde.
        </p>
      </div>
    </div>
  );
}

function MessageBubble({ msg }: { msg: Msg }) {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-tr-sm px-4 py-2.5 bg-primary text-primary-foreground">
          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-3 items-start">
      <Avatar />
      <div className="flex-1 min-w-0 prose prose-sm max-w-none dark:prose-invert
                      prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-headings:my-2">
        <ReactMarkdown>{msg.content}</ReactMarkdown>
      </div>
    </div>
  );
}

function Avatar() {
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-primary-foreground"
         style={{ background: "var(--gradient-primary)" }}>
      <Sparkles className="w-4 h-4" />
    </div>
  );
}

function Dot({ delay = 0 }: { delay?: number }) {
  return (
    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
          style={{ animationDelay: `${delay}ms` }} />
  );
}
