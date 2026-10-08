"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import type { RoundProps } from "@/components/activities/activity-shell";
import { RoundProgress } from "@/components/activities/round-progress";
import { useResponseInput, type ResponseEvent } from "@/hooks/use-response-input";
import { useTrialClock } from "@/hooks/use-trial-clock";
import { MEMORY_MATRIX_CONFIG as CONFIG } from "@/lib/activities/config";
import {
  classifyCorsi,
  CORSI_BLOCK_SIZE_PCT,
  CORSI_BLOCKS,
  generateCorsiSequence,
  nextCorsiState,
  type CorsiClassification,
  type CorsiState,
} from "@/lib/activities/memory-matrix/trials";
import type { TrialRecord } from "@/lib/activities/types";
import { playLevelUp, playMiss, playNote } from "@/lib/audio/beep";
import { cn } from "@/lib/utils";

// "ready" cubre la pausa previa y la presentación completa: si la
// presentación cambiara de fase, la limpieza del efecto cancelaría los
// timers que faltan (bug encontrado por la E2E). El recuerdo empieza en
// cuanto se apaga el último bloque: antes había 300 ms "muertos" después
// del último bloque en los que los toques se descartaban sin aviso, y
// casi todos empezamos a tocar justo ahí (bug del taller 2026-10-04).
// "checking" es la pausa tras el último toque: el contador queda lleno un
// momento antes de decir si fue correcto, para ver que el toque contó.
type Phase = "ready" | "recall" | "checking" | "feedback";
type Tap = { block: number; at: number; input: ResponseEvent<string>["input"] };

const BLOCK_KEYS = CORSI_BLOCKS.map((_, i) => String(i));

// Memory Matrix (bloques de Corsi): los bloques se iluminan en secuencia y
// hay que repetirla EN ORDEN. En la ronda registrada la longitud sube con
// cada acierto; dos fallos en un nivel cierran el reto. El avance de nivel
// es parte del juego, así que aquí sí hay retroalimentación.
export function MemoryMatrixRound({ mode, origin, onComplete }: RoundProps) {
  const [state, setState] = useState<CorsiState>(() => ({
    length: mode === "practice" ? CONFIG.practiceLength : CONFIG.startLength,
    attempt: 1,
  }));
  const [sequence, setSequence] = useState<number[]>(() =>
    generateCorsiSequence(
      mode === "practice" ? CONFIG.practiceLength : CONFIG.startLength,
      CONFIG.blockCount,
      Math.random,
    ),
  );
  const [trialIndex, setTrialIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("ready");
  const [lit, setLit] = useState<number | null>(null);
  const [taps, setTaps] = useState<number[]>([]);
  const [result, setResult] = useState<CorsiClassification | null>(null);
  // Destello del último bloque tocado; `n` cambia en cada toque para
  // reiniciar la animación aunque se toque el mismo bloque.
  const [flash, setFlash] = useState<{ block: number; n: number } | null>(null);
  const [earlyHint, setEarlyHint] = useState(false);

  const clock = useTrialClock(origin);
  const tapsRef = useRef<Tap[]>([]);
  const phaseRef = useRef<Phase>("ready");
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trialsRef = useRef<TrialRecord[]>([]);
  const doneRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(
    () => () => {
      timersRef.current.forEach(clearTimeout);
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    },
    [],
  );

  const goTo = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  // Presentación: pausa breve y luego cada bloque se enciende por turno.
  useEffect(() => {
    if (phase !== "ready") return;
    const local: ReturnType<typeof setTimeout>[] = [];
    const step = CONFIG.blockOnMs + CONFIG.blockGapMs;
    sequence.forEach((block, i) => {
      const at = CONFIG.preSequenceMs + i * step;
      local.push(setTimeout(() => setLit(block), at));
      local.push(setTimeout(() => setLit(null), at + CONFIG.blockOnMs));
    });
    local.push(
      setTimeout(
        () => {
          tapsRef.current = [];
          setTaps([]);
          setEarlyHint(false);
          goTo("recall");
        },
        CONFIG.preSequenceMs + (sequence.length - 1) * step + CONFIG.blockOnMs,
      ),
    );
    return () => local.forEach(clearTimeout);
  }, [phase, sequence, goTo]);

  // Inicio del recuerdo: frame en que aparece "Tu turno".
  useLayoutEffect(() => {
    if (phase !== "recall") return;
    clock.begin();
    clock.stampOnset();
  }, [phase, clock]);

  const finishSequence = useCallback(
    (allTaps: Tap[]) => {
      const blocks = allTaps.map((t) => t.block);
      const classification = classifyCorsi(sequence, blocks);
      const onset = clock.onset();
      const last = allTaps[allTaps.length - 1];
      const hidden = clock.wasHidden();
      const sinceOnset = (at: number) =>
        onset === null ? null : Math.round((at - onset) * 100) / 100;
      trialsRef.current.push({
        trialIndex,
        condition: { length: state.length, attempt: state.attempt, sequence },
        stimulusOnsetMs: clock.relative(onset),
        responseAtMs: clock.relative(last.at),
        rtMs: sinceOnset(last.at),
        response: blocks.join("-"),
        detail: {
          firstTapMs: sinceOnset(allTaps[0].at),
          taps: allTaps.map((t) => ({ block: t.block, atMs: sinceOnset(t.at) })),
        },
        correct: classification === "correct",
        classification,
        inputType: allTaps[0].input,
        valid: !hidden,
        invalidReason: hidden ? "visibility" : null,
      });

      goTo("checking");

      let next: CorsiState | null;
      if (mode === "practice") {
        next =
          trialIndex + 1 < CONFIG.practiceSequences
            ? { length: CONFIG.practiceLength, attempt: 1 }
            : null;
      } else {
        next = nextCorsiState(state, classification === "correct", CONFIG);
      }

      const advance = () => {
        if (!next) {
          if (!doneRef.current) {
            doneRef.current = true;
            onComplete(trialsRef.current);
          }
          return;
        }
        setState(next);
        setSequence(generateCorsiSequence(next.length, CONFIG.blockCount, Math.random));
        setTrialIndex((i) => i + 1);
        setResult(null);
        setFlash(null);
        goTo("ready");
      };

      timersRef.current.push(
        setTimeout(() => {
          setResult(classification);
          goTo("feedback");
          if (classification === "correct") playLevelUp();
          else playMiss();
          timersRef.current.push(setTimeout(advance, CONFIG.feedbackMs));
        }, CONFIG.checkMs),
      );
    },
    [sequence, clock, trialIndex, state, mode, onComplete, goTo],
  );

  const handleTap = useCallback(
    (event: ResponseEvent<string>) => {
      // Se lee la fase del ref (no del render): un toque que llega en el
      // mismo frame del cambio a "recall" ya cuenta.
      if (phaseRef.current === "ready") {
        // Toque durante la presentación: no cuenta, pero se avisa en vez
        // de ignorarlo en silencio.
        setEarlyHint(true);
        if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
        hintTimerRef.current = setTimeout(() => setEarlyHint(false), 1200);
        return;
      }
      if (phaseRef.current !== "recall") return;
      if (tapsRef.current.length >= sequence.length) return;
      const block = Number(event.value);
      tapsRef.current = [...tapsRef.current, { block, at: event.at, input: event.input }];
      setTaps(tapsRef.current.map((t) => t.block));
      setFlash((f) => ({ block, n: (f?.n ?? 0) + 1 }));
      playNote(block);
      if (tapsRef.current.length >= sequence.length) {
        finishSequence(tapsRef.current);
      }
    },
    [sequence.length, finishSequence],
  );

  const { bind } = useResponseInput<string>({
    enabled: phase !== "feedback",
    keys: {},
    onResponse: handleTap,
  });

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 px-4 py-3">
      <p
        data-testid="memory-status"
        data-phase={phase}
        className={cn(
          "min-h-7 text-center font-heading text-lg font-semibold",
          result === "correct" && "text-primary",
          result && result !== "correct" && "text-pulse",
        )}
      >
        {phase === "ready" && (earlyHint ? "Espera a que termine la secuencia" : "Observa…")}
        {(phase === "recall" || phase === "checking") && `Tu turno: ${taps.length} de ${sequence.length}`}
        {phase === "feedback" && result === "correct" && "¡Correcto!"}
        {phase === "feedback" && result !== "correct" && "Esa no fue. ¡Vamos con otra!"}
      </p>
      <div
        data-testid="corsi-board"
        className="relative aspect-square w-[min(100%,420px,calc(100dvh-15rem))] rounded-3xl border border-border bg-muted/30"
      >
        {CORSI_BLOCKS.map((pos, i) => (
          <button
            key={i}
            type="button"
            data-testid={`corsi-block-${i}`}
            data-lit={lit === i}
            aria-label={`Bloque ${i + 1}`}
            // aria-disabled y no disabled: un botón deshabilitado no recibe
            // el toque y no podríamos avisar que fue antes de tiempo.
            aria-disabled={phase !== "recall"}
            {...bind(BLOCK_KEYS[i])}
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              width: `${CORSI_BLOCK_SIZE_PCT}%`,
              height: `${CORSI_BLOCK_SIZE_PCT}%`,
            }}
            className={cn(
              "absolute min-h-12 min-w-12 overflow-hidden rounded-xl border-2 border-primary/30 bg-secondary transition-colors duration-100",
              lit === i && "border-primary bg-primary shadow-[0_0_24px] shadow-primary/50",
              phase === "recall" && "cursor-pointer border-primary/50",
            )}
          >
            {flash?.block === i && (
              <span
                key={flash.n}
                aria-hidden
                className="pointer-events-none absolute inset-0 animate-tap-flash bg-primary"
              />
            )}
          </button>
        ))}
      </div>
      <TapDots count={taps.length} total={sequence.length} active={phase === "recall" || phase === "checking"} />
      <RoundProgress
        milestones={false}
        current={mode === "practice" ? trialIndex : state.length - CONFIG.startLength}
        total={
          mode === "practice" ? CONFIG.practiceSequences : CONFIG.maxLength - CONFIG.startLength + 1
        }
        label={
          mode === "practice"
            ? `Práctica ${trialIndex + 1} de ${CONFIG.practiceSequences}`
            : `Nivel ${state.length - CONFIG.startLength + 1} · ${state.length} bloques · intento ${state.attempt}`
        }
      />
    </div>
  );
}

// Un punto por bloque de la secuencia: se llenan con cada toque. Confirma
// que el toque quedó registrado sin decir si fue el bloque correcto.
function TapDots({ count, total, active }: { count: number; total: number; active: boolean }) {
  return (
    <div
      data-testid="corsi-tap-dots"
      aria-hidden
      className={cn("flex h-3 items-center gap-1.5 transition-opacity", !active && "opacity-0")}
    >
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn(
            "size-2.5 rounded-full border border-primary/50 transition-colors duration-100",
            i < count && "animate-pop border-primary bg-primary",
          )}
        />
      ))}
    </div>
  );
}
