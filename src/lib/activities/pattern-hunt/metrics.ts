import { linearSlope, mean, percentage, round } from "@/lib/activities/stats";
import type { ActivitySummary, TrialRecord } from "@/lib/activities/types";

const rtsOf = (trials: readonly TrialRecord[]) =>
  trials.map((t) => t.rtMs).filter((rt): rt is number => rt !== null);

// Pendiente de búsqueda (ms por elemento adicional) en aciertos: ~0 indica
// que el objetivo "salta a la vista"; una pendiente alta, revisión elemento
// por elemento.
function slopeFor(trials: readonly TrialRecord[]) {
  const ok = trials.filter((t) => t.correct === true && t.rtMs !== null);
  return round(
    linearSlope(
      ok.map((t) => Number(t.condition.setSize)),
      ok.map((t) => t.rtMs as number),
    ),
    1,
  );
}

// Métricas de Pattern Hunt (búsqueda visual). Métrica principal: velocidad
// de detección = TR medio en aciertos con el objetivo presente.
export function summarizePatternHunt(trials: readonly TrialRecord[]): ActivitySummary {
  const scored = trials.filter((t) => t.valid);
  const correct = scored.filter((t) => t.correct === true);
  const present = scored.filter((t) => t.condition.present === true);
  const absent = scored.filter((t) => t.condition.present === false);
  const ofType = (list: readonly TrialRecord[], type: string) =>
    list.filter((t) => t.condition.type === type);

  const detectionSpeed = round(mean(rtsOf(present.filter((t) => t.correct === true))));

  const setSizes = [...new Set(scored.map((t) => Number(t.condition.setSize)))].sort(
    (a, b) => a - b,
  );
  const rtTable = ["feature", "conjunction"].flatMap((type) =>
    setSizes.flatMap((setSize) =>
      [true, false].map((isPresent) => {
        const cell = scored.filter(
          (t) =>
            t.condition.type === type &&
            Number(t.condition.setSize) === setSize &&
            t.condition.present === isPresent,
        );
        return {
          type,
          setSize,
          present: isPresent,
          trials: cell.length,
          accuracyPct: percentage(cell.filter((t) => t.correct === true).length, cell.length),
          meanRtMs: round(mean(rtsOf(cell.filter((t) => t.correct === true)))),
        };
      }),
    ),
  );

  const metrics = {
    scoredTrials: scored.length,
    invalidTrials: trials.length - scored.length,
    correct: correct.length,
    misses: present.filter((t) => t.classification === "miss").length,
    falseAlarms: absent.filter((t) => t.classification === "false_alarm").length,
    timeouts: scored.filter((t) => t.classification === "timeout").length,
    detectionSpeedMs: detectionSpeed,
    featurePresentSlopeMsPerItem: slopeFor(ofType(present, "feature")),
    conjunctionPresentSlopeMsPerItem: slopeFor(ofType(present, "conjunction")),
    featureAbsentSlopeMsPerItem: slopeFor(ofType(absent, "feature")),
    conjunctionAbsentSlopeMsPerItem: slopeFor(ofType(absent, "conjunction")),
    featureDetectionMs: round(
      mean(rtsOf(ofType(present, "feature").filter((t) => t.correct === true))),
    ),
    conjunctionDetectionMs: round(
      mean(rtsOf(ofType(present, "conjunction").filter((t) => t.correct === true))),
    ),
    rtTable,
  };

  return {
    accuracy: percentage(correct.length, scored.length),
    levelReached: null,
    primary: {
      key: "detectionSpeedMs",
      label: "Velocidad de detección",
      value: detectionSpeed,
      unit: "ms",
    },
    metrics,
    report: {
      dimension: "atención selectiva visual",
      detectionSpeedMs: detectionSpeed,
      accuracyPct: percentage(correct.length, scored.length),
      featureDetectionMs: metrics.featureDetectionMs,
      conjunctionDetectionMs: metrics.conjunctionDetectionMs,
      featurePresentSlopeMsPerItem: metrics.featurePresentSlopeMsPerItem,
      conjunctionPresentSlopeMsPerItem: metrics.conjunctionPresentSlopeMsPerItem,
      misses: metrics.misses,
      falseAlarms: metrics.falseAlarms,
      scoredTrials: metrics.scoredTrials,
    },
    styleNote: patternHuntStyleNote(metrics),
  };
}

export function patternHuntStyleNote(m: {
  scoredTrials: number;
  misses: number;
  falseAlarms: number;
  conjunctionPresentSlopeMsPerItem: number | null;
}): string {
  if (m.scoredTrials === 0) {
    return "Esta vez no alcanzamos a registrar respuestas suficientes para describir tu estilo.";
  }
  if (m.misses > m.falseAlarms + 2) {
    return "Tu estilo es de barrido rápido: decides con agilidad, y en las pantallas más llenas a veces el óvalo se escapa.";
  }
  if (m.falseAlarms > m.misses + 2) {
    return "Tu mirada es sensible a lo que se parece al objetivo: a veces ves el óvalo antes de que esté.";
  }
  if (m.conjunctionPresentSlopeMsPerItem !== null && m.conjunctionPresentSlopeMsPerItem < 20) {
    return "Encuentras el objetivo casi sin importar cuántos elementos haya: tu búsqueda es muy eficiente.";
  }
  return "Tu búsqueda es metódica: revisas con cuidado cuando la pantalla se llena, y eso se nota en tu precisión.";
}
