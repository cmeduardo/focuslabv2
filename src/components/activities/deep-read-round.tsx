"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Bell, X } from "lucide-react";

import type { RoundProps } from "@/components/activities/activity-shell";
import { RoundProgress } from "@/components/activities/round-progress";
import { Button } from "@/components/ui/button";
import { useResponseInput, type ResponseEvent } from "@/hooks/use-response-input";
import { useTrialClock } from "@/hooks/use-trial-clock";
import { DEEP_READ_CONFIG as CONFIG } from "@/lib/activities/config";
import {
  countWords,
  DEEP_READ_NOTIFICATIONS,
  DEEP_READ_PASSAGE,
  DEEP_READ_PRACTICE,
} from "@/lib/activities/deep-read/content";
import type { NotificationOutcome } from "@/lib/activities/deep-read/metrics";
import { shuffle } from "@/lib/activities/rng";
import type { TrialRecord } from "@/lib/activities/types";
import { playHit, playMiss, playSelect, playTap } from "@/lib/audio/beep";
import { cn } from "@/lib/utils";

type Stage = "reading" | "question" | "feedback";

type NotificationLog = {
  id: string;
  shownAt: number;
  outcome: NotificationOutcome;
  respondedAt: number | null;
};

// Deep Read: lectura de un texto con notificaciones simuladas dentro de la
// app (se pueden cerrar, abrir o ignorar) y luego preguntas de opción
// múltiple, una por pantalla, sin volver al texto.
export function DeepReadRound({ mode, origin, onComplete }: RoundProps) {
  const passage = mode === "practice" ? DEEP_READ_PRACTICE : DEEP_READ_PASSAGE;
  const [questions] = useState(() =>
    passage.questions.map((q) => ({ ...q, options: shuffle(q.options, Math.random) })),
  );
  const [stage, setStage] = useState<Stage>("reading");
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [visibleNotification, setVisibleNotification] = useState<string | null>(null);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);

  const clock = useTrialClock(origin);
  const readingStartRef = useRef<number | null>(null);
  const notificationsRef = useRef<NotificationLog[]>([]);
  const visibilityExitsRef = useRef(0);
  const answerChangesRef = useRef(0);
  const firstChoiceAtRef = useRef<number | null>(null);
  const trialsRef = useRef<TrialRecord[]>([]);
  const doneRef = useRef(false);
  const readingDoneRef = useRef(false);

  const relative = clock.relative;

  // --- Lectura -------------------------------------------------------
  useLayoutEffect(() => {
    clock.begin();
    clock.stampOnset((ts) => {
      readingStartRef.current = ts;
    });
  }, [clock]);

  const resolveNotification = useCallback((id: string, outcome: NotificationOutcome) => {
    const log = notificationsRef.current.find((n) => n.id === id);
    if (!log || log.outcome !== "pending") return;
    log.outcome = outcome;
    log.respondedAt = outcome === "ignored" ? null : performance.now();
    setVisibleNotification((current) => (current === id ? null : current));
  }, []);

  const finishReading = useCallback(
    (how: "done" | "capped", event?: ResponseEvent<"done">) => {
      if (readingDoneRef.current) return;
      readingDoneRef.current = true;
      const end = event?.at ?? performance.now();
      const start = readingStartRef.current ?? clock.onset() ?? end;
      // Una notificación aún visible al terminar queda "pendiente".
      setVisibleNotification(null);
      trialsRef.current.push({
        trialIndex: 0,
        condition: { kind: "reading", passageId: passage.id, words: countWords(passage) },
        stimulusOnsetMs: relative(start),
        responseAtMs: relative(end),
        rtMs: Math.round((end - start) * 100) / 100,
        response: how,
        detail: {
          visibilityExits: visibilityExitsRef.current,
          notifications: notificationsRef.current.map((n) => ({
            id: n.id,
            shownAtMs: Math.round(n.shownAt - start),
            outcome: n.outcome,
            reactionMs: n.respondedAt === null ? null : Math.round(n.respondedAt - n.shownAt),
          })),
        },
        correct: null,
        classification: "reading",
        inputType: event?.input ?? null,
        // La lectura con salidas de pestaña NO se invalida: esas salidas
        // son justamente parte de lo que se mide aquí (visibilityExits).
        valid: true,
        invalidReason: null,
      });
      if (how === "done") playTap();
      setStage("question");
    },
    [clock, passage, relative],
  );

  useEffect(() => {
    if (stage !== "reading") return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const schedule = mode === "practice" ? CONFIG.practiceNotificationAtMs : CONFIG.notificationAtMs;
    schedule.forEach((at, i) => {
      const notification = DEEP_READ_NOTIFICATIONS[i % DEEP_READ_NOTIFICATIONS.length];
      timers.push(
        setTimeout(() => {
          if (readingDoneRef.current) return;
          notificationsRef.current.push({
            id: notification.id,
            shownAt: performance.now(),
            outcome: "pending",
            respondedAt: null,
          });
          setVisibleNotification(notification.id);
          timers.push(
            setTimeout(
              () => resolveNotification(notification.id, "ignored"),
              CONFIG.notificationVisibleMs,
            ),
          );
        }, at),
      );
    });
    timers.push(setTimeout(() => finishReading("capped"), CONFIG.readingCapMs));

    const onVisibility = () => {
      if (document.visibilityState === "hidden") visibilityExitsRef.current += 1;
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      timers.forEach(clearTimeout);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [stage, mode, resolveNotification, finishReading]);

  // --- Preguntas -----------------------------------------------------
  useLayoutEffect(() => {
    if (stage !== "question") return;
    clock.begin();
    clock.stampOnset();
    answerChangesRef.current = 0;
    firstChoiceAtRef.current = null;
  }, [stage, qIndex, clock]);

  const question = questions[qIndex];

  const confirm = useCallback(
    (event: ResponseEvent<"confirm">) => {
      if (stage !== "question" || selected === null) return;
      if (!clock.claim()) return;
      const onset = clock.onset();
      const correct = selected === question.correctId;
      const hidden = clock.wasHidden();
      trialsRef.current.push({
        trialIndex: qIndex + 1,
        condition: {
          kind: "question",
          questionId: question.id,
          type: question.type,
          optionOrder: question.options.map((o) => o.id),
        },
        stimulusOnsetMs: relative(onset),
        responseAtMs: relative(event.at),
        rtMs: onset === null ? null : Math.round((event.at - onset) * 100) / 100,
        response: selected,
        detail: {
          answerChanges: answerChangesRef.current,
          firstChoiceMs:
            onset === null || firstChoiceAtRef.current === null
              ? null
              : Math.round(firstChoiceAtRef.current - onset),
        },
        correct,
        classification: correct ? "correct" : "incorrect",
        inputType: event.input,
        valid: !hidden,
        invalidReason: hidden ? "visibility" : null,
      });

      const advance = () => {
        if (qIndex + 1 >= questions.length) {
          if (!doneRef.current) {
            doneRef.current = true;
            onComplete(trialsRef.current);
          }
          return;
        }
        setSelected(null);
        setLastCorrect(null);
        setQIndex((i) => i + 1);
        setStage("question");
      };

      if (mode === "practice") {
        if (correct) playHit();
        else playMiss();
        setLastCorrect(correct);
        setStage("feedback");
        setTimeout(advance, CONFIG.practiceFeedbackMs);
      } else {
        playTap();
        advance();
      }
    },
    [stage, selected, clock, question, qIndex, questions.length, relative, mode, onComplete],
  );

  const choose = useCallback(
    (event: ResponseEvent<string>) => {
      if (stage !== "question") return;
      if (firstChoiceAtRef.current === null) firstChoiceAtRef.current = event.at;
      if (selected !== null && selected !== event.value) answerChangesRef.current += 1;
      if (selected !== event.value) playSelect();
      setSelected(event.value);
    },
    [stage, selected],
  );

  const { bind: bindDone } = useResponseInput<"done">({
    enabled: stage === "reading",
    trigger: "click",
    keys: {},
    onResponse: (e) => finishReading("done", e),
  });
  const { bind: bindOption } = useResponseInput<string>({
    enabled: stage === "question",
    trigger: "click",
    keys: {},
    onResponse: choose,
  });
  const { bind: bindConfirm } = useResponseInput<"confirm">({
    enabled: stage === "question" && selected !== null,
    trigger: "click",
    keys: {},
    onResponse: confirm,
  });

  const notification = DEEP_READ_NOTIFICATIONS.find((n) => n.id === visibleNotification);

  if (stage === "reading") {
    return (
      <div className="relative h-full">
        {notification && (
          <div
            data-testid="sim-notification"
            role="status"
            className="absolute inset-x-3 top-3 z-10 mx-auto flex max-w-md animate-pop items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-xl ring-1 ring-foreground/10"
          >
            <button
              type="button"
              data-testid="sim-notification-open"
              onClick={() => resolveNotification(notification.id, "opened")}
              className="flex min-h-12 min-w-0 flex-1 items-center gap-3 text-left"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
                <Bell className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-xs text-muted-foreground">{notification.app}</span>
                <span className="block truncate text-sm font-medium">{notification.text}</span>
              </span>
            </button>
            <button
              type="button"
              aria-label="Cerrar notificación"
              data-testid="sim-notification-close"
              onClick={() => resolveNotification(notification.id, "closed")}
              className="flex size-12 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
            >
              <X className="size-5" />
            </button>
          </div>
        )}
        <article
          data-testid="deep-read-text"
          className="h-full overflow-y-auto overscroll-contain px-4 py-6 sm:px-6"
        >
          <div className="mx-auto max-w-prose">
            <h2 className="font-heading text-2xl font-semibold">{passage.title}</h2>
            {passage.paragraphs.map((p, i) => (
              <p key={i} className="mt-4 text-base leading-relaxed sm:text-[17px]">
                {p}
              </p>
            ))}
            <Button
              size="lg"
              data-testid="deep-read-done"
              className="mt-8 mb-4 h-12 w-full text-base"
              {...bindDone("done")}
            >
              Terminé de leer
            </Button>
          </div>
        </article>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto px-4 py-5">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4">
        <RoundProgress
          current={qIndex}
          total={questions.length}
          label={`Pregunta ${qIndex + 1} de ${questions.length}`}
        />
        <h2 data-testid="deep-read-question" className="font-heading text-lg font-semibold">
          {question.question}
        </h2>
        <div className="flex flex-col gap-2" role="radiogroup">
          {question.options.map((option) => {
            const isSelected = selected === option.id;
            const reveal = stage === "feedback";
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                data-testid={`deep-read-option-${option.id}`}
                disabled={stage !== "question"}
                {...bindOption(option.id)}
                className={cn(
                  "min-h-14 rounded-2xl border-2 border-border bg-card px-4 py-3 text-left text-[15px] transition-colors",
                  isSelected && "border-primary bg-secondary",
                  reveal && option.id === question.correctId && "border-primary",
                )}
              >
                {option.text}
              </button>
            );
          })}
        </div>
        {stage === "feedback" ? (
          <p
            data-testid="practice-feedback"
            className={cn(
              "animate-pop text-center font-heading font-semibold",
              lastCorrect ? "text-primary" : "text-pulse",
            )}
          >
            {lastCorrect
              ? "¡Bien!"
              : `La respuesta estaba en el texto: “${question.options.find((o) => o.id === question.correctId)?.text}”`}
          </p>
        ) : (
          <Button
            size="lg"
            data-testid="deep-read-confirm"
            className="mt-auto h-12 w-full text-base"
            disabled={selected === null}
            {...bindConfirm("confirm")}
          >
            Confirmar
          </Button>
        )}
      </div>
    </div>
  );
}
