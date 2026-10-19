import { describe, expect, it } from "vitest";

import { pickFirstAttempts, type ActivityResultRow } from "@/lib/activities/report";

const row = (tipo_actividad: string, precision: number): ActivityResultRow => ({
  tipo_actividad,
  precision,
  nivel_alcanzado: null,
  duracion_ms: 1000,
  metricas: {},
  version_protocolo: "v2",
  intento_id: null,
});

describe("pickFirstAttempts", () => {
  it("toma el primer intento de cada actividad y cuenta los demás", () => {
    const picked = pickFirstAttempts([
      row("reaction_test", 80),
      row("word_sprint", 90),
      row("reaction_test", 95),
    ]);
    expect(picked).toHaveLength(2);
    expect(picked[0]).toMatchObject({ attempts: 2, first: { precision: 80 } });
    expect(picked[1]).toMatchObject({ attempts: 1, first: { precision: 90 } });
  });
});
