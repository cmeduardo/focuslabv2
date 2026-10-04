import { mean, percentage, round } from "@/lib/activities/stats";
import type { ActivitySummary, JsonObject, TrialRecord } from "@/lib/activities/types";

export type NotificationOutcome = "closed" | "opened" | "ignored" | "pending";

const asNotifications = (detail: JsonObject | null | undefined) =>
  (Array.isArray(detail?.notifications) ? detail.notifications : []) as {
    outcome?: NotificationOutcome;
    reactionMs?: number | null;
  }[];

// Métricas de Deep Read. El ensayo 0 es la lectura (tiempo, notificaciones,
// salidas de pestaña); los siguientes son las preguntas. Métrica principal:
// puntuación de comprensión (respuestas correctas).
export function summarizeDeepRead(trials: readonly TrialRecord[]): ActivitySummary {
  const reading = trials.find((t) => t.condition.kind === "reading");
  const questions = trials.filter((t) => t.condition.kind === "question");
  const correct = questions.filter((t) => t.correct === true);

  const words = Number(reading?.condition.words ?? 0);
  const readingMs = reading?.rtMs ?? null;
  const wpm = readingMs && readingMs > 0 ? round(words / (readingMs / 60_000)) : null;

  const notifications = asNotifications(reading?.detail);
  const count = (o: NotificationOutcome) => notifications.filter((n) => n.outcome === o).length;
  const reactions = notifications
    .filter((n) => n.outcome === "closed" || n.outcome === "opened")
    .map((n) => n.reactionMs)
    .filter((v): v is number => typeof v === "number");

  const ofType = (type: string) => questions.filter((t) => t.condition.type === type);
  const visibilityExits = Number(reading?.detail?.visibilityExits ?? 0);

  const metrics = {
    comprehensionScore: correct.length,
    questions: questions.length,
    literalCorrect: ofType("literal").filter((t) => t.correct === true).length,
    literalTotal: ofType("literal").length,
    inferenceCorrect: ofType("inference").filter((t) => t.correct === true).length,
    inferenceTotal: ofType("inference").length,
    readingTimeMs: readingMs === null ? null : round(readingMs),
    words,
    wordsPerMinute: wpm,
    readingCapped: reading?.response === "capped",
    notificationsShown: notifications.length,
    notificationsClosed: count("closed"),
    notificationsOpened: count("opened"),
    notificationsIgnored: count("ignored"),
    meanNotificationReactionMs: round(mean(reactions)),
    visibilityExits,
    meanQuestionRtMs: round(
      mean(questions.map((t) => t.rtMs).filter((rt): rt is number => rt !== null)),
    ),
    answerChanges: questions.reduce((sum, t) => sum + Number(t.detail?.answerChanges ?? 0), 0),
  };

  return {
    accuracy: percentage(correct.length, questions.length),
    levelReached: null,
    primary: {
      key: "comprehensionScore",
      label: "Puntuación de comprensión",
      value: questions.length > 0 ? correct.length : null,
      unit: `de ${questions.length}`,
    },
    metrics,
    report: {
      dimension: "resistencia a la distracción durante la lectura",
      comprehensionScore: metrics.comprehensionScore,
      questions: metrics.questions,
      literalCorrect: metrics.literalCorrect,
      inferenceCorrect: metrics.inferenceCorrect,
      readingTimeMs: metrics.readingTimeMs,
      wordsPerMinute: wpm,
      notificationsShown: metrics.notificationsShown,
      notificationsClosed: metrics.notificationsClosed,
      notificationsOpened: metrics.notificationsOpened,
      notificationsIgnored: metrics.notificationsIgnored,
      visibilityExits,
    },
    styleNote: deepReadStyleNote(metrics),
  };
}

export function deepReadStyleNote(m: {
  questions: number;
  comprehensionScore: number;
  notificationsOpened: number;
  notificationsIgnored: number;
  notificationsShown: number;
  visibilityExits: number;
}): string {
  if (m.questions === 0) {
    return "Esta vez no alcanzamos a registrar respuestas suficientes para describir tu estilo.";
  }
  const strong = m.comprehensionScore >= Math.ceil(m.questions * 0.8);
  if (m.visibilityExits > 0) {
    return "Saliste de la lectura en algún momento: retomar el hilo es parte de tu estilo de lectura.";
  }
  if (m.notificationsShown > 0 && m.notificationsIgnored === m.notificationsShown) {
    return strong
      ? "Te sumergiste en el texto: las notificaciones pasaron sin sacarte de la lectura."
      : "Seguiste leyendo sin atender las notificaciones; el texto tenía muchos datos finos para retener.";
  }
  if (m.notificationsOpened > 0) {
    return "Las notificaciones despertaron tu curiosidad: tu atención se reparte entre la lectura y lo que pasa alrededor.";
  }
  return strong
    ? "Despejaste las interrupciones y volviste al texto: retuviste muy bien los detalles."
    : "Despejaste las interrupciones con rapidez; los detalles más finos del texto fueron el mayor reto.";
}
