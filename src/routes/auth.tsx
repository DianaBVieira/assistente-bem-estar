import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { HeartPulse } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({ meta: [{ title: "Entrar — Minha Rotina" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/inicio", replace: true });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Conta criada! Verifique seu e-mail se a confirmação estiver ativada.");
        // Try auto sign-in (in case email confirmation is off)
        const { data } = await supabase.auth.signInWithPassword({ email, password });
        if (data.session) navigate({ to: "/inicio", replace: true });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/inicio", replace: true });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao entrar";
      const pt = msg.includes("Invalid login") ? "E-mail ou senha incorretos" :
                  msg.includes("already registered") ? "Este e-mail já está cadastrado" :
                  msg.includes("at least") ? "A senha precisa ter no mínimo 6 caracteres" : msg;
      toast.error(pt);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10"
         style={{ background: "var(--gradient-primary)" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-6 text-primary-foreground">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/15 backdrop-blur mb-3">
            <HeartPulse className="w-7 h-7" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Minha Rotina</h1>
          <p className="text-sm opacity-90 mt-1">Sua assistente de saúde e medicamentos</p>
        </div>

        <Card className="p-6 shadow-xl border-0">
          <div className="flex gap-1 p-1 rounded-lg bg-muted mb-6">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition ${
                mode === "login" ? "bg-card shadow text-foreground" : "text-muted-foreground"
              }`}
            >Entrar</button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition ${
                mode === "signup" ? "bg-card shadow text-foreground" : "text-muted-foreground"
              }`}
            >Criar conta</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Seu nome</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)}
                       placeholder="Como devemos te chamar?" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" required value={email}
                     onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" required minLength={6} value={password}
                     onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
            </div>
            <Button type="submit" className="w-full h-11 text-base" disabled={loading}>
              {loading ? "Aguarde…" : mode === "login" ? "Entrar" : "Criar conta"}
            </Button>
          </form>
        </Card>

        <p className="text-center text-xs mt-4 text-primary-foreground/80">
          Ao continuar você concorda em organizar sua rotina com carinho 💙
        </p>
      </div>
    </div>
  );
}
