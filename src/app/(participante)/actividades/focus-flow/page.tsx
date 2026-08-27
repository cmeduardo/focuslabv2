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
          description="Atención sostenida: un flujo continuo de estímulos en una cuadrícula de 9 celdas, durante 90 segundos."
          instructions={[
            "En cada instante aparece un círculo violeta o un cuadrado coral en alguna de las 9 celdas — cambia de lugar cada vez.",
            "Ubicalo y hacé clic apenas veas el círculo violeta.",
            "Cuando sea el cuadrado coral (poco frecuente), no hagas nada — dejalo pasar.",
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
            { label: "Puntaje", value: `${Number(result.metrics.score)}` },
            {
              label: "Racha máxima",
              value: `${Number(result.metrics.bestStreak)}`,
            },
            { label: "Precisión", value: `${result.accuracy ?? 0}%` },
            { label: "Omisiones", value: `${Number(result.metrics.omissions)}` },
            { label: "Comisiones", value: `${Number(result.metrics.commissions)}` },
            { label: "Aciertos", value: `${Number(result.metrics.hits)}` },
          ]}
        />
      )}
    </ActivityLayout>
  );
}
