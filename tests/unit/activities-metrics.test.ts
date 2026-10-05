import { describe, expect, it } from "vitest";

import {
  FOCUS_FLOW_CONFIG,
  MEMORY_MATRIX_CONFIG,
  PATTERN_HUNT_CONFIG,
  WORD_SPRINT_CONFIG,
} from "@/lib/activities/config";
import { summarizeDeepRead } from "@/lib/activities/deep-read/metrics";
import { countWords, DEEP_READ_PASSAGE } from "@/lib/activities/deep-read/content";
import { summarizeFocusFlow } from "@/lib/activities/focus-flow/metrics";
import {
  classifyFocusFlow,
  hasAdjacentTargets,
  planFocusFlowTrials,
} from "@/lib/activities/focus-flow/trials";
import { summarizeMemoryMatrix } from "@/lib/activities/memory-matrix/metrics";
import {
  classifyCorsi,
  CORSI_BLOCK_SIZE_PCT,
  CORSI_BLOCKS,
  generateCorsiSequence,
  nextCorsiState,
} from "@/lib/activities/memory-matrix/trials";
import { summarizePatternHunt } from "@/lib/activities/pattern-hunt/metrics";
import { planPatternHuntTrials } from "@/lib/activities/pattern-hunt/trials";
import { seededRng } from "@/lib/activities/rng";
import type { TrialRecord } from "@/lib/activities/types";
import { summarizeWordSprint } from "@/lib/activities/word-sprint/metrics";
import { hasInkRepeat, planWordSprintTrials } from "@/lib/activities/word-sprint/trials";

import { trial } from "./helpers";

// ---------------------------------------------------------------- Focus Flow
describe("Focus Flow (SART)", () => {
  it("plan: 108 ensayos, 12 objetivos (11 %), sin dos 3 seguidos", () => {
    const plan = planFocusFlowTrials(FOCUS_FLOW_CONFIG, "registered", seededRng(3));
    expect(plan).toHaveLength(108);
    expect(plan.filter((t) => t.isTarget)).toHaveLength(12);
    expect(hasAdjacentTargets(plan.map((t) => t.digit), 3)).toBe(false);
    const practice = planFocusFlowTrials(FOCUS_FLOW_CONFIG, "practice", seededRng(3));
    expect(practice).toHaveLength(FOCUS_FLOW_CONFIG.practiceTrials);
    expect(practice.filter((t) => t.isTarget)).toHaveLength(1);
  });

  const ff = (i: number, isTarget: boolean, rtMs: number | null) => {
    const classification = classifyFocusFlow(isTarget, rtMs !== null);
    return trial({
      trialIndex: i,
      condition: { digit: isTarget ? 3 : 5, isTarget },
      rtMs,
      classification,
      correct: classification === "hit" || classification === "correct_withhold",
    });
  };

  it("comisiones, omisiones y TR en aciertos con datos conocidos", () => {
    const s = summarizeFocusFlow([
      ff(0, false, 300),
      ff(1, false, 400),
      ff(2, true, 250), // comisión
      ff(3, false, null), // omisión
      ff(4, true, null), // inhibición correcta
      ff(5, false, 500),
    ]);
    expect(s.metrics.commissions).toBe(1);
    expect(s.metrics.commissionRatePct).toBe(50);
    expect(s.metrics.omissions).toBe(1);
    expect(s.metrics.omissionRatePct).toBe(25);
    expect(s.metrics.goRtMeanMs).toBe(400);
    expect(s.metrics.goRtSdMs).toBe(100);
    expect(s.metrics.preCommissionRtMs).toBe(350);
    expect(s.accuracy).toBeCloseTo(66.67, 2);
    expect(s.primary.value).toBe(50);
  });

  it("caso borde: todos fallidos (responde a todo, incluso al 3)", () => {
    const s = summarizeFocusFlow([ff(0, true, 200), ff(1, true, 210)]);
    expect(s.metrics.commissionRatePct).toBe(100);
    expect(s.accuracy).toBe(0);
    expect(s.metrics.goRtMeanMs).toBeNull();
  });

  it("caso borde: cero ensayos", () => {
    const s = summarizeFocusFlow([]);
    expect(s.accuracy).toBeNull();
    expect(s.metrics.commissionRatePct).toBeNull();
    expect(s.styleNote).toMatch(/no alcanzamos/);
  });

  it("caso borde: cero ensayos válidos", () => {
    const s = summarizeFocusFlow([{ ...ff(0, false, 300), valid: false }]);
    expect(s.metrics.scoredTrials).toBe(0);
    expect(s.metrics.invalidTrials).toBe(1);
    expect(s.accuracy).toBeNull();
  });
});

// ------------------------------------------------------------- Memory Matrix
describe("Memory Matrix (Corsi)", () => {
  it("los bloques no se superponen ni salen del tablero", () => {
    for (const [i, a] of CORSI_BLOCKS.entries()) {
      expect(a.x + CORSI_BLOCK_SIZE_PCT).toBeLessThanOrEqual(100);
      expect(a.y + CORSI_BLOCK_SIZE_PCT).toBeLessThanOrEqual(100);
      for (const b of CORSI_BLOCKS.slice(i + 1)) {
        const apart =
          a.x + CORSI_BLOCK_SIZE_PCT <= b.x ||
          b.x + CORSI_BLOCK_SIZE_PCT <= a.x ||
          a.y + CORSI_BLOCK_SIZE_PCT <= b.y ||
          b.y + CORSI_BLOCK_SIZE_PCT <= a.y;
        expect(apart).toBe(true);
      }
    }
  });

  it("secuencias sin bloques repetidos", () => {
    const seq = generateCorsiSequence(9, 9, seededRng(1));
    expect(new Set(seq).size).toBe(9);
  });

  it("regla de avance: acierto sube, dos fallos terminan", () => {
    const c = MEMORY_MATRIX_CONFIG;
    expect(nextCorsiState({ length: 2, attempt: 1 }, true, c)).toEqual({ length: 3, attempt: 1 });
    expect(nextCorsiState({ length: 3, attempt: 1 }, false, c)).toEqual({ length: 3, attempt: 2 });
    expect(nextCorsiState({ length: 3, attempt: 2 }, true, c)).toEqual({ length: 4, attempt: 1 });
    expect(nextCorsiState({ length: 3, attempt: 2 }, false, c)).toBeNull();
    expect(nextCorsiState({ length: 9, attempt: 1 }, true, c)).toBeNull();
  });

  it("clasifica errores de orden y de bloque", () => {
    expect(classifyCorsi([1, 2, 3], [1, 2, 3])).toBe("correct");
    expect(classifyCorsi([1, 2, 3], [2, 1, 3])).toBe("order_error");
    expect(classifyCorsi([1, 2, 3], [1, 2, 4])).toBe("item_error");
  });

  const mm = (i: number, length: number, classification: string, rtMs: number) =>
    trial({
      trialIndex: i,
      condition: { length },
      rtMs,
      classification,
      correct: classification === "correct",
      detail: { firstTapMs: 500 },
    });

  it("span, secuencias correctas y tiempo por bloque", () => {
    const s = summarizeMemoryMatrix([
      mm(0, 2, "correct", 1000),
      mm(1, 3, "correct", 1800),
      mm(2, 4, "order_error", 2600),
      mm(3, 4, "correct", 2400),
      mm(4, 5, "item_error", 3000),
      mm(5, 5, "item_error", 3200),
    ]);
    expect(s.levelReached).toBe(4);
    expect(s.metrics.correctSequences).toBe(3);
    expect(s.metrics.orderErrors).toBe(1);
    expect(s.metrics.itemErrors).toBe(2);
    expect(s.metrics.meanMsPerBlock).toBe(Math.round((500 + 600 + 600) / 3));
    expect(s.accuracy).toBe(50);
  });

  it("caso borde: todos fallidos", () => {
    const s = summarizeMemoryMatrix([mm(0, 2, "item_error", 900), mm(1, 2, "order_error", 900)]);
    expect(s.levelReached).toBeNull();
    expect(s.accuracy).toBe(0);
    expect(s.metrics.meanResponseMs).toBeNull();
  });

  it("caso borde: cero ensayos", () => {
    const s = summarizeMemoryMatrix([]);
    expect(s.levelReached).toBeNull();
    expect(s.accuracy).toBeNull();
  });
});

// --------------------------------------------------------------- Word Sprint
describe("Word Sprint (Stroop)", () => {
  it("plan: 48 ensayos, 50 % congruentes, sin repetir tinta seguida", () => {
    const plan = planWordSprintTrials(WORD_SPRINT_CONFIG, "registered", seededRng(5));
    expect(plan).toHaveLength(48);
    expect(plan.filter((t) => t.congruent)).toHaveLength(24);
    expect(plan.filter((t) => !t.congruent).every((t) => t.word !== t.ink)).toBe(true);
    expect(hasInkRepeat(plan)).toBe(false);
  });

  const ws = (i: number, congruent: boolean, rtMs: number | null, outcome: string) =>
    trial({
      trialIndex: i,
      condition: { congruent },
      rtMs,
      classification: outcome,
      correct: outcome === "correct",
    });

  it("precisión, TR por condición e interferencia (solo aciertos)", () => {
    const s = summarizeWordSprint([
      ws(0, true, 500, "correct"),
      ws(1, true, 600, "correct"),
      ws(2, false, 700, "correct"),
      ws(3, false, 800, "correct"),
      ws(4, false, 400, "error"), // error rápido: no entra al TR
      ws(5, true, null, "timeout"),
    ]);
    expect(s.accuracy).toBeCloseTo(66.67, 2);
    expect(s.metrics.congruentRtMs).toBe(550);
    expect(s.metrics.incongruentRtMs).toBe(750);
    expect(s.metrics.interferenceMs).toBe(200);
    expect(s.metrics.timeouts).toBe(1);
    expect(s.metrics.errors).toBe(1);
  });

  it("caso borde: todos fallidos", () => {
    const s = summarizeWordSprint([ws(0, true, 500, "error"), ws(1, false, null, "timeout")]);
    expect(s.accuracy).toBe(0);
    expect(s.metrics.interferenceMs).toBeNull();
  });

  it("caso borde: cero ensayos", () => {
    expect(summarizeWordSprint([]).accuracy).toBeNull();
  });
});

// -------------------------------------------------------------- Pattern Hunt
describe("Pattern Hunt (búsqueda visual)", () => {
  it("plan: 48 ensayos balanceados; elementos sin superponerse", () => {
    const plan = planPatternHuntTrials(PATTERN_HUNT_CONFIG, "registered", seededRng(9));
    expect(plan).toHaveLength(48);
    expect(plan.filter((t) => t.present)).toHaveLength(24);
    expect(plan.filter((t) => t.type === "conjunction")).toHaveLength(24);
    const cell = 1 / PATTERN_HUNT_CONFIG.gridCols;
    for (const t of plan) {
      expect(t.items).toHaveLength(t.setSize);
      expect(t.items.filter((it) => it.isTarget)).toHaveLength(t.present ? 1 : 0);
      for (const [i, a] of t.items.entries()) {
        for (const b of t.items.slice(i + 1)) {
          // Los centros quedan al menos a (1 − 2·jitter) celdas en algún eje.
          const gap = Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
          expect(gap).toBeGreaterThanOrEqual(cell * (1 - 2 * PATTERN_HUNT_CONFIG.jitter) - 1e-9);
        }
      }
    }
  });

  const ph = (i: number, type: string, setSize: number, present: boolean, rtMs: number, ok: boolean) =>
    trial({
      trialIndex: i,
      condition: { type, setSize, present },
      rtMs,
      correct: ok,
      classification: present ? (ok ? "hit" : "miss") : ok ? "correct_rejection" : "false_alarm",
    });

  it("velocidad de detección y pendiente por tipo", () => {
    const s = summarizePatternHunt([
      ph(0, "conjunction", 6, true, 600, true),
      ph(1, "conjunction", 12, true, 720, true),
      ph(2, "conjunction", 18, true, 840, true),
      ph(3, "feature", 6, true, 500, true),
      ph(4, "feature", 18, true, 500, true),
      ph(5, "feature", 12, false, 650, true),
      ph(6, "conjunction", 18, true, 300, false), // fallo: no cuenta
    ]);
    expect(s.metrics.detectionSpeedMs).toBe(Math.round((600 + 720 + 840 + 500 + 500) / 5));
    expect(s.metrics.conjunctionPresentSlopeMsPerItem).toBe(20);
    expect(s.metrics.featurePresentSlopeMsPerItem).toBe(0);
    expect(s.metrics.misses).toBe(1);
    expect(s.accuracy).toBeCloseTo(85.71, 2);
  });

  it("caso borde: todos fallidos / cero ensayos", () => {
    const s = summarizePatternHunt([ph(0, "feature", 6, true, 500, false)]);
    expect(s.metrics.detectionSpeedMs).toBeNull();
    expect(s.metrics.featurePresentSlopeMsPerItem).toBeNull();
    expect(s.accuracy).toBe(0);
    expect(summarizePatternHunt([]).accuracy).toBeNull();
  });
});

// ----------------------------------------------------------------- Deep Read
describe("Deep Read", () => {
  it("el texto tiene entre 350 y 450 palabras y 8 preguntas", () => {
    expect(countWords(DEEP_READ_PASSAGE)).toBeGreaterThanOrEqual(350);
    expect(countWords(DEEP_READ_PASSAGE)).toBeLessThanOrEqual(450);
    expect(DEEP_READ_PASSAGE.questions).toHaveLength(8);
    for (const q of DEEP_READ_PASSAGE.questions) {
      expect(q.options.map((o) => o.id)).toContain(q.correctId);
    }
  });

  // Pistas de forma que permiten acertar sin leer: la correcta siempre la
  // más larga, o una opción mucho más corta/larga que las demás.
  it("la respuesta correcta no se delata por su largo", () => {
    const questions = DEEP_READ_PASSAGE.questions;
    const correctIsLongest = questions.filter((q) => {
      const longest = Math.max(...q.options.map((o) => o.text.length));
      return q.options.find((o) => o.id === q.correctId)!.text.length === longest;
    }).length;
    expect(correctIsLongest).toBeLessThanOrEqual(Math.ceil(questions.length / 4));
    for (const q of questions) {
      const lengths = q.options.map((o) => o.text.length);
      expect(Math.max(...lengths) / Math.min(...lengths), q.id).toBeLessThan(1.35);
    }
  });

  const reading: TrialRecord = trial({
    trialIndex: 0,
    condition: { kind: "reading", words: 400 },
    rtMs: 120_000,
    response: "done",
    detail: {
      visibilityExits: 1,
      notifications: [
        { id: "n1", outcome: "closed", reactionMs: 1500 },
        { id: "n2", outcome: "ignored", reactionMs: null },
        { id: "n3", outcome: "opened", reactionMs: 2500 },
      ],
    },
  });
  const q = (i: number, type: string, correct: boolean) =>
    trial({
      trialIndex: i,
      condition: { kind: "question", type },
      rtMs: 5000,
      correct,
      classification: correct ? "correct" : "incorrect",
      detail: { answerChanges: 1 },
    });

  it("comprensión, palabras por minuto y notificaciones", () => {
    const s = summarizeDeepRead([
      reading,
      q(1, "literal", true),
      q(2, "literal", true),
      q(3, "literal", false),
      q(4, "inference", true),
      q(5, "inference", false),
    ]);
    expect(s.primary.value).toBe(3);
    expect(s.accuracy).toBe(60);
    expect(s.metrics.wordsPerMinute).toBe(200);
    expect(s.metrics.notificationsClosed).toBe(1);
    expect(s.metrics.notificationsOpened).toBe(1);
    expect(s.metrics.notificationsIgnored).toBe(1);
    expect(s.metrics.meanNotificationReactionMs).toBe(2000);
    expect(s.metrics.visibilityExits).toBe(1);
    expect(s.metrics.inferenceCorrect).toBe(1);
    expect(s.metrics.answerChanges).toBe(5);
  });

  it("caso borde: todas incorrectas / cero preguntas", () => {
    const s = summarizeDeepRead([reading, q(1, "literal", false)]);
    expect(s.primary.value).toBe(0);
    expect(s.accuracy).toBe(0);
    const empty = summarizeDeepRead([]);
    expect(empty.primary.value).toBeNull();
    expect(empty.metrics.wordsPerMinute).toBeNull();
    expect(empty.accuracy).toBeNull();
  });
});

describe("Word Sprint: orden sin tinta repetida con muchas semillas", () => {
  it("se cumple en 200 semillas distintas", () => {
    for (let seed = 1; seed <= 200; seed++) {
      const plan = planWordSprintTrials(WORD_SPRINT_CONFIG, "registered", seededRng(seed));
      expect(plan).toHaveLength(48);
      expect(hasInkRepeat(plan)).toBe(false);
    }
  });
});
