"use client";

import { Type } from "lucide-react";

import { ActivityShell } from "@/components/activities/activity-shell";
import { WordSprintRound } from "@/components/activities/word-sprint-round";
import { WORD_SPRINT_CONFIG } from "@/lib/activities/config";
import { stat } from "@/lib/activities/format";
import type { ActivitySummary } from "@/lib/activities/types";
import { summarizeWordSprint } from "@/lib/activities/word-sprint/metrics";

function resultStats({ metrics }: ActivitySummary) {
  return [
    { label: "Color y palabra iguales", value: stat(metrics.congruentRtMs, " ms") },
    { label: "Color y palabra distintos", value: stat(metrics.incongruentRtMs, " ms") },
    { label: "Efecto de la palabra", value: stat(metrics.interferenceMs, " ms") },
    { label: "Sin respuesta", value: stat(metrics.timeouts) },
  ];
}

export default function WordSprintPage() {
  return (
    <ActivityShell
      activityType="word_sprint"
      title="Word Sprint"
      icon={Type}
      tagline="Lees sin querer… ¿puedes fijarte solo en el color? Un reto de atención selectiva de unos 3 minutos."
      instructions={[
        "Aparecerán nombres de colores escritos con tinta de colores.",
        "Elige el COLOR DE LA TINTA, no lo que dice la palabra.",
        "Por ejemplo, si ves «AZUL» pintado de rojo, la respuesta es ROJO.",
        "Responde rápido, pero con cuidado.",
      ]}
      inputHint="Toca uno de los 4 botones; en laptop también puedes usar las teclas D, F, J y K."
      config={WORD_SPRINT_CONFIG}
      requiresPortrait
      Round={WordSprintRound}
      summarize={summarizeWordSprint}
      resultStats={resultStats}
    />
  );
}
