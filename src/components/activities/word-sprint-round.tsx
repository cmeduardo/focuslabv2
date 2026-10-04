"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import type { RoundProps } from "@/components/activities/activity-shell";
import { RoundProgress } from "@/components/activities/round-progress";
import { useResponseInput, type ResponseEvent } from "@/hooks/use-response-input";
import { useTrialClock } from "@/hooks/use-trial-clock";
import { WORD_SPRINT_CONFIG as CONFIG } from "@/lib/activities/config";
import type { TrialRecord } from "@/lib/activities/types";
import {
  planWordSprintTrials,
  STROOP_COLORS,
  STROOP_PANEL_HEX,
  type StroopColorId,
} from "@/lib/activities/word-sprint/trials";
import { cn } from "@/lib/utils";

type Phase = "fixation" | "stimulus" | "between";
type Outcome = "correct" | "error" | "timeout";

const COLOR_BY_ID = Object.fromEntries(STROOP_COLORS.map((c) => [c.id, c])) as Record<
  StroopColorId,
  (typeof STROOP_COLORS)[number]
>;
const KEYS = Object.fromEntries(STROOP_COLORS.map((c) => [c.key, c.id])) as Record<
  string,
  StroopColorId
>;

// Word Sprint (Stroop): nombres de colores escritos en una tinta que
// coincide o no; se responde el COLOR DE LA TINTA con 4 botones grandes
// (nunca teclado de texto) o con las teclas D F J K en laptop.
export function WordSprintRound({ mode, origin, onComplete }: RoundProps) {
  const [plan] = useState(() => planWordSprintTrials(CONFIG, mode, Math.random));
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("fixation");
  const [feedback, setFeedback] = useState<{ outcome: Outcome; ink: StroopColorId } | null>(null);

  const clock = useTrialClock(origin);
  const phaseRef = useRef<Phase>("fixation");
  const indexRef = useRef(0);
  const trialsRef = useRef<TrialRecord[]>([]);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const doneRef = useRef(false);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);
  useEffect(() => clearTimers, [clearTimers]);

  const finishTrial = useCallback(
    (event: ResponseEvent<StroopColorId> | null) => {
      clearTimers();
      const i = indexRef.current;
      const trial = plan[i];
      const onset = clock.onset();
      const outcome: Outcome = !event ? "timeout" : event.value === trial.ink ? "correct" : "error";
      const hidden = clock.wasHidden();
      trialsRef.current.push({
        trialIndex: i,
        condition: { word: trial.word, ink: trial.ink, congruent: trial.congruent },
        stimulusOnsetMs: clock.relative(onset),
        responseAtMs: event ? clock.relative(event.at) : null,
        rtMs: event && onset !== null ? Math.round((event.at - onset) * 100) / 100 : null,
        response: event?.value ?? null,
        correct: outcome === "correct",
        classification: outcome,
        inputType: event?.input ?? null,
        valid: !hidden,
        invalidReason: hidden ? "visibility" : null,
      });

      phaseRef.current = "between";
      setPhase("between");
      if (mode === "practice") setFeedback({ outcome, ink: trial.ink });

      timersRef.current.push(
        setTimeout(
          () => {
            if (i + 1 >= plan.length) {
              if (!doneRef.current) {
                doneRef.current = true;
                onComplete(trialsRef.current);
              }
              return;
            }
            indexRef.current = i + 1;
            phaseRef.current = "fixation";
            setFeedback(null);
            setPhase("fixation");
            setIndex(i + 1);
          },
          mode === "practice" ? CONFIG.practiceFeedbackMs : CONFIG.interTrialMs,
        ),
      );
    },
    [clearTimers, plan, clock, mode, onComplete],
  );

  // Punto de fijación y luego la palabra.
  useEffect(() => {
    clock.begin();
    const timer = setTimeout(() => {
      phaseRef.current = "stimulus";
      setPhase("stimulus");
    }, CONFIG.fixationMs);
    return () => clearTimeout(timer);
    // Un ensayo por índice; clock es estable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  useLayoutEffect(() => {
    if (phase !== "stimulus") return;
    let cancelled = false;
    clock.stampOnset(() => {
      if (cancelled) return;
      timersRef.current.push(
        setTimeout(() => {
          if (phaseRef.current === "stimulus" && clock.claim()) finishTrial(null);
        }, CONFIG.responseWindowMs),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [phase, clock, finishTrial]);

  const handleResponse = useCallback(
    (event: ResponseEvent<StroopColorId>) => {
      const onset = clock.onset();
      if (phaseRef.current !== "stimulus" || onset === null || event.at < onset) return;
      if (!clock.claim()) return;
      finishTrial(event);
    },
    [clock, finishTrial],
  );

  const { bind } = useResponseInput<StroopColorId>({
    enabled: true,
    keys: KEYS,
    onResponse: handleResponse,
  });

  const trial = plan[index];

  return (
    <div className="flex h-full w-full flex-col items-center justify-between gap-4 px-4 py-4">
      <RoundProgress current={index} total={plan.length} />
      <div
        data-testid="stroop-panel"
        style={{ backgroundColor: STROOP_PANEL_HEX }}
        className="flex min-h-40 w-full max-w-md flex-1 items-center justify-center rounded-3xl p-4"
      >
        {phase === "fixation" && <span className="text-4xl text-white/70">+</span>}
        {phase === "stimulus" && (
          <span
            data-testid="stroop-word"
            data-ink={trial.ink}
            data-congruent={trial.congruent}
            style={{ color: COLOR_BY_ID[trial.ink].hex }}
            className="font-heading text-[clamp(2.5rem,12vw,4rem)] font-extrabold tracking-wide"
          >
            {COLOR_BY_ID[trial.word].label}
          </span>
        )}
        {phase === "between" && feedback && (
          <span
            data-testid="practice-feedback"
            className={cn(
              "animate-pop px-4 text-center font-heading text-lg font-semibold",
              feedback.outcome === "correct" ? "text-white" : "text-[#ffb4a3]",
            )}
          >
            {feedback.outcome === "correct" && "¡Bien!"}
            {feedback.outcome === "error" &&
              `Era el color de la letra: ${COLOR_BY_ID[feedback.ink].label}`}
            {feedback.outcome === "timeout" && "Responde un poco más rápido: el color de la letra."}
          </span>
        )}
      </div>
      <p className="text-center text-sm text-muted-foreground">
        ¿De qué <strong className="text-foreground">color está pintada</strong> la palabra?
      </p>
      <div className="grid w-full max-w-md grid-cols-2 gap-3">
        {STROOP_COLORS.map((color) => (
          <button
            key={color.id}
            type="button"
            data-testid={`stroop-answer-${color.id}`}
            {...bind(color.id)}
            className="flex min-h-16 items-center gap-3 rounded-2xl border-2 border-border bg-card px-4 text-left font-heading text-base font-bold transition-transform active:scale-[0.97]"
          >
            <span
              aria-hidden
              style={{ backgroundColor: color.hex }}
              className="size-7 shrink-0 rounded-full ring-2 ring-black/10"
            />
            <span className="flex-1">{color.label}</span>
            <kbd className="hidden rounded border border-border px-1.5 text-xs font-normal text-muted-foreground pointer-fine:inline">
              {color.key.replace("Key", "")}
            </kbd>
          </button>
        ))}
      </div>
    </div>
  );
}
