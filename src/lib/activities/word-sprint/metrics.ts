import { mean, percentage, round, standardDeviation } from "@/lib/activities/stats";
import type { ActivitySummary, TrialRecord } from "@/lib/activities/types";

const rtsOf = (trials: readonly TrialRecord[]) =>
  trials.map((t) => t.rtMs).filter((rt): rt is number => rt !== null);

// Efecto de interferencia: TR incongruente − TR congruente, solo aciertos.
function interference(trials: readonly TrialRecord[]) {
  const correct = trials.filter((t) => t.correct === true);
  const c = mean(rtsOf(correct.filter((t) => t.condition.congruent === true)));
  const i = mean(rtsOf(correct.filter((t) => t.condition.congruent === false)));
  return { congruent: c, incongruent: i, effect: c !== null && i !== null ? i - c : null };
}

// Métricas de Word Sprint (Stroop). Métrica principal: precisión global.
export function summarizeWordSprint(trials: readonly TrialRecord[]): ActivitySummary {
  const scored = trials.filter((t) => t.valid);
  const congruent = scored.filter((t) => t.condition.congruent === true);
  const incongruent = scored.filter((t) => t.condition.congruent === false);
  const correct = scored.filter((t) => t.correct === true);
  const all = interference(scored);
  const half = Math.ceil(scored.length / 2);

  const metrics = {
    scoredTrials: scored.length,
    invalidTrials: trials.length - scored.length,
    correct: correct.length,
    errors: scored.filter((t) => t.classification === "error").length,
    timeouts: scored.filter((t) => t.classification === "timeout").length,
    accuracyPct: percentage(correct.length, scored.length),
    congruentAccuracyPct: percentage(
      congruent.filter((t) => t.correct === true).length,
      congruent.length,
    ),
    incongruentAccuracyPct: percentage(
      incongruent.filter((t) => t.correct === true).length,
      incongruent.length,
    ),
    congruentRtMs: round(all.congruent),
    incongruentRtMs: round(all.incongruent),
    interferenceMs: round(all.effect),
    rtSdMs: round(standardDeviation(rtsOf(correct))),
    interferenceFirstHalfMs: round(interference(scored.slice(0, half)).effect),
    interferenceSecondHalfMs: round(interference(scored.slice(half)).effect),
  };

  return {
    accuracy: metrics.accuracyPct,
    levelReached: null,
    primary: { key: "accuracyPct", label: "Precisión", value: metrics.accuracyPct, unit: "%" },
    metrics,
    report: {
      dimension: "atención selectiva e inhibición",
      accuracyPct: metrics.accuracyPct,
      congruentRtMs: metrics.congruentRtMs,
      incongruentRtMs: metrics.incongruentRtMs,
      interferenceMs: metrics.interferenceMs,
      congruentAccuracyPct: metrics.congruentAccuracyPct,
      incongruentAccuracyPct: metrics.incongruentAccuracyPct,
      timeouts: metrics.timeouts,
      scoredTrials: metrics.scoredTrials,
    },
    styleNote: wordSprintStyleNote(metrics),
  };
}

export function wordSprintStyleNote(m: {
  scoredTrials: number;
  accuracyPct: number | null;
  interferenceMs: number | null;
}): string {
  if (m.scoredTrials === 0) {
    return "Esta vez no alcanzamos a registrar respuestas suficientes para describir tu estilo.";
  }
  const accuracy = m.accuracyPct ?? 0;
  const interferenceMs = m.interferenceMs ?? 0;
  if (accuracy >= 90 && interferenceMs < 80) {
    return "La palabra apenas te distrae: separas con facilidad lo que lees de lo que ves.";
  }
  if (accuracy >= 90) {
    return "Tu estilo es preciso: cuando la palabra y el color no coinciden, te tomas un instante extra para acertar.";
  }
  if (interferenceMs < 80) {
    return "Tu estilo es veloz: respondes con agilidad, y a veces la lectura automática se cuela en la respuesta.";
  }
  return "La palabra escrita compite con el color, como le pasa a casi todos: tu respuesta busca el equilibrio entre ambos.";
}
