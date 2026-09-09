"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { ActivityOutcome } from "@/hooks/use-activity-result";
import { WORD_SPRINT_ITEMS } from "@/lib/constants/word-sprint-words";
import { cn } from "@/lib/utils";

const RESPONSE_WINDOW_MS = 1800;

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

type Feedback = "correct" | "incorrect" | "timeout";

export function WordSprintGame({
  onFinish,
}: {
  onFinish: (outcome: ActivityOutcome) => void;
}) {
  const [items] = useState(() => shuffle(WORD_SPRINT_ITEMS));
  const total = items.length;
  const [round, setRound] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const shownAtRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const responseTimesRef = useRef<number[]>([]);
  const correctRef = useRef(0);
  const incorrectRef = useRef(0);
  const timeoutsRef = useRef(0);
  const finishedRef = useRef(false);

  const current = items[round];

  const finishGame = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    const accuracy = Math.round((correctRef.current / total) * 100);
    onFinish({
      accuracy,
      levelReached: null,
      metrics: {
        total,
        responseTimesMs: responseTimesRef.current,
        correctCount: correctRef.current,
        incorrectCount: incorrectRef.current,
        timeouts: timeoutsRef.current,
      },
    });
  }, [onFinish, total]);

  const nextRound = useCallback(() => {
    setFeedback(null);
    if (round + 1 >= total) {
      finishGame();
    } else {
      setRound(round + 1);
    }
  }, [round, total, finishGame]);

  useEffect(() => {
    shownAtRef.current = performance.now();
    timerRef.current = setTimeout(() => {
      timeoutsRef.current += 1;
      setFeedback("timeout");
      setTimeout(nextRound, 600);
    }, RESPONSE_WINDOW_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  function handleAnswer(answerIsReal: boolean) {
    if (feedback || finishedRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    const rt = Math.round(performance.now() - shownAtRef.current);
    responseTimesRef.current.push(rt);
    const isCorrect = answerIsReal === current.isReal;
    if (isCorrect) {
      correctRef.current += 1;
      setFeedback("correct");
    } else {
      incorrectRef.current += 1;
      setFeedback("incorrect");
    }
    setTimeout(nextRound, 500);
  }

  return (
    <div className="space-y-6 text-center">
      <p className="text-sm text-muted-foreground">
        Palabra {round + 1} de {total}
      </p>
      <div
        className={cn(
          "flex h-40 items-center justify-center rounded-2xl border-2 font-heading text-4xl font-semibold tracking-wide transition-colors",
          feedback === "correct" &&
            "border-primary bg-primary/10 text-primary",
          feedback === "incorrect" &&
            "border-destructive bg-destructive/10 text-destructive",
          feedback === "timeout" &&
            "border-border bg-muted/40 text-muted-foreground",
          !feedback && "border-border bg-card",
        )}
      >
        {current.word}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => handleAnswer(true)}
          disabled={!!feedback}
          className="rounded-xl border border-border bg-secondary px-4 py-3 font-medium text-secondary-foreground transition-colors hover:bg-secondary/70 disabled:opacity-50"
        >
          Es real
        </button>
        <button
          type="button"
          onClick={() => handleAnswer(false)}
          disabled={!!feedback}
          className="rounded-xl border border-border bg-accent px-4 py-3 font-medium text-accent-foreground transition-colors hover:bg-accent/70 disabled:opacity-50"
        >
          Inventada
        </button>
      </div>
    </div>
  );
}
