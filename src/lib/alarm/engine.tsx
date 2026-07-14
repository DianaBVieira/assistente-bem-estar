import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_ALARM_SETTINGS,
  type AlarmEvent,
  type AlarmSettings,
} from "./types";
import {
  AlarmPlayer,
  cancelSpeech,
  speak,
  unlockAudio,
  vibrate,
  type BuiltinSoundId,
} from "./sounds";

type Ctx = {
  settings: AlarmSettings | null;
  active: AlarmEvent | null;
  audioUnlocked: boolean;
  requestUnlock: () => Promise<void>;
  snooze: () => void;
  dismiss: () => void;
  test: () => void;
};

const AlarmContext = createContext<Ctx | null>(null);

const POLL_MS = 20_000;
const TICK_MS = 1_000;
const FIRE_WINDOW_MS = 30_000; // fire if scheduled within ±30s
const FIRED_KEY = "alarm-fired-v1";
const UNLOCK_KEY = "alarm-audio-unlocked";

type FiredMap = Record<string, number>;

function loadFired(): FiredMap {
  try {
    const raw = localStorage.getItem(FIRED_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as FiredMap;
    // GC entries older than 24h
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const out: FiredMap = {};
    for (const [k, t] of Object.entries(parsed)) {
      if (t > cutoff) out[k] = t;
    }
    return out;
  } catch {
    return {};
  }
}

function saveFired(m: FiredMap) {
  try {
    localStorage.setItem(FIRED_KEY, JSON.stringify(m));
  } catch {
    // ignore
  }
}

async function fetchUpcomingEvents(userId: string): Promise<AlarmEvent[]> {
  const now = new Date();
  const horizon = new Date(now.getTime() + 10 * 60 * 1000); // 10 min ahead
  const todayIso = now.toISOString().slice(0, 10);

  const [medsRes, tasksRes, apptsRes] = await Promise.all([
    supabase
      .from("medications")
      .select("id,name,dosage,times,start_date,end_date,active,alarm_enabled,alarm_message")
      .eq("user_id", userId)
      .eq("active", true),
    supabase
      .from("tasks")
      .select("id,title,due_at,completed,alarm_enabled,alarm_message")
      .eq("user_id", userId)
      .eq("completed", false)
      .not("due_at", "is", null)
      .gte("due_at", now.toISOString())
      .lte("due_at", horizon.toISOString()),
    supabase
      .from("appointments")
      .select("id,title,doctor,location,scheduled_at,reminder_minutes_before,status,alarm_enabled,alarm_message")
      .eq("user_id", userId)
      .neq("status", "cancelado")
      .gte("scheduled_at", now.toISOString())
      .lte(
        "scheduled_at",
        new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      ),
  ]);

  const out: AlarmEvent[] = [];

  for (const med of medsRes.data ?? []) {
    if (med.alarm_enabled === false) continue;
    if (med.start_date && med.start_date > todayIso) continue;
    if (med.end_date && med.end_date < todayIso) continue;
    for (const t of (med.times ?? []) as string[]) {
      const [h, m] = t.split(":").map(Number);
      if (Number.isNaN(h)) continue;
      const dt = new Date(now);
      dt.setHours(h, m || 0, 0, 0);
      if (dt.getTime() < now.getTime() - FIRE_WINDOW_MS) continue;
      if (dt.getTime() > horizon.getTime()) continue;
      const defaultSpeech = `Hora de tomar ${med.name}${med.dosage ? `, ${med.dosage}` : ""}.`;
      out.push({
        key: `med:${med.id}:${dt.toISOString()}`,
        kind: "medication",
        title: `Hora do remédio: ${med.name}`,
        subtitle: med.dosage ?? undefined,
        scheduledAt: dt,
        speech: (med.alarm_message?.trim() || defaultSpeech),
      });
    }
  }

  for (const task of tasksRes.data ?? []) {
    if (!task.due_at) continue;
    if (task.alarm_enabled === false) continue;
    const dt = new Date(task.due_at);
    const defaultSpeech = `Lembrete de tarefa: ${task.title}.`;
    out.push({
      key: `task:${task.id}:${dt.toISOString()}`,
      kind: "task",
      title: task.title,
      subtitle: "Tarefa",
      scheduledAt: dt,
      speech: (task.alarm_message?.trim() || defaultSpeech),
    });
  }

  for (const a of apptsRes.data ?? []) {
    if (a.alarm_enabled === false) continue;
    const rmin = a.reminder_minutes_before ?? 60;
    const dt = new Date(new Date(a.scheduled_at).getTime() - rmin * 60_000);
    if (dt.getTime() < now.getTime() - FIRE_WINDOW_MS) continue;
    if (dt.getTime() > horizon.getTime()) continue;
    const defaultSpeech = `Lembrete: você tem ${a.title} em ${rmin} minutos.`;
    out.push({
      key: `appt:${a.id}:${dt.toISOString()}`,
      kind: "appointment",
      title: `Compromisso em ${rmin} min: ${a.title}`,
      subtitle: [a.doctor, a.location].filter(Boolean).join(" • ") || undefined,
      scheduledAt: dt,
      speech: (a.alarm_message?.trim() || defaultSpeech),
    });
  }

  return out;
}

export function AlarmProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [active, setActive] = useState<AlarmEvent | null>(null);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const playerRef = useRef<AlarmPlayer | null>(null);
  const stopTimerRef = useRef<number | null>(null);
  const firedRef = useRef<FiredMap>({});
  const snoozeQueueRef = useRef<AlarmEvent[]>([]);

  useEffect(() => {
    firedRef.current = loadFired();
    if (typeof window !== "undefined") {
      setAudioUnlocked(localStorage.getItem(UNLOCK_KEY) === "1");
    }
    playerRef.current = new AlarmPlayer();
    return () => {
      playerRef.current?.stop();
      cancelSpeech();
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    };
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const { data: settingsRow } = useQuery({
    queryKey: ["alarm-settings", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alarm_settings")
        .select("*")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data as AlarmSettings | null;
    },
  });

  const settings: AlarmSettings | null = useMemo(() => {
    if (!userId) return null;
    return { user_id: userId, ...DEFAULT_ALARM_SETTINGS, ...(settingsRow ?? {}) };
  }, [userId, settingsRow]);

  const { data: upcoming } = useQuery({
    queryKey: ["alarm-upcoming", userId],
    enabled: !!userId && !!settings?.enabled,
    refetchInterval: POLL_MS,
    queryFn: () => fetchUpcomingEvents(userId!),
    staleTime: POLL_MS - 1000,
  });

  const stopRinging = useCallback(() => {
    playerRef.current?.stop();
    cancelSpeech();
    vibrate(0);
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
  }, []);

  const startRinging = useCallback(
    async (event: AlarmEvent, s: AlarmSettings) => {
      const player = playerRef.current;
      if (!player) return;

      // Try to show a system notification too (works when tab is not focused,
      // respects OS silent mode though).
      try {
        if (
          "Notification" in window &&
          Notification.permission === "granted" &&
          document.visibilityState !== "visible"
        ) {
          new Notification(event.title, {
            body: event.subtitle,
            tag: event.key,
            requireInteraction: true,
          });
        }
      } catch {
        // ignore
      }

      if (s.custom_sound_url) {
        await player.playUrl(s.custom_sound_url, s.volume);
      } else {
        await player.playBuiltin(s.default_sound as BuiltinSoundId, s.volume);
      }

      if (s.tts_enabled) {
        // small delay so the melody plays first
        window.setTimeout(() => speak(event.speech, s.tts_voice || "pt-BR"), 1200);
      }

      if (s.vibrate) {
        vibrate([600, 300, 600, 300, 600]);
      }

      stopTimerRef.current = window.setTimeout(() => {
        stopRinging();
      }, s.ring_seconds * 1000);
    },
    [stopRinging],
  );

  const fireEvent = useCallback(
    (event: AlarmEvent) => {
      if (!settings) return;
      if (firedRef.current[event.key]) return;
      firedRef.current[event.key] = Date.now();
      saveFired(firedRef.current);
      setActive(event);
      void startRinging(event, settings);
    },
    [settings, startRinging],
  );

  // Ticker: every second, check if any upcoming event is due.
  useEffect(() => {
    if (!settings?.enabled) return;
    const id = window.setInterval(() => {
      const now = Date.now();

      // 1) Snoozed events
      const remainingSnoozes: AlarmEvent[] = [];
      for (const ev of snoozeQueueRef.current) {
        if (Math.abs(ev.scheduledAt.getTime() - now) <= FIRE_WINDOW_MS) {
          fireEvent(ev);
        } else if (ev.scheduledAt.getTime() > now) {
          remainingSnoozes.push(ev);
        }
      }
      snoozeQueueRef.current = remainingSnoozes;

      // 2) Regular upcoming events
      const list = upcoming ?? [];
      for (const ev of list) {
        if (firedRef.current[ev.key]) continue;
        const diff = ev.scheduledAt.getTime() - now;
        if (diff <= 0 && diff >= -FIRE_WINDOW_MS) {
          fireEvent(ev);
          break; // one alarm at a time
        }
      }
    }, TICK_MS);
    return () => clearInterval(id);
  }, [upcoming, settings?.enabled, fireEvent]);

  const dismiss = useCallback(() => {
    stopRinging();
    setActive(null);
  }, [stopRinging]);

  const snooze = useCallback(() => {
    if (!active || !settings) return;
    const later: AlarmEvent = {
      ...active,
      key: `${active.key}:snooze:${Date.now()}`,
      scheduledAt: new Date(Date.now() + settings.snooze_minutes * 60_000),
    };
    snoozeQueueRef.current.push(later);
    dismiss();
  }, [active, settings, dismiss]);

  const test = useCallback(() => {
    if (!settings) return;
    const ev: AlarmEvent = {
      key: `test:${Date.now()}`,
      kind: "medication",
      title: "Alarme de teste",
      subtitle: "Isto é uma pré-visualização",
      scheduledAt: new Date(),
      speech: "Este é um teste do seu alarme.",
    };
    setActive(ev);
    void startRinging(ev, settings);
  }, [settings, startRinging]);

  const requestUnlock = useCallback(async () => {
    const ok = await unlockAudio();
    // Request notification permission opportunistically
    if ("Notification" in window && Notification.permission === "default") {
      try {
        await Notification.requestPermission();
      } catch {
        // ignore
      }
    }
    if (ok) {
      setAudioUnlocked(true);
      try {
        localStorage.setItem(UNLOCK_KEY, "1");
      } catch {
        // ignore
      }
    }
  }, []);

  // Auto-attempt unlock on any user gesture so the alarm can ring later
  // without an extra click.
  useEffect(() => {
    if (audioUnlocked) return;
    const handler = () => {
      void requestUnlock();
    };
    window.addEventListener("pointerdown", handler, { once: true });
    window.addEventListener("keydown", handler, { once: true });
    return () => {
      window.removeEventListener("pointerdown", handler);
      window.removeEventListener("keydown", handler);
    };
  }, [audioUnlocked, requestUnlock]);

  const value: Ctx = {
    settings,
    active,
    audioUnlocked,
    requestUnlock,
    snooze,
    dismiss,
    test,
  };

  return <AlarmContext.Provider value={value}>{children}</AlarmContext.Provider>;
}

export function useAlarm() {
  const ctx = useContext(AlarmContext);
  if (!ctx) throw new Error("useAlarm precisa estar dentro de <AlarmProvider>");
  return ctx;
}
