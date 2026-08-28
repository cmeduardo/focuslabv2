"use client";

import { BookOpen } from "lucide-react";

import { ActivityIntro } from "@/components/activities/activity-intro";
import { ActivityLayout } from "@/components/activities/activity-layout";
import { ActivityResult } from "@/components/activities/activity-result";
import { DeepReadGame } from "@/components/activities/deep-read-game";
import { useActivityResult } from "@/hooks/use-activity-result";

export default function DeepReadPage() {
  const { phase, result, start, finish, reset } =
    useActivityResult("deep_read");

  return (
    <ActivityLayout title="Deep Read" icon={BookOpen} backHref="/actividades">
      {phase === "intro" && (
        <ActivityIntro
          title="Deep Read"
          description="Comprensión lectora bajo tiempo limitado: 3 párrafos al azar (de un banco de 8) y nueve preguntas — algunas literales, otras de inferencia."
          instructions={[
            "Leé cada párrafo con atención — tenés un tiempo límite para pasar a las preguntas, se acaba solo si no avanzás antes.",
            "Vas a responder 3 preguntas por párrafo, también con tiempo límite cada una. Podés elegir una opción, cambiarla, y confirmarla cuando estés seguro.",
            "Si necesitás repasar el texto, podés volver a leerlo antes de confirmar — pero el tiempo de la pregunta sigue corriendo.",
            "Puede aparecer una notificación en la esquina mientras leés — ignorala, no hace falta cerrarla.",
          ]}
          onStart={start}
        />
      )}
      {phase === "playing" && <DeepReadGame onFinish={finish} />}
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
            { label: "Comprensión", value: `${result.accuracy ?? 0}%` },
            {
              label: "Preguntas correctas",
              value: `${Number(result.metrics.correctCount)}/${Number(result.metrics.totalQuestions)}`,
            },
            {
              label: "Literal vs. inferencia",
              value: `${Number(result.metrics.literalAccuracy)}% / ${Number(result.metrics.inferenceAccuracy)}%`,
            },
            {
              label: "Veces que releyó",
              value: `${Number(result.metrics.rereadCount)}`,
            },
            {
              label: "Distracciones ignoradas",
              value: `${Number(result.metrics.distractionsShown) - Number(result.metrics.distractionsClicked)}/${Number(result.metrics.distractionsShown)}`,
            },
            {
              label: "Preguntas sin responder",
              value: `${Number(result.metrics.questionTimeouts)}`,
            },
          ]}
        />
      )}
    </ActivityLayout>
  );
}
