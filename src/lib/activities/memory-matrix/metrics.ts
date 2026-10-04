import { mean, percentage, round } from "@/lib/activities/stats";
import type { ActivitySummary, TrialRecord } from "@/lib/activities/types";

const lengthOf = (t: TrialRecord) => Number(t.condition.length);

// Métricas de Memory Matrix (Corsi). Métrica principal: nivel máximo
// (span) = la secuencia más larga reproducida en orden correcto.
export function summarizeMemoryMatrix(trials: readonly TrialRecord[]): ActivitySummary {
  const scored = trials.filter((t) => t.valid);
  const correct = scored.filter((t) => t.classification === "correct");
  const span = correct.length > 0 ? Math.max(...correct.map(lengthOf)) : null;

  const responseTimes = correct
    .map((t) => t.rtMs)
    .filter((rt): rt is number => rt !== null);
  const msPerBlock = correct
    .filter((t) => t.rtMs !== null)
    .map((t) => (t.rtMs as number) / lengthOf(t));
  const firstTapLatencies = scored
    .map((t) => t.detail?.firstTapMs)
    .filter((v): v is number => typeof v === "number");

  const lengths = [...new Set(scored.map(lengthOf))].sort((a, b) => a - b);
  const byLength = lengths.map((length) => {
    const atLength = scored.filter((t) => lengthOf(t) === length);
    const ok = atLength.filter((t) => t.classification === "correct");
    return {
      length,
      attempts: atLength.length,
      correct: ok.length,
      meanResponseMs: round(
        mean(ok.map((t) => t.rtMs).filter((rt): rt is number => rt !== null)),
      ),
    };
  });

  const metrics = {
    span,
    sequencesAttempted: scored.length,
    correctSequences: correct.length,
    invalidSequences: trials.length - scored.length,
    orderErrors: scored.filter((t) => t.classification === "order_error").length,
    itemErrors: scored.filter((t) => t.classification === "item_error").length,
    meanResponseMs: round(mean(responseTimes)),
    meanMsPerBlock: round(mean(msPerBlock)),
    meanFirstTapMs: round(mean(firstTapLatencies)),
    byLength,
  };

  return {
    accuracy: percentage(correct.length, scored.length),
    levelReached: span,
    primary: { key: "span", label: "Nivel máximo", value: span, unit: "bloques" },
    metrics,
    report: {
      dimension: "memoria de trabajo visoespacial",
      span,
      correctSequences: metrics.correctSequences,
      sequencesAttempted: metrics.sequencesAttempted,
      orderErrors: metrics.orderErrors,
      itemErrors: metrics.itemErrors,
      meanMsPerBlock: metrics.meanMsPerBlock,
      meanFirstTapMs: metrics.meanFirstTapMs,
    },
    styleNote: memoryStyleNote(metrics),
  };
}

export function memoryStyleNote(m: {
  span: number | null;
  sequencesAttempted: number;
  orderErrors: number;
  itemErrors: number;
}): string {
  if (m.sequencesAttempted === 0) {
    return "Esta vez no alcanzamos a registrar secuencias suficientes para describir tu estilo.";
  }
  if (m.span !== null && m.span >= 6) {
    return "Sostienes secuencias largas en mente con soltura: tu memoria visoespacial trabaja con amplitud.";
  }
  if (m.orderErrors > m.itemErrors) {
    return "Recuerdas muy bien dónde se encendieron los bloques; el orden es lo que más te reta.";
  }
  if (m.itemErrors > 0 && m.itemErrors >= m.orderErrors) {
    return "Tu estilo es directo: retienes el recorrido general y, en secuencias largas, algún bloque se cambia por otro.";
  }
  return "Recorriste las secuencias con un ritmo estable y constante.";
}
