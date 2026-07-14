import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { BellRing, Upload, Play, Trash2, Volume2 } from "lucide-react";
import { useAlarm } from "@/lib/alarm/engine";
import { BUILTIN_SOUNDS, AlarmPlayer, type BuiltinSoundId } from "@/lib/alarm/sounds";
import { DEFAULT_ALARM_SETTINGS } from "@/lib/alarm/types";

export const Route = createFileRoute("/_authenticated/alarmes")({
  head: () => ({
    meta: [{ title: "Alarmes • Minha Rotina" }],
  }),
  component: AlarmesPage,
});

function AlarmesPage() {
  const qc = useQueryClient();
  const { settings, requestUnlock, audioUnlocked, test } = useAlarm();

  const [local, setLocal] = useState(() => ({
    enabled: DEFAULT_ALARM_SETTINGS.enabled,
    default_sound: DEFAULT_ALARM_SETTINGS.default_sound,
    custom_sound_url: null as string | null,
    volume: DEFAULT_ALARM_SETTINGS.volume,
    vibrate: DEFAULT_ALARM_SETTINGS.vibrate,
    tts_enabled: DEFAULT_ALARM_SETTINGS.tts_enabled,
    ring_seconds: DEFAULT_ALARM_SETTINGS.ring_seconds,
    snooze_minutes: DEFAULT_ALARM_SETTINGS.snooze_minutes,
  }));

  useEffect(() => {
    if (!settings) return;
    setLocal({
      enabled: settings.enabled,
      default_sound: settings.default_sound,
      custom_sound_url: settings.custom_sound_url,
      volume: settings.volume,
      vibrate: settings.vibrate,
      tts_enabled: settings.tts_enabled,
      ring_seconds: settings.ring_seconds,
      snooze_minutes: settings.snooze_minutes,
    });
  }, [settings?.user_id]); // eslint-disable-line react-hooks/exhaustive-deps

  const previewRef = useRef<AlarmPlayer | null>(null);
  useEffect(() => {
    previewRef.current = new AlarmPlayer();
    return () => previewRef.current?.stop();
  }, []);

  const previewSound = async () => {
    await requestUnlock();
    const p = previewRef.current;
    if (!p) return;
    p.stop();
    if (local.custom_sound_url) {
      await p.playUrl(local.custom_sound_url, local.volume);
    } else {
      await p.playBuiltin(local.default_sound as BuiltinSoundId, local.volume);
    }
    setTimeout(() => p.stop(), 3500);
  };

  const save = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sessão expirada");
      const { error } = await supabase.from("alarm_settings").upsert({
        user_id: u.user.id,
        ...local,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alarm-settings"] });
      toast.success("Preferências de alarme salvas");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sessão expirada");
      const ext = file.name.split(".").pop()?.toLowerCase() || "mp3";
      const path = `${u.user.id}/alarm-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("alarm-sounds")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: signed, error: signErr } = await supabase.storage
        .from("alarm-sounds")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signErr) throw signErr;
      return signed.signedUrl;
    },
    onSuccess: (url) => {
      setLocal((l) => ({ ...l, custom_sound_url: url }));
      toast.success("Som enviado. Não esqueça de salvar.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const clearCustom = () => setLocal((l) => ({ ...l, custom_sound_url: null }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BellRing className="h-6 w-6" /> Alarmes
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configure como cada lembrete deve tocar. Os alarmes soam enquanto o
          aplicativo estiver aberto.
        </p>
      </header>

      {!audioUnlocked && (
        <Card className="p-4 border-warning bg-warning/10">
          <p className="text-sm font-medium mb-2">
            Autorize o som dos alarmes neste dispositivo
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            O navegador só toca sons depois de uma primeira interação. Isso vale
            até você fechar a aba.
          </p>
          <Button onClick={requestUnlock} size="sm">
            Autorizar sons
          </Button>
        </Card>
      )}

      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <Label className="text-base">Alarmes ativados</Label>
            <p className="text-xs text-muted-foreground">
              Desligue para receber só notificações silenciosas.
            </p>
          </div>
          <Switch
            checked={local.enabled}
            onCheckedChange={(v) => setLocal((l) => ({ ...l, enabled: v }))}
          />
        </div>
      </Card>

      <Card className="p-4 space-y-4">
        <div>
          <Label className="text-base">Som do alarme</Label>
          <p className="text-xs text-muted-foreground">
            Escolha um som pré-definido ou envie sua própria música.
          </p>
        </div>

        <div className="grid gap-2">
          <Label>Som pré-definido</Label>
          <Select
            value={local.default_sound}
            onValueChange={(v) => setLocal((l) => ({ ...l, default_sound: v }))}
            disabled={!!local.custom_sound_url}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BUILTIN_SOUNDS.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label>Sua música (MP3 ou WAV)</Label>
          {local.custom_sound_url ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 text-sm px-3 py-2 rounded-md bg-muted truncate">
                Som personalizado ativo
              </div>
              <Button variant="outline" size="icon" onClick={clearCustom}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <label className="flex items-center justify-center gap-2 border-2 border-dashed rounded-md h-20 cursor-pointer hover:bg-muted transition">
              <Upload className="h-4 w-4" />
              <span className="text-sm">
                {upload.isPending ? "Enviando…" : "Escolher arquivo"}
              </span>
              <input
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) upload.mutate(f);
                  e.target.value = "";
                }}
              />
            </label>
          )}
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Volume2 className="h-4 w-4" /> Volume
            </Label>
            <span className="text-sm tabular-nums text-muted-foreground">
              {Math.round(local.volume * 100)}%
            </span>
          </div>
          <Slider
            value={[Math.round(local.volume * 100)]}
            min={10}
            max={100}
            step={5}
            onValueChange={([v]) => setLocal((l) => ({ ...l, volume: v / 100 }))}
          />
        </div>

        <Button variant="outline" onClick={previewSound}>
          <Play className="h-4 w-4" /> Ouvir prévia
        </Button>
      </Card>

      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base">Fala automática</Label>
            <p className="text-xs text-muted-foreground">
              Depois do toque, o aparelho fala o lembrete (ex: “Hora de tomar
              Losartana”). Usa a voz do próprio celular.
            </p>
          </div>
          <Switch
            checked={local.tts_enabled}
            onCheckedChange={(v) => setLocal((l) => ({ ...l, tts_enabled: v }))}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base">Vibrar</Label>
            <p className="text-xs text-muted-foreground">
              No celular, vibra em paralelo ao som.
            </p>
          </div>
          <Switch
            checked={local.vibrate}
            onCheckedChange={(v) => setLocal((l) => ({ ...l, vibrate: v }))}
          />
        </div>
      </Card>

      <Card className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="ring">Toque por (segundos)</Label>
            <Input
              id="ring"
              type="number"
              min={5}
              max={120}
              value={local.ring_seconds}
              onChange={(e) =>
                setLocal((l) => ({
                  ...l,
                  ring_seconds: Math.max(5, Math.min(120, Number(e.target.value) || 30)),
                }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="snooze">Adiar por (minutos)</Label>
            <Input
              id="snooze"
              type="number"
              min={1}
              max={60}
              value={local.snooze_minutes}
              onChange={(e) =>
                setLocal((l) => ({
                  ...l,
                  snooze_minutes: Math.max(1, Math.min(60, Number(e.target.value) || 5)),
                }))
              }
            />
          </div>
        </div>
      </Card>

      <Card className="p-4 space-y-3 bg-muted/40">
        <p className="text-sm font-medium">Limitações importantes</p>
        <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-5">
          <li>
            Os alarmes só tocam com o aplicativo aberto no navegador. Deixe a
            aba aberta para não perder lembretes.
          </li>
          <li>
            Navegadores <strong>respeitam o modo silencioso</strong> do celular.
            Para furar o silencioso, seria necessário um aplicativo nativo
            (fora do escopo desta versão web).
          </li>
          <li>Ative as notificações do site para receber avisos visuais.</li>
        </ul>
      </Card>

      <div className="flex flex-wrap gap-2 sticky bottom-0 py-3 bg-background/80 backdrop-blur -mx-4 px-4 border-t">
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          Salvar preferências
        </Button>
        <Button variant="outline" onClick={test}>
          <BellRing className="h-4 w-4" /> Testar alarme agora
        </Button>
      </div>
    </div>
  );
}
