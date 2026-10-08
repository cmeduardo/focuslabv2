import { describe, expect, it } from "vitest";

import { activeDays, buildActivityProgress, type ProgressRow } from "@/lib/activities/progress";

const row = (
  activity_type: ProgressRow["activity_type"],
  completed_at: string,
  metrics: Record<string, unknown>,
  level_reached: number | null = null,
): ProgressRow => ({ activity_type, completed_at, metrics, level_reached });

describe("buildActivityProgress", () => {
  it("sin intentos no inventa valores", () => {
    const p = buildActivityProgress("reaction_test", []);
    expect(p).toMatchObject({ attempts: 0, values: [], latest: null, best: null, latestIsBest: false });
  });

  it("en métricas de tiempo la mejor marca es la más baja", () => {
    const p = buildActivityProgress("reaction_test", [
      row("reaction_test", "2026-10-03T10:00:00Z", { rtMeanMs: 310.4 }),
      row("reaction_test", "2026-10-01T10:00:00Z", { rtMeanMs: 280 }),
      row("reaction_test", "2026-10-05T10:00:00Z", { rtMeanMs: 295 }),
    ]);
    expect(p.values).toEqual([280, 310.4, 295]);
    expect(p.latest).toBe("295 ms");
    expect(p.best).toBe("280 ms");
    expect(p.latestIsBest).toBe(false);
  });

  it("en Memory Matrix gana el nivel más alto y un empate cuenta como mejor marca", () => {
    const p = buildActivityProgress("memory_matrix", [
      row("memory_matrix", "2026-10-01T10:00:00Z", {}, 5),
      row("memory_matrix", "2026-10-02T10:00:00Z", {}, 4),
      row("memory_matrix", "2026-10-03T10:00:00Z", {}, 5),
    ]);
    expect(p.latest).toBe("5 bloques");
    expect(p.latestIsBest).toBe(true);
  });

  it("ignora intentos sin dato y otras actividades", () => {
    const p = buildActivityProgress("deep_read", [
      row("deep_read", "2026-10-01T10:00:00Z", { comprehensionScore: 6, questions: 8 }),
      row("deep_read", "2026-10-02T10:00:00Z", {}),
      row("word_sprint", "2026-10-02T10:00:00Z", { accuracyPct: 90 }),
    ]);
    expect(p.attempts).toBe(2);
    expect(p.values).toEqual([6]);
    expect(p.latest).toBe("6 de 8");
  });
});

describe("activeDays", () => {
  it("cuenta días en hora de Guatemala, no en UTC", () => {
    // 2026-10-02 04:00 UTC = 2026-10-01 22:00 en Guatemala.
    expect(
      activeDays([
        row("focus_flow", "2026-10-01T18:00:00Z", {}),
        row("focus_flow", "2026-10-02T04:00:00Z", {}),
        row("focus_flow", "2026-10-02T15:00:00Z", {}),
      ]),
    ).toBe(2);
  });
});
