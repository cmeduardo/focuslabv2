import { describe, expect, it } from "vitest";

import { pickFirstAttempts, type ActivityResultRow } from "@/lib/activities/report";

const row = (activity_type: string, accuracy: number): ActivityResultRow => ({
  activity_type,
  accuracy,
  level_reached: null,
  duration_ms: 1000,
  metrics: {},
  protocol_version: "v2",
  run_id: null,
});

describe("pickFirstAttempts", () => {
  it("toma el primer intento de cada actividad y cuenta los demás", () => {
    const picked = pickFirstAttempts([
      row("reaction_test", 80),
      row("word_sprint", 90),
      row("reaction_test", 95),
    ]);
    expect(picked).toHaveLength(2);
    expect(picked[0]).toMatchObject({ attempts: 2, first: { accuracy: 80 } });
    expect(picked[1]).toMatchObject({ attempts: 1, first: { accuracy: 90 } });
  });
});
