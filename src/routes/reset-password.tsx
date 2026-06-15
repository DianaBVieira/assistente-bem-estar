import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { HeartPulse, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({ meta: [{ title: "Nova senha — Minha Rotina" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Supabase auto-creates a recovery session from the URL hash.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("As senhas não coincidem");
      return;
    }
    if (password.length < 6) {
      toast.error("A senha precisa ter no mínimo 6 caracteres");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      toast.success("Senha atualizada com sucesso!");
      setTimeout(() => navigate({ to: "/inicio", replace: true }), 1500);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar senha");
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
          <h1 className="text-3xl font-bold tracking-tight">Nova senha</h1>
          <p className="text-sm opacity-90 mt-1">Defina uma nova senha para acessar sua conta</p>
        </div>

        <Card className="p-6 shadow-xl border-0">
          {done ? (
            <div className="text-center py-4">
              <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-3" />
              <p className="font-medium">Tudo certo!</p>
              <p className="text-sm text-muted-foreground mt-1">Redirecionando…</p>
            </div>
          ) : !ready ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Validando o link de recuperação… Se você abriu esta página direto,
                volte ao login e clique em "Esqueci minha senha".
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link to="/auth">Voltar ao login</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="password">Nova senha</Label>
                <Input id="password" type="password" required minLength={6}
                       value={password} onChange={(e) => setPassword(e.target.value)}
                       placeholder="Mínimo 6 caracteres" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm">Confirmar nova senha</Label>
                <Input id="confirm" type="password" required minLength={6}
                       value={confirm} onChange={(e) => setConfirm(e.target.value)}
                       placeholder="Repita a senha" />
              </div>
              <Button type="submit" className="w-full h-11 text-base" disabled={loading}>
                {loading ? "Salvando…" : "Salvar nova senha"}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
