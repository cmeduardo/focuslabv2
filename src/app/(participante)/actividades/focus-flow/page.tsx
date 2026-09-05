"use client";

import { Target } from "lucide-react";

import { ActivityIntro } from "@/components/activities/activity-intro";
import { ActivityLayout } from "@/components/activities/activity-layout";
import { ActivityResult } from "@/components/activities/activity-result";
import { FocusFlowGame } from "@/components/activities/focus-flow-game";
import { useActivityResult } from "@/hooks/use-activity-result";

export default function FocusFlowPage() {
  const { phase, result, start, finish, reset } =
    useActivityResult("focus_flow");

  return (
    <ActivityLayout title="Focus Flow" icon={Target} backHref="/actividades">
      {phase === "intro" && (
        <ActivityIntro
          title="Focus Flow"
          description="Atención sostenida durante 30 segundos de seguimiento visual continuo."
          instructions={[
            "Va a aparecer un círculo violeta en distintas posiciones: hacé clic en él apenas lo veas.",
            "A veces va a aparecer un círculo coral — ese no lo toqués.",
            "La velocidad aumenta a medida que pasa el tiempo.",
          ]}
          onStart={start}
        />
      )}
      {phase === "playing" && <FocusFlowGame onFinish={finish} />}
      {(phase === "saving" || phase === "done") && result && (
        <ActivityResult
          saving={phase === "saving"}
          backHref="/actividades"
          onRetry={reset}
          stats={[
            { label: "Precisión", value: `${result.accuracy ?? 0}%` },
            { label: "Aciertos", value: `${Number(result.metrics.hits)}` },
            { label: "Falsas alarmas", value: `${Number(result.metrics.falseAlarms)}` },
            { label: "Nivel alcanzado", value: `${result.levelReached ?? 1}` },
          ]}
        />
      )}
    </ActivityLayout>
  );
}
