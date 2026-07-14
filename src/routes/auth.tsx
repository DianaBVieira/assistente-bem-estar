import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { HeartPulse, ArrowLeft } from "lucide-react";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({ meta: [{ title: "Entrar — Minha Rotina" }] }),
  component: AuthPage,
});

type Mode = "login" | "signup" | "forgot";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
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
            emailRedirectTo: `${window.location.origin}/auth`,
            data: { full_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Conta criada! Verifique seu e-mail para confirmar o cadastro.");
        const { data } = await supabase.auth.signInWithPassword({ email, password });
        if (data.session) navigate({ to: "/inicio", replace: true });
      } else if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/inicio", replace: true });
      } else {
        // forgot password
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Enviamos um link de redefinição para o seu e-mail.");
        setMode("login");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao processar";
      const pt = msg.includes("Invalid login") ? "E-mail ou senha incorretos" :
                  msg.includes("already registered") ? "Este e-mail já está cadastrado" :
                  msg.includes("at least") ? "A senha precisa ter no mínimo 6 caracteres" : msg;
      toast.error(pt);
    } finally {
      setLoading(false);
    }
  }

  const title = mode === "forgot" ? "Recuperar senha" : mode === "signup" ? "Criar conta" : "Entrar";

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
          {mode !== "forgot" ? (
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
          ) : (
            <button
              type="button"
              onClick={() => setMode("login")}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
          )}

          {mode === "forgot" && (
            <div className="mb-4">
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Informe seu e-mail e enviaremos um link seguro para você criar uma nova senha.
              </p>
            </div>
          )}

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
            {mode !== "forgot" && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Senha</Label>
                  {mode === "login" && (
                    <button
                      type="button"
                      onClick={() => setMode("forgot")}
                      className="text-xs text-primary hover:underline"
                    >Esqueci minha senha</button>
                  )}
                </div>
                <Input id="password" type="password" required minLength={6} value={password}
                       onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
              </div>
            )}
            <Button type="submit" className="w-full h-11 text-base" disabled={loading}>
              {loading ? "Aguarde…" :
                mode === "login" ? "Entrar" :
                mode === "signup" ? "Criar conta" :
                "Enviar link de recuperação"}
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
