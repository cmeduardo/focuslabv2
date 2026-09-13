"use client";

import { Search } from "lucide-react";

import { ActivityIntro } from "@/components/activities/activity-intro";
import { ActivityLayout } from "@/components/activities/activity-layout";
import { ActivityResult } from "@/components/activities/activity-result";
import { PatternHuntGame } from "@/components/activities/pattern-hunt-game";
import { useActivityResult } from "@/hooks/use-activity-result";

export default function PatternHuntPage() {
  const { phase, result, start, finish, reset } =
    useActivityResult("pattern_hunt");

  return (
    <ActivityLayout title="Pattern Hunt" icon={Search} backHref="/actividades">
      {phase === "intro" && (
        <ActivityIntro
          title="Pattern Hunt"
          description="Atención selectiva: encontrá la única estrella violeta grande contra el reloj."
          instructions={[
            "Cada ronda mezcla estrellas grises, círculos violeta y estrellas violeta chicas — ninguna por sí sola es el objetivo.",
            "Buscá la única celda que combina estrella grande Y color violeta, antes de que se acabe el tiempo.",
            "La cuadrícula crece cada dos rondas, hasta 9×9 — son 10 rondas en total.",
          ]}
          onStart={start}
        />
      )}
      {phase === "playing" && <PatternHuntGame onFinish={finish} />}
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
            { label: "Cuadrícula máxima", value: `${result.levelReached ?? 0}×${result.levelReached ?? 0}` },
          ]}
        />
      )}
    </ActivityLayout>
  );
}
