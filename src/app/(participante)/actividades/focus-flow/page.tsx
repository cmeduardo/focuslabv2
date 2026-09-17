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
          description="Seguimiento visual continuo: memorizá unos puntos, seguilos con la mirada mientras se mueven, y marcalos al final (8 rondas)."
          instructions={[
            "Al empezar cada ronda, algunos puntos se resaltan por un instante — esos son los blancos, memorizalos.",
            "Todos los puntos se vuelven idénticos y empiezan a moverse — seguí a los blancos con la mirada sin perderlos.",
            "Cuando se detienen, hacé clic sobre los puntos que creés que eran los blancos originales.",
            "Con cada ronda hay más puntos, se mueven más rápido y por más tiempo.",
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
            {
              label: "Blancos perdidos",
              value: `${(result.metrics.missedPerRound as number[] | undefined)?.reduce((a, b) => a + b, 0) ?? 0}`,
            },
            {
              label: "Falsos positivos",
              value: `${(result.metrics.falsePositivesPerRound as number[] | undefined)?.reduce((a, b) => a + b, 0) ?? 0}`,
            },
            { label: "Ronda más difícil", value: `${result.levelReached ?? 0} puntos` },
          ]}
        />
      )}
    </ActivityLayout>
  );
}
