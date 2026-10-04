import { describe, expect, it } from "vitest";

import { REACTION_TEST_CONFIG } from "@/lib/activities/config";
import { summarizeReactionTest } from "@/lib/activities/reaction-test/metrics";
import {
  classifyReaction,
  planReactionTrials,
} from "@/lib/activities/reaction-test/trials";
import { seededRng } from "@/lib/activities/rng";
import type { TrialRecord } from "@/lib/activities/types";

import { trial } from "./helpers";

function rtTrial(i: number, rtMs: number | null, extra: Partial<TrialRecord> = {}) {
  return trial({
    trialIndex: i,
    rtMs,
    classification: classifyReaction(rtMs, REACTION_TEST_CONFIG),
    inputType: "mouse",
    ...extra,
  });
}

describe("classifyReaction", () => {
  it("aplica los umbrales 100 / 500 ms", () => {
    expect(classifyReaction(99, REACTION_TEST_CONFIG)).toBe("anticipation");
    expect(classifyReaction(100, REACTION_TEST_CONFIG)).toBe("valid");
    expect(classifyReaction(500, REACTION_TEST_CONFIG)).toBe("valid");
    expect(classifyReaction(501, REACTION_TEST_CONFIG)).toBe("lapse");
    expect(classifyReaction(null, REACTION_TEST_CONFIG)).toBe("lapse");
  });
});

describe("planReactionTrials", () => {
  it("genera la cantidad configurada con esperas dentro del rango", () => {
    const plan = planReactionTrials(REACTION_TEST_CONFIG, "registered", seededRng(1));
    expect(plan).toHaveLength(REACTION_TEST_CONFIG.registeredTrials);
    for (const { isiMs } of plan) {
      expect(isiMs).toBeGreaterThanOrEqual(REACTION_TEST_CONFIG.isiMinMs);
      expect(isiMs).toBeLessThanOrEqual(REACTION_TEST_CONFIG.isiMaxMs);
    }
  });

  it("la práctica usa su propia cantidad de ensayos", () => {
    const plan = planReactionTrials(REACTION_TEST_CONFIG, "practice", seededRng(1));
    expect(plan).toHaveLength(REACTION_TEST_CONFIG.practiceTrials);
  });
});

describe("summarizeReactionTest", () => {
  it("calcula media, DE, mediana, lapsos y anticipaciones con datos conocidos", () => {
    const trials = [
      rtTrial(0, 200),
      rtTrial(1, 300),
      rtTrial(2, 400),
      rtTrial(3, 700), // lapso lento
      rtTrial(4, null), // lapso por tiempo agotado
      rtTrial(5, 50), // anticipación
      trial({ trialIndex: 6, classification: "anticipation", response: "early" }),
    ];
    const s = summarizeReactionTest(trials);
    expect(s.metrics.rtMeanMs).toBe(300);
    expect(s.metrics.rtSdMs).toBe(100);
    expect(s.metrics.rtMedianMs).toBe(300);
    expect(s.metrics.validResponses).toBe(3);
    expect(s.metrics.lapses).toBe(2);
    expect(s.metrics.timeouts).toBe(1);
    expect(s.metrics.anticipations).toBe(2);
    expect(s.metrics.slowest10PctMeanMs).toBe(700);
    expect(s.accuracy).toBeCloseTo(42.86, 2);
    expect(s.levelReached).toBeNull();
    expect(s.primary.value).toBe(300);
  });

  it("excluye ensayos invalidados por pérdida de visibilidad", () => {
    const s = summarizeReactionTest([
      rtTrial(0, 250),
      rtTrial(1, 260),
      rtTrial(2, 900, { valid: false, invalidReason: "visibility" }),
    ]);
    expect(s.metrics.scoredTrials).toBe(2);
    expect(s.metrics.invalidTrials).toBe(1);
    expect(s.metrics.lapses).toBe(0);
    expect(s.accuracy).toBe(100);
  });

  it("calcula la tendencia de vigilancia entre mitades", () => {
    const s = summarizeReactionTest([
      rtTrial(0, 200),
      rtTrial(1, 220),
      rtTrial(2, 300),
      rtTrial(3, 320),
    ]);
    expect(s.metrics.rtMeanFirstHalfMs).toBe(210);
    expect(s.metrics.rtMeanSecondHalfMs).toBe(310);
    expect(s.metrics.vigilanceTrendMs).toBe(100);
  });

  it("caso borde: cero ensayos", () => {
    const s = summarizeReactionTest([]);
    expect(s.accuracy).toBeNull();
    expect(s.metrics.rtMeanMs).toBeNull();
    expect(s.metrics.rtSdMs).toBeNull();
    expect(s.metrics.vigilanceTrendMs).toBeNull();
    expect(s.styleNote).toMatch(/no alcanzamos/);
  });

  it("caso borde: todos anticipaciones", () => {
    const s = summarizeReactionTest([rtTrial(0, 40), rtTrial(1, 60), rtTrial(2, 80)]);
    expect(s.metrics.anticipations).toBe(3);
    expect(s.metrics.rtMeanMs).toBeNull();
    expect(s.accuracy).toBe(0);
    expect(s.styleNote).toMatch(/anticipatorio/);
  });

  it("caso borde: todos fallidos (sin respuesta)", () => {
    const s = summarizeReactionTest([rtTrial(0, null), rtTrial(1, null), rtTrial(2, null)]);
    expect(s.metrics.lapses).toBe(3);
    expect(s.metrics.timeouts).toBe(3);
    expect(s.metrics.validResponses).toBe(0);
    expect(s.metrics.rtMeanMs).toBeNull();
    expect(s.metrics.slowest10PctMeanMs).toBeNull();
    expect(s.accuracy).toBe(0);
  });

  it("caso borde: cero ensayos válidos (todos invalidados)", () => {
    const s = summarizeReactionTest([
      rtTrial(0, 250, { valid: false, invalidReason: "visibility" }),
    ]);
    expect(s.metrics.scoredTrials).toBe(0);
    expect(s.accuracy).toBeNull();
  });

  it("DE nula con un solo TR válido", () => {
    const s = summarizeReactionTest([rtTrial(0, 250)]);
    expect(s.metrics.rtMeanMs).toBe(250);
    expect(s.metrics.rtSdMs).toBeNull();
  });
});
