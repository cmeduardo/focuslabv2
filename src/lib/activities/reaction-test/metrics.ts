import {
  extremeMean,
  mean,
  median,
  percentage,
  round,
  standardDeviation,
} from "@/lib/activities/stats";
import type { ActivitySummary, TrialRecord } from "@/lib/activities/types";

// Métricas del Reaction Test (PVT). Solo cuentan los ensayos válidos para
// medición (record.valid): un ensayo en que la pestaña perdió visibilidad
// se excluye de todo y se informa aparte.
export function summarizeReactionTest(
  trials: readonly TrialRecord[],
): ActivitySummary {
  const scored = trials.filter((t) => t.valid);
  const invalidTrials = trials.length - scored.length;

  const valid = scored.filter((t) => t.classification === "valid");
  const lapses = scored.filter((t) => t.classification === "lapse");
  const anticipations = scored.filter((t) => t.classification === "anticipation");
  const timeouts = lapses.filter((t) => t.rtMs === null).length;

  const validRts = valid.map((t) => t.rtMs as number);
  // Todas las respuestas con TR medido y no anticipadas (válidas + lapsos
  // lentos), para la cola lenta de la distribución.
  const respondedRts = [...valid, ...lapses]
    .filter((t) => t.rtMs !== null)
    .map((t) => t.rtMs as number);

  const rtMean = mean(validRts);
  const rtSd = standardDeviation(validRts);

  // Tendencia de vigilancia: TR medio válido en la primera vs. la segunda
  // mitad de la ronda.
  const half = Math.ceil(scored.length / 2);
  const halfMean = (slice: readonly TrialRecord[]) =>
    round(
      mean(
        slice
          .filter((t) => t.classification === "valid")
          .map((t) => t.rtMs as number),
      ),
    );
  const firstHalf = halfMean(scored.slice(0, half));
  const secondHalf = halfMean(scored.slice(half));
  const vigilanceTrendMs =
    firstHalf !== null && secondHalf !== null ? secondHalf - firstHalf : null;

  const metrics = {
    scoredTrials: scored.length,
    invalidTrials,
    validResponses: valid.length,
    lapses: lapses.length,
    timeouts,
    anticipations: anticipations.length,
    rtMeanMs: round(rtMean),
    rtSdMs: round(rtSd),
    rtMedianMs: round(median(validRts)),
    rtCv: rtMean !== null && rtSd !== null ? round(rtSd / rtMean, 3) : null,
    fastest10PctMeanMs: round(extremeMean(validRts, 0.1, "fastest")),
    slowest10PctMeanMs: round(extremeMean(respondedRts, 0.1, "slowest")),
    rtMeanFirstHalfMs: firstHalf,
    rtMeanSecondHalfMs: secondHalf,
    vigilanceTrendMs,
  };

  return {
    // RF-05: proporción de respuestas válidas (100–500 ms) sobre los
    // ensayos medibles.
    accuracy: percentage(valid.length, scored.length),
    levelReached: null,
    primary: {
      key: "rtMeanMs",
      label: "Tiempo de reacción promedio",
      value: metrics.rtMeanMs,
      unit: "ms",
    },
    metrics,
    report: {
      dimension: "alerta (vigilancia)",
      rtMeanMs: metrics.rtMeanMs,
      rtSdMs: metrics.rtSdMs,
      rtMedianMs: metrics.rtMedianMs,
      lapses: metrics.lapses,
      anticipations: metrics.anticipations,
      validResponses: metrics.validResponses,
      scoredTrials: metrics.scoredTrials,
      vigilanceTrendMs,
    },
    styleNote: reactionStyleNote(metrics),
  };
}

export function reactionStyleNote(m: {
  scoredTrials: number;
  lapses: number;
  anticipations: number;
  rtCv: number | null;
}): string {
  if (m.scoredTrials === 0) {
    return "Esta vez no alcanzamos a registrar respuestas suficientes para describir tu estilo.";
  }
  if (m.anticipations >= 3 && m.anticipations >= m.lapses) {
    return "Tu estilo es anticipatorio: respondes con mucha energía, a veces incluso antes de que aparezca la señal.";
  }
  if (m.lapses >= 3) {
    return "Tu atención tuvo algunos momentos de pausa durante las esperas largas, algo muy común en este reto.";
  }
  if (m.rtCv !== null && m.rtCv < 0.15) {
    return "Tu ritmo de respuesta fue muy constante de principio a fin.";
  }
  return "Respondiste con un ritmo equilibrado, con variaciones naturales entre una señal y otra.";
}
