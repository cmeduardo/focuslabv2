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
          description="Mide tu tiempo de reacción ante un estímulo visual (20 rondas)."
          instructions={[
            "Esperá a que el recuadro cambie a “¡YA!”.",
            "Hacé clic apenas lo veas — cuanto más rápido, mejor.",
            "Si hacés clic antes de tiempo, la ronda se repite. Son 20 rondas en total.",
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
