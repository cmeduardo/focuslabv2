"use client";

import { Zap } from "lucide-react";

import { ActivityShell } from "@/components/activities/activity-shell";
import { ReactionTestRound } from "@/components/activities/reaction-test-round";
import { REACTION_TEST_CONFIG } from "@/lib/activities/config";
import { stat } from "@/lib/activities/format";
import { summarizeReactionTest } from "@/lib/activities/reaction-test/metrics";
import type { ActivitySummary } from "@/lib/activities/types";

function resultStats({ metrics, accuracy }: ActivitySummary) {
  return [
    { label: "Mediana", value: stat(metrics.rtMedianMs, " ms") },
    { label: "Variabilidad", value: stat(metrics.rtSdMs, " ms") },
    { label: "Respuestas a tiempo", value: stat(accuracy, "%") },
    { label: "Respuestas lentas", value: stat(metrics.lapses) },
    { label: "Respuestas anticipadas", value: stat(metrics.anticipations) },
    { label: "Señales", value: stat(metrics.scoredTrials) },
  ];
}

export default function ReactionTestPage() {
  return (
    <ActivityShell
      activityType="reaction_test"
      title="Reaction Test"
      icon={Zap}
      tagline="¿Qué tan rápido reaccionas cuando la señal llega sin aviso? Un reto de alerta de unos 3 minutos."
      instructions={[
        "Mira el centro de la pantalla y espera.",
        "Cuando aparezca el círculo, responde lo más rápido que puedas.",
        "La espera cambia cada vez: a veces 2 segundos, a veces 10. No te adelantes.",
      ]}
      inputHint="En laptop puedes usar la barra espaciadora o el mouse; en celular, toca cualquier parte de la pantalla."
      config={REACTION_TEST_CONFIG}
      Round={ReactionTestRound}
      summarize={summarizeReactionTest}
      resultStats={resultStats}
    />
  );
}
