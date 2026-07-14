// Web Audio–based alarm sounds. No external mp3 needed.
// Each sound is a short "pattern" that is repeated at a fixed interval
// until stop() is called.

export const BUILTIN_SOUNDS = [
  { id: "bell", label: "Sino suave" },
  { id: "chime", label: "Carrilhão" },
  { id: "urgent", label: "Urgente" },
  { id: "gentle", label: "Delicado" },
  { id: "cuckoo", label: "Cuco" },
] as const;

export type BuiltinSoundId = (typeof BUILTIN_SOUNDS)[number]["id"];

let ctxRef: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctxRef) ctxRef = new AC();
  return ctxRef;
}

/** Must be called from a user gesture the first time the app loads. */
export async function unlockAudio(): Promise<boolean> {
  const c = getCtx();
  if (!c) return false;
  if (c.state === "suspended") {
    try {
      await c.resume();
    } catch {
      return false;
    }
  }
  return c.state === "running";
}

function tone(
  c: AudioContext,
  out: AudioNode,
  freq: number,
  startOffset: number,
  duration: number,
  type: OscillatorType = "sine",
  peak = 0.5,
) {
  const t = c.currentTime + startOffset;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(g).connect(out);
  osc.start(t);
  osc.stop(t + duration + 0.05);
}

function renderPattern(
  c: AudioContext,
  out: AudioNode,
  sound: BuiltinSoundId,
): number {
  // returns interval in ms until the next repetition
  switch (sound) {
    case "bell":
      tone(c, out, 880, 0, 1.0, "sine", 0.5);
      tone(c, out, 1760, 0, 1.0, "sine", 0.25);
      return 1500;
    case "chime":
      tone(c, out, 659, 0.0, 0.35, "sine", 0.5);
      tone(c, out, 784, 0.35, 0.35, "sine", 0.5);
      tone(c, out, 988, 0.7, 0.5, "sine", 0.5);
      return 2200;
    case "urgent":
      for (let i = 0; i < 6; i++) {
        tone(c, out, 1000, i * 0.18, 0.12, "square", 0.35);
      }
      return 1600;
    case "gentle":
      tone(c, out, 523, 0, 1.8, "sine", 0.35);
      return 3000;
    case "cuckoo":
      tone(c, out, 700, 0, 0.4, "sine", 0.5);
      tone(c, out, 523, 0.4, 0.55, "sine", 0.5);
      return 2200;
    default:
      tone(c, out, 880, 0, 0.8, "sine", 0.4);
      return 1500;
  }
}

export class AlarmPlayer {
  private timer: number | null = null;
  private gain: GainNode | null = null;
  private htmlAudio: HTMLAudioElement | null = null;
  private stopped = true;

  async playBuiltin(id: BuiltinSoundId, volume: number) {
    this.stop();
    const c = getCtx();
    if (!c) return;
    await unlockAudio();
    this.stopped = false;
    this.gain = c.createGain();
    this.gain.gain.value = Math.max(0, Math.min(1, volume));
    this.gain.connect(c.destination);
    const run = () => {
      if (this.stopped || !this.gain) return;
      const interval = renderPattern(c, this.gain, id);
      this.timer = window.setTimeout(run, interval);
    };
    run();
  }

  async playUrl(url: string, volume: number) {
    this.stop();
    this.stopped = false;
    const audio = new Audio(url);
    audio.loop = true;
    audio.volume = Math.max(0, Math.min(1, volume));
    this.htmlAudio = audio;
    try {
      await audio.play();
    } catch {
      // Autoplay blocked. Nothing we can do until unlock.
    }
  }

  stop() {
    this.stopped = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.gain) {
      try {
        this.gain.disconnect();
      } catch {
        // ignore
      }
      this.gain = null;
    }
    if (this.htmlAudio) {
      try {
        this.htmlAudio.pause();
      } catch {
        // ignore
      }
      this.htmlAudio.src = "";
      this.htmlAudio = null;
    }
  }
}

/** Speak text using the browser's built-in TTS. */
export function speak(text: string, voiceHint = "pt-BR") {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = voiceHint;
    u.rate = 1;
    u.pitch = 1;
    u.volume = 1;
    const voices = window.speechSynthesis.getVoices();
    const pt =
      voices.find((v) => v.lang?.toLowerCase().startsWith("pt-br")) ||
      voices.find((v) => v.lang?.toLowerCase().startsWith("pt"));
    if (pt) u.voice = pt;
    window.speechSynthesis.speak(u);
  } catch {
    // ignore
  }
}

export function cancelSpeech() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    // ignore
  }
}

/** Best-effort vibration. Silently ignored on desktop / iOS Safari. */
export function vibrate(pattern: number | number[]) {
  if (typeof navigator === "undefined") return;
  const n = navigator as Navigator & { vibrate?: (p: number | number[]) => boolean };
  try {
    n.vibrate?.(pattern);
  } catch {
    // ignore
  }
}
