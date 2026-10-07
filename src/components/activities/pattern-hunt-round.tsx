"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import type { RoundProps } from "@/components/activities/activity-shell";
import { RoundProgress } from "@/components/activities/round-progress";
import { useResponseInput, type ResponseEvent } from "@/hooks/use-response-input";
import { useTrialClock } from "@/hooks/use-trial-clock";
import { PATTERN_HUNT_CONFIG as CONFIG } from "@/lib/activities/config";
import {
  planPatternHuntTrials,
  type SearchItem,
} from "@/lib/activities/pattern-hunt/trials";
import type { TrialRecord } from "@/lib/activities/types";
import { playHit, playMiss, playTap } from "@/lib/audio/beep";
import { cn } from "@/lib/utils";

type Answer = "present" | "absent";
type Phase = "fixation" | "search" | "between";
type Classification = "hit" | "miss" | "correct_rejection" | "false_alarm" | "timeout";

const BOARD = 600;

export function SearchShape({
  item,
  cx,
  cy,
}: {
  item: Pick<SearchItem, "shape" | "orientation">;
  cx: number;
  cy: number;
}) {
  const long = 64;
  const short = item.shape === "oval" ? 30 : 18;
  const w = item.orientation === "vertical" ? short : long;
  const h = item.orientation === "vertical" ? long : short;
  return item.shape === "oval" ? (
    <ellipse cx={cx} cy={cy} rx={w / 2} ry={h / 2} className="fill-foreground" />
  ) : (
    <rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} rx={3} className="fill-foreground" />
  );
}

function classify(present: boolean, answer: Answer | null): Classification {
  if (answer === null) return "timeout";
  if (present) return answer === "present" ? "hit" : "miss";
  return answer === "absent" ? "correct_rejection" : "false_alarm";
}

// Pattern Hunt (búsqueda visual): ¿está el óvalo vertical? Dos botones
// grandes (o F / J en laptop).
export function PatternHuntRound({ mode, origin, onComplete }: RoundProps) {
  const [plan] = useState(() => planPatternHuntTrials(CONFIG, mode, Math.random));
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("fixation");
  const [feedback, setFeedback] = useState<Classification | null>(null);
  // Botón recién pulsado (confirmación neutra, también en la ronda que cuenta).
  const [pressed, setPressed] = useState<{ value: Answer; n: number } | null>(null);

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
    (event: ResponseEvent<Answer> | null) => {
      clearTimers();
      const i = indexRef.current;
      const trial = plan[i];
      const onset = clock.onset();
      const classification = classify(trial.present, event?.value ?? null);
      const hidden = clock.wasHidden();
      trialsRef.current.push({
        trialIndex: i,
        condition: { type: trial.type, setSize: trial.setSize, present: trial.present },
        stimulusOnsetMs: clock.relative(onset),
        responseAtMs: event ? clock.relative(event.at) : null,
        rtMs: event && onset !== null ? Math.round((event.at - onset) * 100) / 100 : null,
        response: event?.value ?? null,
        correct: classification === "hit" || classification === "correct_rejection",
        classification,
        inputType: event?.input ?? null,
        valid: !hidden,
        invalidReason: hidden ? "visibility" : null,
      });

      phaseRef.current = "between";
      setPhase("between");
      if (event) setPressed((p) => ({ value: event.value, n: (p?.n ?? 0) + 1 }));
      if (mode === "practice") {
        if (classification === "hit" || classification === "correct_rejection") playHit();
        else playMiss();
        setFeedback(classification);
      } else if (event) {
        playTap();
      }

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

  useEffect(() => {
    clock.begin();
    const timer = setTimeout(() => {
      phaseRef.current = "search";
      setPhase("search");
    }, CONFIG.fixationMs);
    return () => clearTimeout(timer);
    // Un ensayo por índice; clock es estable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  useLayoutEffect(() => {
    if (phase !== "search") return;
    let cancelled = false;
    clock.stampOnset(() => {
      if (cancelled) return;
      timersRef.current.push(
        setTimeout(() => {
          if (phaseRef.current === "search" && clock.claim()) finishTrial(null);
        }, CONFIG.responseWindowMs),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [phase, clock, finishTrial]);

  const handleResponse = useCallback(
    (event: ResponseEvent<Answer>) => {
      const onset = clock.onset();
      if (phaseRef.current !== "search" || onset === null || event.at < onset) return;
      if (!clock.claim()) return;
      finishTrial(event);
    },
    [clock, finishTrial],
  );

  const { bind } = useResponseInput<Answer>({
    enabled: true,
    keys: { KeyF: "present", KeyJ: "absent" },
    onResponse: handleResponse,
  });

  const trial = plan[index];
  const feedbackText: Record<Classification, string> = {
    hit: "¡Bien! Ahí estaba.",
    correct_rejection: "¡Bien! No estaba.",
    miss: "Sí estaba: busca el óvalo de pie.",
    false_alarm: "Esta vez no estaba.",
    timeout: "Responde aunque no estés seguro.",
  };

  return (
    <div className="flex h-full w-full flex-col items-center justify-between gap-3 px-4 py-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        Busca:
        <svg viewBox="0 0 80 80" className="size-8" aria-label="óvalo vertical">
          <SearchShape item={{ shape: "oval", orientation: "vertical" }} cx={40} cy={40} />
        </svg>
        <span>(óvalo de pie)</span>
      </div>
      <div
        data-testid="search-board"
        className="relative flex aspect-square w-[min(100%,520px,calc(100dvh-17rem))] items-center justify-center rounded-3xl border border-border bg-muted/30"
      >
        {phase === "fixation" && <span className="text-4xl text-muted-foreground">+</span>}
        {phase === "search" && (
          <svg
            data-testid="search-items"
            data-present={trial.present}
            data-type={trial.type}
            viewBox={`0 0 ${BOARD} ${BOARD}`}
            className="absolute inset-0 size-full"
          >
            {trial.items.map((item, i) => (
              <SearchShape key={i} item={item} cx={item.x * BOARD} cy={item.y * BOARD} />
            ))}
          </svg>
        )}
        {phase === "between" && feedback && (
          <span
            data-testid="practice-feedback"
            className={cn(
              "animate-pop px-6 text-center font-heading text-lg font-semibold",
              feedback === "hit" || feedback === "correct_rejection" ? "text-primary" : "text-pulse",
            )}
          >
            {feedbackText[feedback]}
          </span>
        )}
      </div>
      <div className="grid w-full max-w-md grid-cols-2 gap-3">
        {(
          [
            ["present", "Está", "F"],
            ["absent", "No está", "J"],
          ] as const
        ).map(([value, label, key]) => (
          <button
            key={value}
            type="button"
            data-testid={`search-answer-${value}`}
            {...bind(value)}
            className="relative flex min-h-16 items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 border-border bg-card font-heading text-lg font-bold transition-transform active:scale-[0.97]"
          >
            {pressed?.value === value && (
              <span
                key={pressed.n}
                aria-hidden
                className="pointer-events-none absolute inset-0 animate-tap-flash bg-primary/25"
              />
            )}
            {label}
            <kbd className="hidden rounded border border-border px-1.5 text-xs font-normal text-muted-foreground pointer-fine:inline">
              {key}
            </kbd>
          </button>
        ))}
      </div>
      <RoundProgress current={index} total={plan.length} />
    </div>
  );
}
