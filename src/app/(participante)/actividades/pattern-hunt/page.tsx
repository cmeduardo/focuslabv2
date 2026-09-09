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
          description="Atención selectiva: encontrá la única estrella violeta entre estrellas grises y círculos violeta."
          instructions={[
            "Cada ronda mezcla estrellas grises y círculos violeta — ninguna combinación por sí sola es el objetivo.",
            "Buscá la única celda que combina estrella Y color violeta.",
            "La cuadrícula crece cada dos rondas — son 8 rondas en total.",
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
            { label: "Precisión", value: `${result.accuracy ?? 0}%` },
            { label: "Cuadrícula máxima", value: `${result.levelReached ?? 0}×${result.levelReached ?? 0}` },
          ]}
        />
      )}
    </ActivityLayout>
  );
}
