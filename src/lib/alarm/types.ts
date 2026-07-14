import type { BuiltinSoundId } from "./sounds";

export type AlarmSettings = {
  user_id: string;
  enabled: boolean;
  default_sound: BuiltinSoundId | string;
  custom_sound_url: string | null;
  volume: number;
  vibrate: boolean;
  tts_enabled: boolean;
  tts_voice: string;
  ring_seconds: number;
  snooze_minutes: number;
  push_enabled: boolean;
};

export type AlarmEvent = {
  /** Stable key. If two events share the same key, only one alarm fires. */
  key: string;
  kind: "medication" | "task" | "appointment";
  title: string;
  subtitle?: string;
  scheduledAt: Date;
  /** Text used by the TTS if it is enabled. */
  speech: string;
};

export const DEFAULT_ALARM_SETTINGS: Omit<AlarmSettings, "user_id"> = {
  enabled: true,
  default_sound: "bell",
  custom_sound_url: null,
  volume: 0.9,
  vibrate: true,
  tts_enabled: true,
  tts_voice: "alloy",
  ring_seconds: 30,
  snooze_minutes: 5,
  push_enabled: false,
};
