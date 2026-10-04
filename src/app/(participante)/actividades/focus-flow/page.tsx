"use client";

import { Target } from "lucide-react";

import { ActivityShell } from "@/components/activities/activity-shell";
import { FocusFlowRound } from "@/components/activities/focus-flow-round";
import { FOCUS_FLOW_CONFIG } from "@/lib/activities/config";
import { summarizeFocusFlow } from "@/lib/activities/focus-flow/metrics";
import { stat } from "@/lib/activities/format";
import type { ActivitySummary } from "@/lib/activities/types";

function resultStats({ metrics, accuracy }: ActivitySummary) {
  return [
    { label: "Precisión", value: stat(accuracy, "%") },
    { label: "Ritmo promedio", value: stat(metrics.goRtMeanMs, " ms") },
    { label: "Variabilidad", value: stat(metrics.goRtSdMs, " ms") },
    { label: "Números dejados pasar", value: stat(metrics.omissions) },
    { label: "Respuestas al 3", value: `${stat(metrics.commissions)} de ${stat(metrics.targetTrials)}` },
  ];
}

export default function FocusFlowPage() {
  return (
    <ActivityShell
      activityType="focus_flow"
      title="Focus Flow"
      icon={Target}
      tagline="Un flujo constante de números: ¿puedes mantener el ritmo y frenar a tiempo? Un reto de atención sostenida de unos 3 minutos."
      instructions={[
        "Verás números del 1 al 9, uno tras otro, a ritmo fijo.",
        "Responde a cada número lo más rápido que puedas…",
        "…excepto cuando aparezca el 3: ese déjalo pasar sin responder.",
        "Importa tanto la rapidez como frenar a tiempo con el 3.",
      ]}
      inputHint="En laptop usa la barra espaciadora o el mouse; en celular, toca la pantalla."
      config={FOCUS_FLOW_CONFIG}
      Round={FocusFlowRound}
      summarize={summarizeFocusFlow}
      resultStats={resultStats}
    />
  );
}
