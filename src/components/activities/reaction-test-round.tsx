"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import type { RoundProps } from "@/components/activities/activity-shell";
import { RoundProgress } from "@/components/activities/round-progress";
import { useResponseInput, type ResponseEvent } from "@/hooks/use-response-input";
import { useTrialClock } from "@/hooks/use-trial-clock";
import { REACTION_TEST_CONFIG as CONFIG } from "@/lib/activities/config";
import {
  classifyReaction,
  planReactionTrials,
  type ReactionClassification,
} from "@/lib/activities/reaction-test/trials";
import type { TrialRecord } from "@/lib/activities/types";
import { playHit, playMiss, playTap } from "@/lib/audio/beep";
import { cn } from "@/lib/utils";

type Phase = "wait" | "stimulus" | "between";

type Feedback = { kind: ReactionClassification | "early"; rtMs: number | null };

const FEEDBACK_TEXT: Record<Feedback["kind"], string> = {
  valid: "¡Bien!",
  lapse: "Un poco tarde. ¡Toca en cuanto aparezca!",
  anticipation: "¡Muy pronto! Espera a ver el círculo.",
  early: "¡Muy pronto! Espera a ver el círculo.",
};

// Reaction Test (PVT): tras una espera aleatoria aparece un círculo; hay que
// responder lo más rápido posible. Toda el área es zona de respuesta
// (mouse, toque o barra espaciadora).
export function ReactionTestRound({ mode, origin, onComplete }: RoundProps) {
  const [plan] = useState(() => planReactionTrials(CONFIG, mode, Math.random));
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("wait");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  // Confirmación neutra de cada respuesta (también en la ronda que cuenta).
  const [ack, setAck] = useState(0);

  const clock = useTrialClock(origin);
  const phaseRef = useRef<Phase>("wait");
  const indexRef = useRef(0);
  const trialsRef = useRef<TrialRecord[]>([]);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const doneRef = useRef(false);

  const schedule = useCallback((fn: () => void, ms: number) => {
    timersRef.current.push(setTimeout(fn, ms));
  }, []);
  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const finishTrial = useCallback(
    (
      outcome:
        | { type: "early"; event: ResponseEvent<"press"> }
        | { type: "response"; event: ResponseEvent<"press">; rtMs: number }
        | { type: "timeout" },
    ) => {
      clearTimers();
      const i = indexRef.current;
      const onset = clock.onset();
      const classification: ReactionClassification =
        outcome.type === "early"
          ? "anticipation"
          : outcome.type === "timeout"
            ? "lapse"
            : classifyReaction(outcome.rtMs, CONFIG);
      const hidden = clock.wasHidden();
      trialsRef.current.push({
        trialIndex: i,
        condition: { isiMs: plan[i].isiMs },
        stimulusOnsetMs: outcome.type === "early" ? null : clock.relative(onset),
        responseAtMs: outcome.type === "timeout" ? null : clock.relative(outcome.event.at),
        rtMs: outcome.type === "response" ? Math.round(outcome.rtMs * 100) / 100 : null,
        response: outcome.type === "timeout" ? null : outcome.type === "early" ? "early" : "press",
        correct: classification === "valid",
        classification,
        inputType: outcome.type === "timeout" ? null : outcome.event.input,
        valid: !hidden,
        invalidReason: hidden ? "visibility" : null,
      });

      phaseRef.current = "between";
      setPhase("between");
      if (outcome.type !== "timeout") setAck((n) => n + 1);
      if (mode === "practice") {
        if (classification === "valid") playHit();
        else playMiss();
      } else if (outcome.type !== "timeout") {
        playTap();
      }
      if (mode === "practice") {
        setFeedback({
          kind: outcome.type === "early" ? "early" : classification,
          rtMs: outcome.type === "response" ? Math.round(outcome.rtMs) : null,
        });
      }

      const isLast = i + 1 >= plan.length;
      schedule(
        () => {
          if (isLast) {
            if (!doneRef.current) {
              doneRef.current = true;
              onComplete(trialsRef.current);
            }
            return;
          }
          indexRef.current = i + 1;
          phaseRef.current = "wait";
          setFeedback(null);
          setPhase("wait");
          setIndex(i + 1);
        },
        mode === "practice" ? CONFIG.practiceFeedbackMs : CONFIG.interTrialMs,
      );
    },
    [clearTimers, clock, plan, mode, schedule, onComplete],
  );

  // Espera aleatoria de cada ensayo; el estímulo aparece al cumplirse.
  useEffect(() => {
    clock.begin();
    const timer = setTimeout(() => {
      phaseRef.current = "stimulus";
      setPhase("stimulus");
    }, plan[index].isiMs);
    return () => clearTimeout(timer);
    // clock es estable; solo cambia el ensayo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, plan]);

  // El estímulo ya está en el DOM: registrar el frame en que se pinta y,
  // desde ese instante, abrir la ventana de respuesta.
  useLayoutEffect(() => {
    if (phase !== "stimulus") return;
    let cancelled = false;
    clock.stampOnset(() => {
      if (cancelled) return;
      schedule(() => {
        if (phaseRef.current === "stimulus" && clock.claim()) {
          finishTrial({ type: "timeout" });
        }
      }, CONFIG.responseWindowMs);
    });
    return () => {
      cancelled = true;
    };
  }, [phase, clock, schedule, finishTrial]);

  const handleResponse = useCallback(
    (event: ResponseEvent<"press">) => {
      if (phaseRef.current === "between") return;
      if (!clock.claim()) return; // respuesta duplicada del mismo ensayo
      const onset = clock.onset();
      if (phaseRef.current === "wait" || onset === null || event.at < onset) {
        finishTrial({ type: "early", event });
        return;
      }
      finishTrial({ type: "response", event, rtMs: event.at - onset });
    },
    [clock, finishTrial],
  );

  const { bind } = useResponseInput<"press">({
    enabled: true,
    keys: { Space: "press" },
    onResponse: handleResponse,
  });

  return (
    <div
      {...bind("press")}
      data-testid="reaction-area"
      data-phase={phase}
      className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-6 px-4"
    >
      <div className="relative flex size-56 items-center justify-center sm:size-64">
        <span
          className={cn(
            "absolute inset-0 rounded-full border-4 border-dashed border-border",
            phase === "wait" && "animate-[spin_12s_linear_infinite]",
          )}
        />
        {ack > 0 && (
          <span
            key={ack}
            aria-hidden
            className="pointer-events-none absolute inset-0 animate-tap-flash rounded-full bg-primary/25"
          />
        )}
        {phase === "stimulus" && (
          <span
            data-testid="reaction-stimulus"
            className="size-40 rounded-full bg-primary shadow-[0_0_60px_10px] shadow-primary/40 sm:size-48"
          />
        )}
        {phase === "wait" && (
          <span className="text-center text-muted-foreground">Espera la señal…</span>
        )}
        {phase === "between" && feedback && (
          <span
            data-testid="practice-feedback"
            className={cn(
              "animate-pop px-4 text-center font-heading text-xl font-semibold",
              feedback.kind === "valid" ? "text-primary" : "text-pulse",
            )}
          >
            {FEEDBACK_TEXT[feedback.kind]}
            {feedback.rtMs !== null && (
              <span className="mt-1 block text-base font-normal text-muted-foreground">
                {feedback.rtMs} ms
              </span>
            )}
          </span>
        )}
      </div>
      <p className="max-w-xs text-center text-sm text-muted-foreground">
        Toca la pantalla, haz clic o presiona la barra espaciadora en cuanto
        aparezca el círculo.
      </p>
      <RoundProgress
        current={index + (phase === "between" ? 1 : 0)}
        total={plan.length}
        label={`${index + 1} de ${plan.length}`}
      />
    </div>
  );
}
