"use client";

import { BookOpen } from "lucide-react";

import { ActivityShell } from "@/components/activities/activity-shell";
import { DeepReadRound } from "@/components/activities/deep-read-round";
import { DEEP_READ_CONFIG } from "@/lib/activities/config";
import { summarizeDeepRead } from "@/lib/activities/deep-read/metrics";
import { stat } from "@/lib/activities/format";
import type { ActivitySummary } from "@/lib/activities/types";

function resultStats({ metrics }: ActivitySummary) {
  const readingS =
    typeof metrics.readingTimeMs === "number" ? Math.round(metrics.readingTimeMs / 1000) : null;
  return [
    { label: "Tiempo de lectura", value: stat(readingS, " s") },
    { label: "Palabras por minuto", value: stat(metrics.wordsPerMinute) },
    { label: "Notificaciones cerradas", value: `${stat(metrics.notificationsClosed)} de ${stat(metrics.notificationsShown)}` },
    { label: "Salidas de la pestaña", value: stat(metrics.visibilityExits) },
  ];
}

export default function DeepReadPage() {
  return (
    <ActivityShell
      activityType="deep_read"
      title="Deep Read"
      icon={BookOpen}
      tagline="Un texto breve, algunas interrupciones y unas preguntas al final. Un reto de lectura de unos 4 minutos."
      instructions={[
        "Lee el texto con calma, a tu ritmo.",
        "Mientras lees pueden aparecer notificaciones: ciérralas o ignóralas, como prefieras.",
        "Al terminar responderás 5 preguntas sin volver al texto.",
      ]}
      inputHint="Desplázate por el texto con el dedo, la rueda del mouse o el teclado."
      config={DEEP_READ_CONFIG}
      Round={DeepReadRound}
      summarize={summarizeDeepRead}
      resultStats={resultStats}
    />
  );
}
