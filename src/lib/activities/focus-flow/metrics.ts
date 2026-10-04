import { mean, percentage, round, standardDeviation } from "@/lib/activities/stats";
import type { ActivitySummary, TrialRecord } from "@/lib/activities/types";

const isTarget = (t: TrialRecord) => t.condition.isTarget === true;

// Métricas de Focus Flow (SART). Métrica principal: tasa de errores de
// comisión (responder al "3"), la medida clásica de fallas momentáneas de
// la atención sostenida en este paradigma.
export function summarizeFocusFlow(trials: readonly TrialRecord[]): ActivitySummary {
  const scored = trials.filter((t) => t.valid);
  const targets = scored.filter(isTarget);
  const goTrials = scored.filter((t) => !isTarget(t));

  const commissions = targets.filter((t) => t.classification === "commission").length;
  const omissions = goTrials.filter((t) => t.classification === "omission").length;
  const hits = goTrials.filter((t) => t.classification === "hit");
  const hitRts = hits.map((t) => t.rtMs).filter((rt): rt is number => rt !== null);
  const correct = scored.filter((t) => t.correct === true).length;

  const rtMean = mean(hitRts);
  const rtSd = standardDeviation(hitRts);

  // Aceleración antes de un error: TR medio de los 4 aciertos previos a
  // una comisión vs. a una inhibición correcta. Un ritmo más rápido justo
  // antes de fallar es la firma típica de responder "en automático".
  const preRt = (kind: "commission" | "correct_withhold") => {
    const values: number[] = [];
    scored.forEach((t, i) => {
      if (!isTarget(t) || t.classification !== kind) return;
      const prev = scored
        .slice(Math.max(0, i - 4), i)
        .filter((p) => p.classification === "hit" && p.rtMs !== null)
        .map((p) => p.rtMs as number);
      if (prev.length > 0) values.push(mean(prev) as number);
    });
    return round(mean(values));
  };

  const metrics = {
    scoredTrials: scored.length,
    invalidTrials: trials.length - scored.length,
    targetTrials: targets.length,
    goTrials: goTrials.length,
    commissions,
    omissions,
    commissionRatePct: percentage(commissions, targets.length),
    omissionRatePct: percentage(omissions, goTrials.length),
    goRtMeanMs: round(rtMean),
    goRtSdMs: round(rtSd),
    goRtCv: rtMean !== null && rtSd !== null ? round(rtSd / rtMean, 3) : null,
    anticipatoryResponses: hitRts.filter((rt) => rt < 100).length,
    preCommissionRtMs: preRt("commission"),
    preWithholdRtMs: preRt("correct_withhold"),
  };

  return {
    accuracy: percentage(correct, scored.length),
    levelReached: null,
    primary: {
      key: "commissionRatePct",
      label: "Respuestas al 3",
      value: metrics.commissionRatePct,
      unit: "%",
    },
    metrics,
    report: {
      dimension: "atención sostenida",
      commissionRatePct: metrics.commissionRatePct,
      omissionRatePct: metrics.omissionRatePct,
      goRtMeanMs: metrics.goRtMeanMs,
      goRtSdMs: metrics.goRtSdMs,
      preCommissionRtMs: metrics.preCommissionRtMs,
      preWithholdRtMs: metrics.preWithholdRtMs,
      scoredTrials: metrics.scoredTrials,
    },
    styleNote: focusFlowStyleNote(metrics),
  };
}

export function focusFlowStyleNote(m: {
  scoredTrials: number;
  commissionRatePct: number | null;
  omissionRatePct: number | null;
}): string {
  if (m.scoredTrials === 0) {
    return "Esta vez no alcanzamos a registrar respuestas suficientes para describir tu estilo.";
  }
  const commission = m.commissionRatePct ?? 0;
  const omission = m.omissionRatePct ?? 0;
  if (commission >= 50 && omission < 10) {
    return "Tu estilo es veloz y automático: mantienes el ritmo, y a veces el impulso gana al 3.";
  }
  if (omission >= 15) {
    return "Tu estilo es cauteloso: prefieres dejar pasar algún número antes que equivocarte.";
  }
  if (commission <= 25) {
    return "Lograste frenar a tiempo casi siempre: un buen equilibrio entre ritmo y control.";
  }
  return "Combinaste ritmo y control, con algunos momentos en que el impulso se adelantó.";
}
