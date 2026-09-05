"use client";

import { Grid3x3 } from "lucide-react";

import { ActivityIntro } from "@/components/activities/activity-intro";
import { ActivityLayout } from "@/components/activities/activity-layout";
import { ActivityResult } from "@/components/activities/activity-result";
import { MemoryMatrixGame } from "@/components/activities/memory-matrix-game";
import { useActivityResult } from "@/hooks/use-activity-result";

export default function MemoryMatrixPage() {
  const { phase, result, start, finish, reset } =
    useActivityResult("memory_matrix");

  return (
    <ActivityLayout title="Memory Matrix" icon={Grid3x3} backHref="/actividades">
      {phase === "intro" && (
        <ActivityIntro
          title="Memory Matrix"
          description="Memoria de trabajo: repetí secuencias en una cuadrícula que crecen en cada nivel."
          instructions={[
            "Observá qué celdas se iluminan y en qué orden.",
            "Después, hacé clic en las mismas celdas, en el mismo orden.",
            "Cada nivel agrega una celda más a la secuencia. Un error termina la partida.",
          ]}
          onStart={start}
        />
      )}
      {phase === "playing" && <MemoryMatrixGame onFinish={finish} />}
      {(phase === "saving" || phase === "done") && result && (
        <ActivityResult
          saving={phase === "saving"}
          backHref="/actividades"
          onRetry={reset}
          stats={[
            { label: "Nivel alcanzado", value: `${result.levelReached ?? 0}` },
            { label: "Precisión de clics", value: `${result.accuracy ?? 0}%` },
          ]}
        />
      )}
    </ActivityLayout>
  );
}
