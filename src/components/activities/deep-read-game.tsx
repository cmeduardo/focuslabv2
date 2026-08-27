"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { ActivityOutcome } from "@/hooks/use-activity-result";
import { DEEP_READ_PASSAGES } from "@/lib/constants/deep-read-passages";
import { cn } from "@/lib/utils";

type Stage = "reading" | "question";

export function DeepReadGame({
  onFinish,
}: {
  onFinish: (outcome: ActivityOutcome) => void;
}) {
  const [passageIndex, setPassageIndex] = useState(0);
  const [stage, setStage] = useState<Stage>("reading");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const readingStartRef = useRef(0);
  const readingTimesRef = useRef<number[]>([]);
  const answersCorrectRef = useRef<boolean[]>([]);
  const finishedRef = useRef(false);

  const passage = DEEP_READ_PASSAGES[passageIndex];
  const question = passage.questions[questionIndex];

  // Marca el inicio de lectura del primer párrafo (ref, no estado) al montar.
  useEffect(() => {
    readingStartRef.current = performance.now();
  }, []);

  const finishGame = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const correctCount = answersCorrectRef.current.filter(Boolean).length;
    const totalQuestions = answersCorrectRef.current.length;
    const accuracy = totalQuestions
      ? Math.round((correctCount / totalQuestions) * 100)
      : 0;
    onFinish({
      accuracy,
      levelReached: null,
      metrics: {
        readingTimesMs: readingTimesRef.current,
        answersCorrect: answersCorrectRef.current,
      },
    });
  }, [onFinish]);

  function handleContinueToQuestions() {
    readingTimesRef.current.push(
      Math.round(performance.now() - readingStartRef.current),
    );
    setStage("question");
    setQuestionIndex(0);
    setSelected(null);
  }

  function handleSelectOption(optionIndex: number) {
    if (selected !== null || finishedRef.current) return;
    setSelected(optionIndex);
    answersCorrectRef.current.push(optionIndex === question.correctIndex);
    setTimeout(() => {
      if (questionIndex + 1 < passage.questions.length) {
        setQuestionIndex((q) => q + 1);
        setSelected(null);
      } else if (passageIndex + 1 < DEEP_READ_PASSAGES.length) {
        readingStartRef.current = performance.now();
        setPassageIndex((p) => p + 1);
        setStage("reading");
      } else {
        finishGame();
      }
    }, 700);
  }

  if (stage === "reading") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Párrafo {passageIndex + 1} de {DEEP_READ_PASSAGES.length}
        </p>
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

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Pregunta {questionIndex + 1} de {passage.questions.length} —{" "}
        {passage.title}
      </p>
      <p className="font-heading text-lg font-medium">{question.question}</p>
      <div className="space-y-2">
        {question.options.map((option, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleSelectOption(i)}
            disabled={selected !== null}
            className={cn(
              "w-full rounded-xl border border-border bg-card px-4 py-2.5 text-left transition-colors disabled:cursor-not-allowed",
              selected === null && "hover:bg-muted/50",
              selected === i &&
                i === question.correctIndex &&
                "border-primary bg-primary/10 text-primary",
              selected === i &&
                i !== question.correctIndex &&
                "border-destructive bg-destructive/10 text-destructive",
              selected !== null &&
                selected !== i &&
                i === question.correctIndex &&
                "border-primary/40",
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
