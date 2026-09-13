"use client";

import { Type } from "lucide-react";

import { ActivityIntro } from "@/components/activities/activity-intro";
import { ActivityLayout } from "@/components/activities/activity-layout";
import { ActivityResult } from "@/components/activities/activity-result";
import { WordSprintGame } from "@/components/activities/word-sprint-game";
import { useActivityResult } from "@/hooks/use-activity-result";

export default function WordSprintPage() {
  const { phase, result, start, finish, reset } =
    useActivityResult("word_sprint");

  return (
    <ActivityLayout title="Word Sprint" icon={Type} backHref="/actividades">
      {phase === "intro" && (
        <ActivityIntro
          title="Word Sprint"
          description="Efecto Stroop: tu cerebro va a querer leer la palabra — tenés que ignorarla."
          instructions={[
            "Va a aparecer el nombre de un color, escrito con la tinta de otro color.",
            "Hacé clic en el color de la TINTA, no en lo que dice la palabra — a veces van a coincidir, a veces no.",
            "Tenés 1.6 segundos por ronda. Son 24 rondas — las que no coinciden son las que de verdad ponen a prueba tu atención.",
          ]}
          onStart={start}
        />
      )}
      {phase === "playing" && <WordSprintGame onFinish={finish} />}
      {(phase === "saving" || phase === "done") && result && (
        <ActivityResult
          saving={phase === "saving"}
          backHref="/actividades"
          onRetry={reset}
          stats={[
            { label: "Puntaje", value: `${Number(result.metrics.score)}` },
            {
              label: "Racha máxima",
              value: `${Number(result.metrics.bestStreak)}`,
            },
            { label: "Precisión", value: `${result.accuracy ?? 0}%` },
            {
              label: "Interferencia",
              value: `+${Math.max(0, Number(result.metrics.incongruentAvgMs) - Number(result.metrics.congruentAvgMs))} ms`,
            },
          ]}
        />
      )}
    </ActivityLayout>
  );
}
