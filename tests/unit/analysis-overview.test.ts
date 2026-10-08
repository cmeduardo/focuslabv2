import { describe, expect, it } from "vitest";

import { formatDia, participantsByDevice, participantsWithResults } from "@/lib/analysis/overview";

// Forma de vw_actividades_dimensiones con los datos de demostración: 16
// participantes en celular y 4 en laptop en cada desafío.
const DEMO = ["reaction_test", "focus_flow", "memory_matrix", "word_sprint", "pattern_hunt", "deep_read"].flatMap(
  (activity_type) => [
    { activity_type, device_type: "mobile", participantes: 16 },
    { activity_type, device_type: "desktop", participantes: "4" },
  ],
);

describe("participantsWithResults", () => {
  it("suma los dispositivos de cada desafío (20, no 16)", () => {
    expect(participantsWithResults(DEMO)).toBe(20);
  });

  it("toma el desafío con más participantes", () => {
    expect(
      participantsWithResults([
        { activity_type: "reaction_test", device_type: "mobile", participantes: 3 },
        { activity_type: "reaction_test", device_type: "desktop", participantes: 2 },
        { activity_type: "deep_read", device_type: "mobile", participantes: 4 },
      ]),
    ).toBe(5);
  });

  it("sin filas da 0", () => {
    expect(participantsWithResults([])).toBe(0);
  });
});

describe("participantsByDevice", () => {
  it("cuenta celular y laptop en Reaction Test", () => {
    const byDevice = participantsByDevice(DEMO);
    expect(byDevice.get("mobile")).toBe(16);
    expect(byDevice.get("desktop")).toBe(4);
  });
});

describe("formatDia", () => {
  it("bucket a medianoche UTC (vista anterior): no se corre al día previo", () => {
    expect(formatDia("2026-10-02T00:00:00+00:00")).toBe("02/10/2026");
  });

  it("bucket a medianoche de Guatemala (06:00 UTC)", () => {
    expect(formatDia("2026-10-02T06:00:00+00:00")).toBe("02/10/2026");
  });

  it("fecha simple y valores vacíos", () => {
    expect(formatDia("2026-12-31")).toBe("31/12/2026");
    expect(formatDia(null)).toBe("—");
    expect(formatDia("no es fecha")).toBe("—");
  });
});
