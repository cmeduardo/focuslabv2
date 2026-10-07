// Sonidos de las actividades (Web Audio, sin assets). Defensivo a
// propósito: si el navegador bloquea el audio o algo falla, no debe romper
// el juego — el sonido es un extra, no un requisito.
//
// iOS solo deja arrancar el audio dentro de un gesto completo (click o
// touchend), no en pointerdown: por eso el shell llama a `unlockAudio()`
// desde los botones "Empezar práctica" / "Comenzar el reto". Después de
// eso el contexto queda activo y los sonidos en pointerdown sí suenan.
// (El interruptor de silencio del iPhone también apaga Web Audio.)
let ctx: AudioContext | null = null;
let muted: boolean | null = null;

const MUTE_KEY = "focuslab:sound-muted";

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

export function isSoundMuted(): boolean {
  if (muted === null) {
    try {
      muted = window.localStorage.getItem(MUTE_KEY) === "1";
    } catch {
      muted = false;
    }
  }
  return muted;
}

export function setSoundMuted(value: boolean) {
  muted = value;
  try {
    window.localStorage.setItem(MUTE_KEY, value ? "1" : "0");
  } catch {
    // preferencia solo en memoria
  }
}

// Llamar desde un click: crea/reanuda el contexto y reproduce un buffer
// vacío (lo que iOS necesita para "desbloquear" el audio).
export function unlockAudio() {
  try {
    const audioCtx = getContext();
    if (!audioCtx) return;
    const buffer = audioCtx.createBuffer(1, 1, 22050);
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);
    source.start(0);
  } catch {
    // sin audio
  }
}

function tone(
  frequency: number,
  durationMs: number,
  type: OscillatorType = "sine",
  gain = 0.05,
  delayMs = 0,
) {
  if (isSoundMuted()) return;
  try {
    const audioCtx = getContext();
    if (!audioCtx) return;
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    const start = audioCtx.currentTime + delayMs / 1000;
    const end = start + durationMs / 1000;
    // Ataque corto para que no "chasquee".
    gainNode.gain.setValueAtTime(0.0001, start);
    gainNode.gain.exponentialRampToValueAtTime(gain, start + 0.008);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, end);
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.start(start);
    oscillator.stop(end + 0.02);
  } catch {
    // silencio — el sonido nunca debe romper el juego
  }
}

// Confirmación neutra de que la respuesta quedó registrada: no dice si fue
// correcta (se usa también en la ronda que cuenta).
export function playTap() {
  tone(740, 45, "triangle", 0.04);
}

export function playSelect() {
  tone(600, 40, "triangle", 0.035);
}

export function playHit() {
  tone(880, 80, "sine", 0.06);
}

export function playCombo() {
  tone(1046, 70, "square", 0.045);
}

export function playMiss() {
  tone(196, 150, "triangle", 0.06);
  tone(165, 170, "triangle", 0.05, 90);
}

export function playLevelUp() {
  tone(660, 90, "sine", 0.06);
  tone(880, 140, "sine", 0.07, 90);
}

// Cuenta regresiva: 3-2-1 graves y una nota aguda al empezar.
export function playCountdownTick() {
  tone(523, 90, "sine", 0.05);
}

export function playGo() {
  tone(784, 70, "sine", 0.06);
  tone(1046, 160, "sine", 0.06, 70);
}

// Hito de avance (mitad, último tramo).
export function playMilestone() {
  tone(659, 80, "sine", 0.045);
  tone(784, 80, "sine", 0.045, 80);
  tone(988, 140, "sine", 0.05, 160);
}

export function playComplete() {
  [523, 659, 784, 1046].forEach((f, i) => tone(f, i === 3 ? 260 : 110, "sine", 0.055, i * 110));
}

// Escala tipo Simon: cada celda de Memory Matrix suena distinto.
const SCALE = [523, 587, 659, 698, 784, 880, 988, 1046, 1175];

export function playNote(index: number) {
  tone(SCALE[index % SCALE.length], 180, "sine", 0.05);
}
