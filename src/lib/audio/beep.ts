// Feedback sonoro mínimo para las actividades (Web Audio, sin assets).
// Defensivo a propósito: si el navegador bloquea audio o algo falla, no
// debe romper el juego — el sonido es un extra, no un requisito.
let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const AudioCtxClass =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtxClass) return null;
      ctx = new AudioCtxClass();
    }
    if (ctx.state === "suspended") {
      void ctx.resume();
    }
    return ctx;
  } catch {
    return null;
  }
}

function tone(
  frequency: number,
  durationMs: number,
  type: OscillatorType = "sine",
  gain = 0.05,
) {
  try {
    const audioCtx = getContext();
    if (!audioCtx) return;
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gainNode.gain.value = gain;
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    const now = audioCtx.currentTime;
    oscillator.start(now);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);
    oscillator.stop(now + durationMs / 1000);
  } catch {
    // silencio — el sonido nunca debe romper el juego
  }
}

export function playHit() {
  tone(880, 80, "sine", 0.06);
}

export function playCombo() {
  tone(1046, 70, "square", 0.045);
}

export function playMiss() {
  tone(160, 160, "sawtooth", 0.05);
}

export function playLevelUp() {
  tone(660, 90, "sine", 0.06);
  setTimeout(() => tone(880, 140, "sine", 0.07), 90);
}

// Escala tipo Simon: cada celda de Memory Matrix suena distinto.
const SCALE = [523, 587, 659, 698, 784, 880, 988, 1046, 1175];

export function playNote(index: number) {
  tone(SCALE[index % SCALE.length], 180, "sine", 0.05);
}
