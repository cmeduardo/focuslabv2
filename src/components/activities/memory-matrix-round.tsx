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
// timers que faltan (bug encontrado por la E2E).
type Phase = "ready" | "recall" | "feedback";
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

  const clock = useTrialClock(origin);
  const tapsRef = useRef<Tap[]>([]);
  const trialsRef = useRef<TrialRecord[]>([]);
  const doneRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(
    () => () => {
      timersRef.current.forEach(clearTimeout);
    },
    [],
  );

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
      setTimeout(() => {
        tapsRef.current = [];
        setTaps([]);
        setPhase("recall");
      }, CONFIG.preSequenceMs + sequence.length * step),
    );
    return () => local.forEach(clearTimeout);
  }, [phase, sequence]);

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

      setResult(classification);
      setPhase("feedback");
      if (classification === "correct") playLevelUp();
      else playMiss();

      let next: CorsiState | null;
      if (mode === "practice") {
        next =
          trialIndex + 1 < CONFIG.practiceSequences
            ? { length: CONFIG.practiceLength, attempt: 1 }
            : null;
      } else {
        next = nextCorsiState(state, classification === "correct", CONFIG);
      }

      timersRef.current.push(
        setTimeout(() => {
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
          setPhase("ready");
        }, CONFIG.feedbackMs),
      );
    },
    [sequence, clock, trialIndex, state, mode, onComplete],
  );

  const handleTap = useCallback(
    (event: ResponseEvent<string>) => {
      if (phase !== "recall") return;
      const block = Number(event.value);
      tapsRef.current = [...tapsRef.current, { block, at: event.at, input: event.input }];
      setTaps(tapsRef.current.map((t) => t.block));
      playNote(block);
      if (tapsRef.current.length >= sequence.length) {
        finishSequence(tapsRef.current);
      }
    },
    [phase, sequence.length, finishSequence],
  );

  const { bind } = useResponseInput<string>({
    enabled: phase === "recall",
    keys: {},
    onResponse: handleTap,
  });

  const lastTap = taps[taps.length - 1];

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
        {phase === "ready" && "Observa…"}
        {phase === "recall" && `Tu turno: ${taps.length} de ${sequence.length}`}
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
            disabled={phase !== "recall"}
            {...bind(BLOCK_KEYS[i])}
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              width: `${CORSI_BLOCK_SIZE_PCT}%`,
              height: `${CORSI_BLOCK_SIZE_PCT}%`,
            }}
            className={cn(
              "absolute min-h-12 min-w-12 rounded-xl border-2 border-primary/30 bg-secondary transition-colors duration-100",
              lit === i && "border-primary bg-primary shadow-[0_0_24px] shadow-primary/50",
              phase === "recall" && "cursor-pointer",
              phase === "recall" && lastTap === i && "animate-pop bg-primary/60",
            )}
          />
        ))}
      </div>
      <RoundProgress
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
