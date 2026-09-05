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
          description="Velocidad de procesamiento léxico: decidí si cada palabra es real o inventada."
          instructions={[
            "Va a aparecer una palabra a la vez.",
            "Elegí “Es real” o “Inventada” lo más rápido posible.",
            "Tenés 2.5 segundos por palabra — si no respondés, pasa a la siguiente.",
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
            { label: "Precisión", value: `${result.accuracy ?? 0}%` },
            {
              label: "Respuestas a tiempo",
              value: `${Number(result.metrics.total) - Number(result.metrics.timeouts)}/${Number(result.metrics.total)}`,
            },
          ]}
        />
      )}
    </ActivityLayout>
  );
}
