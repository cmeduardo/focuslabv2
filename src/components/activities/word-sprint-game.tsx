"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { StreakBadge } from "@/components/activities/streak-badge";
import type { ActivityOutcome } from "@/hooks/use-activity-result";
import { playHit, playMiss } from "@/lib/audio/beep";
import {
  generateStroopTrial,
  STROOP_COLORS,
  type StroopTrial,
} from "@/lib/constants/stroop-colors";
import { cn } from "@/lib/utils";

const TOTAL_ROUNDS = 24;
const RESPONSE_WINDOW_MS = 1600;

function pointsFor(rt: number, streak: number) {
  const base = Math.max(20, 200 - rt / 8);
  const multiplier = 1 + Math.min(streak, 10) * 0.1;
  return Math.round(base * multiplier);
}

type Feedback = "correct" | "incorrect" | "timeout";

export function WordSprintGame({
  onFinish,
}: {
  onFinish: (outcome: ActivityOutcome) => void;
}) {
  const [round, setRound] = useState(0);
  const [trial, setTrial] = useState<StroopTrial>(() => generateStroopTrial());
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [barActive, setBarActive] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const shownAtRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const responseTimesRef = useRef<number[]>([]);
  const congruentTimesRef = useRef<number[]>([]);
  const incongruentTimesRef = useRef<number[]>([]);
  const congruentCorrectRef = useRef(0);
  const congruentTotalRef = useRef(0);
  const incongruentCorrectRef = useRef(0);
  const incongruentTotalRef = useRef(0);
  const postErrorTimesRef = useRef<number[]>([]);
  const postCorrectTimesRef = useRef<number[]>([]);
  const trialLogRef = useRef<
    {
      round: number;
      congruent: boolean;
      wordIndex: number;
      inkIndex: number;
      chosenIndex: number | null;
      correct: boolean;
      rt: number | null;
    }[]
  >([]);
  const wasLastErrorRef = useRef(false);
  const correctRef = useRef(0);
  const incorrectRef = useRef(0);
  const timeoutsRef = useRef(0);
  const scoreRef = useRef(0);
  const streakRef = useRef(0);
  const bestStreakRef = useRef(0);
  const finishedRef = useRef(false);

  const finishGame = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    const accuracy = Math.round((correctRef.current / TOTAL_ROUNDS) * 100);
    const avg = (arr: number[]) =>
      arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
    const pct = (n: number, total: number) =>
      total ? Math.round((n / total) * 100) : 0;
    // Costo de interferencia (incongruente − congruente) en la primera vs.
    // segunda mitad de la sesión — ¿el control cognitivo se degrada con la
    // fatiga, o se mantiene estable? Se calcula del propio trialLog en vez
    // de sumar otro ref paralelo.
    const half = Math.ceil(TOTAL_ROUNDS / 2);
    const interferenceFor = (trials: typeof trialLogRef.current) => {
      const withRt = trials.filter((t) => t.rt !== null);
      const congruentAvg = avg(
        withRt.filter((t) => t.congruent).map((t) => t.rt as number),
      );
      const incongruentAvg = avg(
        withRt.filter((t) => !t.congruent).map((t) => t.rt as number),
      );
      return incongruentAvg - congruentAvg;
    };
    const interferenceByHalf = [
      interferenceFor(trialLogRef.current.filter((t) => t.round < half)),
      interferenceFor(trialLogRef.current.filter((t) => t.round >= half)),
    ];
    onFinish({
      accuracy,
      levelReached: null,
      metrics: {
        total: TOTAL_ROUNDS,
        responseTimesMs: responseTimesRef.current,
        correctCount: correctRef.current,
        incorrectCount: incorrectRef.current,
        timeouts: timeoutsRef.current,
        congruentAvgMs: avg(congruentTimesRef.current),
        incongruentAvgMs: avg(incongruentTimesRef.current),
        congruentAccuracy: pct(congruentCorrectRef.current, congruentTotalRef.current),
        incongruentAccuracy: pct(
          incongruentCorrectRef.current,
          incongruentTotalRef.current,
        ),
        postErrorAvgMs: avg(postErrorTimesRef.current),
        postCorrectAvgMs: avg(postCorrectTimesRef.current),
        interferenceByHalf,
        trialLog: trialLogRef.current,
        score: scoreRef.current,
        bestStreak: bestStreakRef.current,
      },
    });
  }, [onFinish]);

  const nextRound = useCallback(() => {
    setFeedback(null);
    setBarActive(false);
    if (round + 1 >= TOTAL_ROUNDS) {
      finishGame();
    } else {
      setTrial(generateStroopTrial());
      setRound(round + 1);
    }
  }, [round, finishGame]);

  useEffect(() => {
    shownAtRef.current = performance.now();
    const raf = requestAnimationFrame(() => setBarActive(true));
    timerRef.current = setTimeout(() => {
      timeoutsRef.current += 1;
      trialLogRef.current.push({
        round,
        congruent: trial.congruent,
        wordIndex: trial.wordIndex,
        inkIndex: trial.inkIndex,
        chosenIndex: null,
        correct: false,
        rt: null,
      });
      wasLastErrorRef.current = true;
      streakRef.current = 0;
      setStreak(0);
      setFeedback("timeout");
      setTimeout(nextRound, 500);
    }, RESPONSE_WINDOW_MS);
    return () => {
      cancelAnimationFrame(raf);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  const handleAnswer = useCallback(
    (colorIndex: number) => {
      if (feedback || finishedRef.current) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      const rt = Math.round(performance.now() - shownAtRef.current);
      responseTimesRef.current.push(rt);
      (trial.congruent ? congruentTimesRef : incongruentTimesRef).current.push(rt);
      (wasLastErrorRef.current ? postErrorTimesRef : postCorrectTimesRef).current.push(
        rt,
      );
      const isCorrect = colorIndex === trial.inkIndex;
      if (trial.congruent) {
        congruentTotalRef.current += 1;
        if (isCorrect) congruentCorrectRef.current += 1;
      } else {
        incongruentTotalRef.current += 1;
        if (isCorrect) incongruentCorrectRef.current += 1;
      }
      trialLogRef.current.push({
        round,
        congruent: trial.congruent,
        wordIndex: trial.wordIndex,
        inkIndex: trial.inkIndex,
        chosenIndex: colorIndex,
        correct: isCorrect,
        rt,
      });
      wasLastErrorRef.current = !isCorrect;
      if (isCorrect) {
        correctRef.current += 1;
        streakRef.current += 1;
        bestStreakRef.current = Math.max(bestStreakRef.current, streakRef.current);
        scoreRef.current += pointsFor(rt, streakRef.current - 1);
        setScore(scoreRef.current);
        setStreak(streakRef.current);
        setFeedback("correct");
        playHit();
      } else {
        incorrectRef.current += 1;
        streakRef.current = 0;
        setStreak(0);
        setFeedback("incorrect");
        playMiss();
      }
      setTimeout(nextRound, 450);
    },
    [feedback, trial, round, nextRound],
  );

  const word = STROOP_COLORS[trial.wordIndex];
  const ink = STROOP_COLORS[trial.inkIndex];

  return (
    <div className="space-y-4 text-center">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Ronda {round + 1} de {TOTAL_ROUNDS}
        </span>
        <span className="flex items-center gap-2 font-heading font-semibold text-foreground">
          {score}
          <StreakBadge streak={streak} />
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{
            width: barActive ? "0%" : "100%",
            transition: barActive ? `width ${RESPONSE_WINDOW_MS}ms linear` : "none",
          }}
        />
      </div>
      <div
        className={cn(
          "flex h-40 items-center justify-center rounded-2xl border-2 bg-card font-heading text-5xl font-bold tracking-wide transition-colors",
          feedback === "correct" && "animate-pop border-primary",
          feedback === "incorrect" && "animate-shake border-destructive",
          !feedback && "border-border",
        )}
      >
        <span style={{ color: ink.hex }}>{word.name}</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Hacé clic en el <strong>color de la tinta</strong>, no en lo que dice
        la palabra.
      </p>
      <div className="grid grid-cols-4 gap-3">
        {STROOP_COLORS.map((color, i) => (
          <button
            key={color.name}
            type="button"
            onClick={() => handleAnswer(i)}
            disabled={!!feedback}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card px-2 py-3 transition-transform hover:-translate-y-0.5 disabled:opacity-50"
          >
            <span
              className="size-8 rounded-full"
              style={{ backgroundColor: color.hex }}
            />
            <span className="text-xs text-muted-foreground">{color.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
