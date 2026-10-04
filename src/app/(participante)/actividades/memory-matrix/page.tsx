"use client";

import { Grid3x3 } from "lucide-react";

import { ActivityShell } from "@/components/activities/activity-shell";
import { MemoryMatrixRound } from "@/components/activities/memory-matrix-round";
import { MEMORY_MATRIX_CONFIG } from "@/lib/activities/config";
import { stat } from "@/lib/activities/format";
import { summarizeMemoryMatrix } from "@/lib/activities/memory-matrix/metrics";
import type { ActivitySummary } from "@/lib/activities/types";

function resultStats({ metrics, accuracy }: ActivitySummary) {
  return [
    { label: "Secuencias correctas", value: `${stat(metrics.correctSequences)} de ${stat(metrics.sequencesAttempted)}` },
    { label: "Precisión", value: stat(accuracy, "%") },
    { label: "Tiempo por bloque", value: stat(metrics.meanMsPerBlock, " ms") },
    { label: "Primer toque", value: stat(metrics.meanFirstTapMs, " ms") },
  ];
}

export default function MemoryMatrixPage() {
  return (
    <ActivityShell
      activityType="memory_matrix"
      title="Memory Matrix"
      icon={Grid3x3}
      tagline="¿Cuántos pasos puedes recordar en orden? Un reto de memoria de trabajo de 2 a 4 minutos."
      instructions={[
        "Algunos bloques se encenderán uno por uno.",
        "Cuando termine, tócalos en el mismo orden en que se encendieron.",
        "Cada acierto suma un bloque más a la secuencia. Si fallas, tienes un segundo intento en ese nivel.",
      ]}
      inputHint="Toca o haz clic sobre los bloques."
      config={MEMORY_MATRIX_CONFIG}
      requiresPortrait
      Round={MemoryMatrixRound}
      summarize={summarizeMemoryMatrix}
      resultStats={resultStats}
    />
  );
}
