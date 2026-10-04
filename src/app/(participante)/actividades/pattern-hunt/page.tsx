"use client";

import { Search } from "lucide-react";

import { ActivityShell } from "@/components/activities/activity-shell";
import { PatternHuntRound } from "@/components/activities/pattern-hunt-round";
import { PATTERN_HUNT_CONFIG } from "@/lib/activities/config";
import { stat } from "@/lib/activities/format";
import { summarizePatternHunt } from "@/lib/activities/pattern-hunt/metrics";
import type { ActivitySummary } from "@/lib/activities/types";

function resultStats({ metrics, accuracy }: ActivitySummary) {
  return [
    { label: "Precisión", value: stat(accuracy, "%") },
    { label: "Búsqueda simple", value: stat(metrics.featureDetectionMs, " ms") },
    { label: "Búsqueda combinada", value: stat(metrics.conjunctionDetectionMs, " ms") },
    { label: "Ms por elemento extra", value: stat(metrics.conjunctionPresentSlopeMsPerItem, " ms") },
  ];
}

export default function PatternHuntPage() {
  return (
    <ActivityShell
      activityType="pattern_hunt"
      title="Pattern Hunt"
      icon={Search}
      tagline="Un óvalo escondido entre figuras parecidas: ¿está o no está? Un reto de búsqueda visual de unos 3 minutos."
      instructions={[
        "Busca el óvalo de pie (vertical) entre las demás figuras.",
        "A veces está y a veces no: responde «Está» o «No está».",
        "Habrá pantallas con pocas figuras y otras con muchas. Responde rápido y con cuidado.",
      ]}
      inputHint="Toca los botones; en laptop también puedes usar F (Está) y J (No está)."
      config={PATTERN_HUNT_CONFIG}
      requiresPortrait
      Round={PatternHuntRound}
      summarize={summarizePatternHunt}
      resultStats={resultStats}
    />
  );
}
