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
          description="Comprensión lectora bajo tiempo limitado: dos párrafos breves y cuatro preguntas."
          instructions={[
            "Leé cada párrafo con atención y avanzá cuando estés listo.",
            "Después vas a responder dos preguntas de opción múltiple por párrafo.",
            "No hay límite estricto de tiempo, pero se registra cuánto tardás en leer.",
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
            { label: "Comprensión", value: `${result.accuracy ?? 0}%` },
            {
              label: "Preguntas correctas",
              value: `${Math.round(((result.accuracy ?? 0) / 100) * 4)}/4`,
            },
          ]}
        />
      )}
    </ActivityLayout>
  );
}
