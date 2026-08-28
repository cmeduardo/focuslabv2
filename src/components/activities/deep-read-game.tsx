"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { StreakBadge } from "@/components/activities/streak-badge";
import type { ActivityOutcome } from "@/hooks/use-activity-result";
import { playCombo, playHit, playMiss } from "@/lib/audio/beep";
import { pickRandomPassages } from "@/lib/constants/deep-read-passages";
import { cn } from "@/lib/utils";

const PASSAGE_COUNT = 3;
// Comprensión lectora "bajo tiempo limitado" (constructo original de la
// tesis, sin implementar hasta ahora): tope de lectura por párrafo y de
// respuesta por pregunta — si se acaba, avanza solo y cuenta como no
// respondida.
const READING_TIME_MS = 45_000;
const QUESTION_TIME_MS = 20_000;

type Stage = "reading" | "question";

export function DeepReadGame({
  onFinish,
}: {
  onFinish: (outcome: ActivityOutcome) => void;
}) {
  const [passages] = useState(() => pickRandomPassages(PASSAGE_COUNT));
  const [passageIndex, setPassageIndex] = useState(0);
  const [stage, setStage] = useState<Stage>("reading");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [showPassage, setShowPassage] = useState(false);
  const [notificationVisible, setNotificationVisible] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [readingBarActive, setReadingBarActive] = useState(false);
  const [questionBarActive, setQuestionBarActive] = useState(false);
  const scoreRef = useRef(0);
  const streakRef = useRef(0);
  const bestStreakRef = useRef(0);
  const readingStartRef = useRef(0);
  const readingTimesRef = useRef<number[]>([]);
  const readingTimeoutsRef = useRef(0);
  const questionTimeoutsRef = useRef(0);
  const questionShownAtRef = useRef(0);
  const questionTimesRef = useRef<number[]>([]);
  const firstSelectedAtRef = useRef<number | null>(null);
  const firstPickLatencyMsRef = useRef<(number | null)[]>([]);
  const wasCorrectSelectedRef = useRef(false);
  const movedAwayFromCorrectRef = useRef<boolean[]>([]);
  const changesThisQuestionRef = useRef(0);
  const answerChangesRef = useRef<number[]>([]);
  const answersCorrectRef = useRef<boolean[]>([]);
  const literalCorrectRef = useRef(0);
  const literalTotalRef = useRef(0);
  const inferenceCorrectRef = useRef(0);
  const inferenceTotalRef = useRef(0);
  const rereadCountRef = useRef(0);
  const rereadTimeRef = useRef(0);
  const rereadOpenedAtRef = useRef(0);
  const distractionsShownRef = useRef(0);
  const distractionsClickedRef = useRef(0);
  const notificationActiveRef = useRef(false);
  const notificationTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const finishedRef = useRef(false);

  const passage = passages[passageIndex];
  const question = passage.questions[questionIndex];

  // Marca el inicio de lectura del primer párrafo (ref, no estado) al montar.
  useEffect(() => {
    readingStartRef.current = performance.now();
  }, []);

  // Durante la lectura (no durante las preguntas), muestra una notificación
  // que hay que ignorar — mide resistencia a la distracción. El setState
  // real ocurre dentro de los setTimeout, nunca de forma síncrona acá.
  useEffect(() => {
    if (stage !== "reading") return;
    const showDelay = 2000 + Math.random() * 4000;
    const showTimer = setTimeout(() => {
      distractionsShownRef.current += 1;
      notificationActiveRef.current = true;
      setNotificationVisible(true);
      const hideTimer = setTimeout(() => {
        notificationActiveRef.current = false;
        setNotificationVisible(false);
      }, 2200);
      notificationTimersRef.current.push(hideTimer);
    }, showDelay);
    notificationTimersRef.current.push(showTimer);
    return () => {
      notificationTimersRef.current.forEach(clearTimeout);
      notificationTimersRef.current = [];
    };
  }, [stage, passageIndex]);

  // Tope de tiempo de lectura: si se acaba, avanza solo a las preguntas
  // (el tiempo real ya quedó en readingTimesMs, esto solo pone un techo).
  useEffect(() => {
    if (stage !== "reading") return;
    const raf = requestAnimationFrame(() => setReadingBarActive(true));
    const timer = setTimeout(() => {
      readingTimeoutsRef.current += 1;
      handleContinueToQuestions();
    }, READING_TIME_MS);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [stage, passageIndex]);

  // Tope de tiempo por pregunta: corre durante toda la pregunta (incluso
  // si el participante vuelve a leer el párrafo, eso también gasta el
  // tiempo) y se cancela apenas confirma una respuesta.
  useEffect(() => {
    if (stage !== "question" || confirmed) return;
    const raf = requestAnimationFrame(() => setQuestionBarActive(true));
    const timer = setTimeout(() => {
      questionTimeoutsRef.current += 1;
      handleTimeout();
    }, QUESTION_TIME_MS);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, questionIndex, passageIndex, confirmed]);

  function handleNotificationClick() {
    if (!notificationActiveRef.current) return;
    notificationActiveRef.current = false;
    distractionsClickedRef.current += 1;
    setNotificationVisible(false);
    playMiss();
  }

  const finishGame = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const correctCount = answersCorrectRef.current.filter(Boolean).length;
    const totalQuestions = answersCorrectRef.current.length;
    const accuracy = totalQuestions
      ? Math.round((correctCount / totalQuestions) * 100)
      : 0;
    const literalAccuracy = literalTotalRef.current
      ? Math.round((literalCorrectRef.current / literalTotalRef.current) * 100)
      : 0;
    const inferenceAccuracy = inferenceTotalRef.current
      ? Math.round(
          (inferenceCorrectRef.current / inferenceTotalRef.current) * 100,
        )
      : 0;
    // Velocidad de lectura por párrafo (palabras/minuto) — junto con
    // rereadCount, permite distinguir a alguien que lee rápido y bien de
    // alguien que lee rápido pero necesita volver atrás.
    const readingWpm = readingTimesRef.current.map((ms, i) => {
      const words = passages[i]?.text.trim().split(/\s+/).length ?? 0;
      const minutes = ms / 60000;
      return minutes > 0 ? Math.round(words / minutes) : 0;
    });
    // Tiempo de lectura vs. efectividad, por párrafo: leer rápido no vale
    // nada si después no se responde bien — cruza readingTimesMs/wpm
    // contra la precisión de las 3 preguntas de ESE párrafo específico.
    const questionsPerPassage = passages[0]?.questions.length ?? 3;
    const readingTimeVsAccuracy = readingTimesRef.current.map((ms, i) => {
      const passageAnswers = answersCorrectRef.current.slice(
        i * questionsPerPassage,
        i * questionsPerPassage + questionsPerPassage,
      );
      const passageCorrect = passageAnswers.filter(Boolean).length;
      return {
        passageIndex: i,
        readingTimeMs: ms,
        wpm: readingWpm[i] ?? 0,
        correctCount: passageCorrect,
        totalQuestions: passageAnswers.length,
        accuracyPct: passageAnswers.length
          ? Math.round((passageCorrect / passageAnswers.length) * 100)
          : 0,
      };
    });
    onFinish({
      accuracy,
      levelReached: null,
      metrics: {
        correctCount,
        totalQuestions,
        readingTimesMs: readingTimesRef.current,
        readingWpm,
        readingTimeVsAccuracy,
        questionTimesMs: questionTimesRef.current,
        firstPickLatencyMs: firstPickLatencyMsRef.current,
        movedAwayFromCorrect: movedAwayFromCorrectRef.current,
        answerChanges: answerChangesRef.current,
        answersCorrect: answersCorrectRef.current,
        literalAccuracy,
        inferenceAccuracy,
        rereadCount: rereadCountRef.current,
        rereadTimeMs: Math.round(rereadTimeRef.current),
        distractionsShown: distractionsShownRef.current,
        distractionsClicked: distractionsClickedRef.current,
        readingTimeouts: readingTimeoutsRef.current,
        questionTimeouts: questionTimeoutsRef.current,
        score: scoreRef.current,
        bestStreak: bestStreakRef.current,
      },
    });
  }, [onFinish, passages]);

  function goToNext() {
    if (questionIndex + 1 < passage.questions.length) {
      questionShownAtRef.current = performance.now();
      firstSelectedAtRef.current = null;
      wasCorrectSelectedRef.current = false;
      setQuestionIndex((q) => q + 1);
      setSelected(null);
      setConfirmed(false);
      setQuestionBarActive(false);
    } else if (passageIndex + 1 < passages.length) {
      readingStartRef.current = performance.now();
      setPassageIndex((p) => p + 1);
      setStage("reading");
      setReadingBarActive(false);
    } else {
      finishGame();
    }
  }

  function handleContinueToQuestions() {
    readingTimesRef.current.push(
      Math.round(performance.now() - readingStartRef.current),
    );
    questionShownAtRef.current = performance.now();
    firstSelectedAtRef.current = null;
    wasCorrectSelectedRef.current = false;
    setStage("question");
    setQuestionIndex(0);
    setSelected(null);
    setConfirmed(false);
    setQuestionBarActive(false);
  }

  function handleToggleReread() {
    if (showPassage) {
      rereadTimeRef.current += performance.now() - rereadOpenedAtRef.current;
      setShowPassage(false);
    } else {
      rereadCountRef.current += 1;
      rereadOpenedAtRef.current = performance.now();
      setShowPassage(true);
    }
  }

  function handleSelectOption(optionIndex: number) {
    if (confirmed || finishedRef.current) return;
    if (firstSelectedAtRef.current === null) {
      firstSelectedAtRef.current = performance.now();
    }
    if (optionIndex === question.correctIndex) {
      wasCorrectSelectedRef.current = true;
    }
    if (selected !== null && selected !== optionIndex) {
      changesThisQuestionRef.current += 1;
    }
    setSelected(optionIndex);
  }

  function handleConfirm() {
    if (selected === null || confirmed || finishedRef.current) return;
    setConfirmed(true);
    const isCorrect = selected === question.correctIndex;
    answersCorrectRef.current.push(isCorrect);
    if (question.type === "literal") {
      literalTotalRef.current += 1;
      if (isCorrect) literalCorrectRef.current += 1;
    } else {
      inferenceTotalRef.current += 1;
      if (isCorrect) inferenceCorrectRef.current += 1;
    }
    const elapsed = Math.round(performance.now() - questionShownAtRef.current);
    questionTimesRef.current.push(elapsed);
    firstPickLatencyMsRef.current.push(
      firstSelectedAtRef.current !== null
        ? Math.round(firstSelectedAtRef.current - questionShownAtRef.current)
        : null,
    );
    movedAwayFromCorrectRef.current.push(
      wasCorrectSelectedRef.current && selected !== question.correctIndex,
    );
    answerChangesRef.current.push(changesThisQuestionRef.current);
    changesThisQuestionRef.current = 0;

    if (isCorrect) {
      streakRef.current += 1;
      bestStreakRef.current = Math.max(bestStreakRef.current, streakRef.current);
      const speedBonus = elapsed < QUESTION_TIME_MS / 2 ? 30 : 0;
      scoreRef.current += 100 + streakRef.current * 15 + speedBonus;
      setScore(scoreRef.current);
      setStreak(streakRef.current);
      if (streakRef.current > 0 && streakRef.current % 3 === 0) playCombo();
      playHit();
    } else {
      streakRef.current = 0;
      setStreak(0);
      playMiss();
    }

    setTimeout(goToNext, 700);
  }

  // Se acabó el tiempo de la pregunta: cuenta como no respondida y avanza
  // sola, igual que un fallo (corta la racha, no suma puntaje).
  function handleTimeout() {
    if (confirmed || finishedRef.current) return;
    setConfirmed(true);
    answersCorrectRef.current.push(false);
    if (question.type === "literal") {
      literalTotalRef.current += 1;
    } else {
      inferenceTotalRef.current += 1;
    }
    questionTimesRef.current.push(
      Math.round(performance.now() - questionShownAtRef.current),
    );
    firstPickLatencyMsRef.current.push(
      firstSelectedAtRef.current !== null
        ? Math.round(firstSelectedAtRef.current - questionShownAtRef.current)
        : null,
    );
    movedAwayFromCorrectRef.current.push(
      wasCorrectSelectedRef.current && selected !== question.correctIndex,
    );
    answerChangesRef.current.push(changesThisQuestionRef.current);
    changesThisQuestionRef.current = 0;
    streakRef.current = 0;
    setStreak(0);
    playMiss();
    setTimeout(goToNext, 700);
  }

  if (stage === "reading") {
    return (
      <div className="relative space-y-4">
        {notificationVisible && (
          <button
            type="button"
            onClick={handleNotificationClick}
            className="absolute -top-2 right-0 z-10 flex items-center gap-2 rounded-full border border-pulse/40 bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-lg"
          >
            <span className="size-2 rounded-full bg-pulse" />
            Nuevo mensaje
          </button>
        )}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Párrafo {passageIndex + 1} de {passages.length}
          </span>
          <span className="flex items-center gap-2 font-heading font-semibold text-foreground">
            {score} pts
            <StreakBadge streak={streak} />
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary"
            style={{
              width: readingBarActive ? "0%" : "100%",
              transition: readingBarActive
                ? `width ${READING_TIME_MS}ms linear`
                : "none",
            }}
          />
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-2 font-heading font-semibold">{passage.title}</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {passage.text}
          </p>
        </div>
        <button
          type="button"
          onClick={handleContinueToQuestions}
          className="w-full rounded-xl bg-primary px-4 py-2.5 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Continuar a las preguntas
        </button>
      </div>
    );
  }

  if (showPassage) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Releyendo: {passage.title}
        </p>
        <div className="rounded-2xl border border-dashed border-border bg-card p-5">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {passage.text}
          </p>
        </div>
        <button
          type="button"
          onClick={handleToggleReread}
          className="w-full rounded-xl border border-border bg-secondary px-4 py-2.5 font-medium text-secondary-foreground transition-colors hover:bg-secondary/70"
        >
          Volver a la pregunta
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Pregunta {questionIndex + 1} de {passage.questions.length} —{" "}
          {passage.title}
        </span>
        <span className="flex items-center gap-2 font-heading font-semibold text-foreground">
          {score} pts
          <StreakBadge streak={streak} />
        </span>
      </div>
      {!confirmed && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-pulse"
            style={{
              width: questionBarActive ? "0%" : "100%",
              transition: questionBarActive
                ? `width ${QUESTION_TIME_MS}ms linear`
                : "none",
            }}
          />
        </div>
      )}
      {!confirmed && (
        <button
          type="button"
          onClick={handleToggleReread}
          className="text-xs font-medium text-primary hover:underline"
        >
          ← Volver a leer el párrafo
        </button>
      )}
      <p className="font-heading text-lg font-medium">{question.question}</p>
      <div className="space-y-2">
        {question.options.map((option, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleSelectOption(i)}
            disabled={confirmed}
            className={cn(
              "w-full rounded-xl border border-border bg-card px-4 py-2.5 text-left transition-colors disabled:cursor-not-allowed",
              !confirmed && selected !== i && "hover:bg-muted/50",
              !confirmed && selected === i && "border-primary bg-primary/5",
              confirmed &&
                selected === i &&
                i === question.correctIndex &&
                "animate-pop border-primary bg-primary/10 text-primary",
              confirmed &&
                selected === i &&
                i !== question.correctIndex &&
                "animate-shake border-destructive bg-destructive/10 text-destructive",
              confirmed &&
                selected !== i &&
                i === question.correctIndex &&
                "border-primary/40",
            )}
          >
            {option}
          </button>
        ))}
      </div>
      {!confirmed && (
        <button
          type="button"
          onClick={handleConfirm}
          disabled={selected === null}
          className="w-full rounded-xl bg-primary px-4 py-2.5 font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
        >
          Confirmar respuesta
        </button>
      )}
    </div>
  );
}
