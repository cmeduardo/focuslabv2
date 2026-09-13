"use client";

import { Zap } from "lucide-react";

import { ActivityIntro } from "@/components/activities/activity-intro";
import { ActivityLayout } from "@/components/activities/activity-layout";
import { ActivityResult } from "@/components/activities/activity-result";
import { ReactionTestGame } from "@/components/activities/reaction-test-game";
import { useActivityResult } from "@/hooks/use-activity-result";

export default function ReactionTestPage() {
  const { phase, result, start, finish, reset } =
    useActivityResult("reaction_test");

  return (
    <ActivityLayout title="Reaction Test" icon={Zap} backHref="/actividades">
      {phase === "intro" && (
        <ActivityIntro
          title="Reaction Test"
          description="Tiempo de reacción y puntería: el objetivo aparece en un punto al azar y se achica con la racha (20 rondas)."
          instructions={[
            "Esperá a que aparezca el círculo violeta en algún punto del recuadro.",
            "Hacé clic justo sobre él, lo más rápido posible — si fallás el punto o tardás de más, perdés la racha.",
            "Con cada acierto seguido el círculo se hace más chico y vale más puntos.",
          ]}
          onStart={start}
        />
      )}
      {phase === "playing" && <ReactionTestGame onFinish={finish} />}
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
            {
              label: "Tiempo promedio",
              value: `${Number(result.metrics.averageMs)} ms`,
            },
            {
              label: "Variabilidad (DE)",
              value: `${Number(result.metrics.rtSD)} ms`,
            },
            {
              label: "Lapsos de atención",
              value: `${Number(result.metrics.lapses)}`,
            },
            { label: "Rondas válidas", value: `${result.accuracy ?? 0}%` },
          ]}
        />
      )}
    </ActivityLayout>
  );
}
