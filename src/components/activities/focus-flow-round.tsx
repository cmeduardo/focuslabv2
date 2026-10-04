"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import type { RoundProps } from "@/components/activities/activity-shell";
import { RoundProgress } from "@/components/activities/round-progress";
import { useResponseInput, type ResponseEvent } from "@/hooks/use-response-input";
import { useTrialClock } from "@/hooks/use-trial-clock";
import { FOCUS_FLOW_CONFIG as CONFIG } from "@/lib/activities/config";
import {
  classifyFocusFlow,
  planFocusFlowTrials,
  type FocusFlowClassification,
} from "@/lib/activities/focus-flow/trials";
import type { TrialRecord } from "@/lib/activities/types";
import { cn } from "@/lib/utils";

type Phase = "digit" | "mask" | "feedback";

const FEEDBACK: Record<FocusFlowClassification, { text: string; good: boolean }> = {
  hit: { text: "¡Bien!", good: true },
  correct_withhold: { text: "¡Bien! Dejaste pasar el 3.", good: true },
  commission: { text: "Era un 3: ese se deja pasar.", good: false },
  omission: { text: "Responde a todos los números menos al 3.", good: false },
};

// Focus Flow (SART): flujo de dígitos a ritmo fijo (250 ms visible +
// máscara). Responder a todos menos al 3. El ritmo no se detiene al
// responder: el ensayo dura siempre lo mismo.
export function FocusFlowRound({ mode, origin, onComplete }: RoundProps) {
  const [plan] = useState(() => planFocusFlowTrials(CONFIG, mode, Math.random));
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("digit");
  const [feedback, setFeedback] = useState<FocusFlowClassification | null>(null);

  const clock = useTrialClock(origin);
  const indexRef = useRef(0);
  const responseRef = useRef<ResponseEvent<"press"> | null>(null);
  const trialsRef = useRef<TrialRecord[]>([]);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const doneRef = useRef(false);

  const schedule = useCallback((fn: () => void, ms: number) => {
    timersRef.current.push(setTimeout(fn, ms));
  }, []);
  useEffect(
    () => () => {
      timersRef.current.forEach(clearTimeout);
    },
    [],
  );

  const endTrial = useCallback(() => {
    const i = indexRef.current;
    const trial = plan[i];
    const response = responseRef.current;
    const onset = clock.onset();
    const classification = classifyFocusFlow(trial.isTarget, response !== null);
    const hidden = clock.wasHidden();
    trialsRef.current.push({
      trialIndex: i,
      condition: { digit: trial.digit, isTarget: trial.isTarget, fontSizeRem: trial.fontSizeRem },
      stimulusOnsetMs: clock.relative(onset),
      responseAtMs: response ? clock.relative(response.at) : null,
      rtMs:
        response && onset !== null ? Math.round((response.at - onset) * 100) / 100 : null,
      response: response ? "press" : null,
      correct: classification === "hit" || classification === "correct_withhold",
      classification,
      inputType: response?.input ?? null,
      valid: !hidden,
      invalidReason: hidden ? "visibility" : null,
    });

    const next = () => {
      if (i + 1 >= plan.length) {
        if (!doneRef.current) {
          doneRef.current = true;
          onComplete(trialsRef.current);
        }
        return;
      }
      indexRef.current = i + 1;
      responseRef.current = null;
      setFeedback(null);
      setPhase("digit");
      setIndex(i + 1);
    };

    if (mode === "practice") {
      setFeedback(classification);
      setPhase("feedback");
      schedule(next, CONFIG.practiceFeedbackMs);
    } else {
      next();
    }
  }, [plan, clock, mode, schedule, onComplete]);

  // Cada dígito: se registra el frame en que se pinta y, desde ahí, la
  // máscara y el fin del ensayo.
  useLayoutEffect(() => {
    let cancelled = false;
    const local: ReturnType<typeof setTimeout>[] = [];
    clock.begin();
    clock.stampOnset(() => {
      if (cancelled) return;
      local.push(setTimeout(() => setPhase("mask"), CONFIG.digitVisibleMs));
      local.push(setTimeout(endTrial, CONFIG.digitVisibleMs + CONFIG.maskMs));
    });
    return () => {
      cancelled = true;
      local.forEach(clearTimeout);
    };
    // Un ensayo por índice; clock/endTrial/schedule son estables durante la ronda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const handleResponse = useCallback(
    (event: ResponseEvent<"press">) => {
      const onset = clock.onset();
      if (onset === null || event.at < onset) return; // aún no aparece el dígito
      if (!clock.claim()) return;
      responseRef.current = event;
    },
    [clock],
  );

  const { bind } = useResponseInput<"press">({
    enabled: phase !== "feedback",
    keys: { Space: "press" },
    onResponse: handleResponse,
  });

  const trial = plan[index];

  return (
    <div
      {...bind("press")}
      data-testid="focus-area"
      data-phase={phase}
      className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-6 px-4"
    >
      <div className="flex size-48 items-center justify-center rounded-3xl border border-border bg-muted/30 sm:size-56">
        {phase === "digit" && (
          <span
            data-testid="focus-digit"
            data-target={trial.isTarget}
            style={{ fontSize: `${trial.fontSizeRem}rem` }}
            className="font-heading leading-none font-bold tabular-nums"
          >
            {trial.digit}
          </span>
        )}
        {phase === "mask" && <Mask />}
        {phase === "feedback" && feedback && (
          <span
            data-testid="practice-feedback"
            className={cn(
              "animate-pop px-4 text-center font-heading text-lg font-semibold",
              FEEDBACK[feedback].good ? "text-primary" : "text-pulse",
            )}
          >
            {FEEDBACK[feedback].text}
          </span>
        )}
      </div>
      <p className="max-w-xs text-center text-sm text-muted-foreground">
        Toca, haz clic o presiona la barra espaciadora con cada número…{" "}
        <strong className="text-foreground">menos con el 3</strong>.
      </p>
      <RoundProgress current={index} total={plan.length} />
    </div>
  );
}

// Máscara del SART: un círculo con una cruz, del mismo tamaño en todos los
// ensayos.
function Mask() {
  return (
    <svg viewBox="0 0 100 100" className="size-24 text-muted-foreground/60" aria-hidden>
      <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="7" />
      <path d="M22 22 L78 78 M78 22 L22 78" stroke="currentColor" strokeWidth="7" />
    </svg>
  );
}
