import fs from "node:fs";

import { describe, expect, it } from "vitest";

import {
  completedPerPerson,
  participantsPerActivity,
  sessionTotals,
} from "@/lib/analysis/overview";
import {
  correlationMatrix,
  distribution,
  pearson,
  personDetail,
  populationSd,
  profiles,
  quantile,
  styleCounts,
  styleOf,
  toLong,
  toNumber,
  tramoOf,
  type ParticipantRow,
} from "@/lib/analysis/participants";
import { firstRunOnly, rtHistogram, searchMeans, stroopMeans, type TrialRow } from "@/lib/analysis/trials";

const person = (
  participante: string,
  dispositivo: string | null,
  values: Record<string, number | string | null>,
): ParticipantRow => ({ participante, dispositivo_principal: dispositivo, ...values });

// Tres personas en celular (z calculable) y una sola en laptop (no).
const ROWS: ParticipantRow[] = [
  person("P-AAAAAA", "mobile", { cambios_pestana_por_sesion: 1, mm_span: 4, rt_promedio_ms: 300 }),
  person("P-BBBBBB", "mobile", { cambios_pestana_por_sesion: 2, mm_span: 5, rt_promedio_ms: 300 }),
  person("P-CCCCCC", "mobile", { cambios_pestana_por_sesion: "3", mm_span: 6, rt_promedio_ms: 300 }),
  person("P-DDDDDD", "desktop", { cambios_pestana_por_sesion: 9, mm_span: null }),
];

describe("estadística base", () => {
  it("desviación poblacional (STDEV.P)", () => {
    expect(populationSd([2, 4, 4, 4, 5, 5, 7, 9])).toBe(2);
  });

  it("percentil inclusivo (PERCENTILE.INC)", () => {
    expect(quantile([4, 1, 3, 2], 0.25)).toBe(1.75);
    expect(quantile([1, 2, 3, 4], 0.5)).toBe(2.5);
    expect(quantile([7], 0.75)).toBe(7);
  });

  it("tramos de igual ancho", () => {
    expect(tramoOf(0, 0, 10)).toBe(1);
    expect(tramoOf(2, 0, 10)).toBe(2);
    expect(tramoOf(5, 0, 10)).toBe(3);
    expect(tramoOf(10, 0, 10)).toBe(5);
    expect(tramoOf(4, 4, 4)).toBe(1);
  });

  it("Pearson: exige 5 pares y variación", () => {
    const line = [1, 2, 3, 4, 5].map((x) => [x, 2 * x + 1] as const);
    expect(pearson(line).r).toBeCloseTo(1);
    expect(pearson(line.map(([x, y]) => [x, -y] as const)).r).toBeCloseTo(-1);
    expect(pearson(line.slice(0, 4))).toEqual({ r: null, n: 4 });
    expect(pearson([1, 2, 3, 4, 5].map((x) => [x, 3] as const)).r).toBeNull();
  });

  it("los nulos no cuentan como 0", () => {
    expect(toNumber(null)).toBeNull();
    expect(toNumber("")).toBeNull();
    expect(toNumber("2.5")).toBe(2.5);
    expect(toNumber(0)).toBe(0);
  });
});

describe("formato largo y puntaje z por dispositivo", () => {
  const long = toLong(ROWS);

  it("excluye nulos y agrupa por dispositivo", () => {
    expect(long.filter((l) => l.variable === "mm_span")).toHaveLength(3);
    expect(long.find((l) => l.participante === "P-DDDDDD")?.dispositivo).toBe("desktop");
  });

  it("z dentro del grupo de dispositivo, con desviación poblacional", () => {
    const z = (p: string) =>
      long.find((l) => l.participante === p && l.variable === "cambios_pestana_por_sesion")?.z;
    expect(z("P-AAAAAA")).toBeCloseTo(-1.2247, 3);
    expect(z("P-BBBBBB")).toBeCloseTo(0);
    expect(z("P-CCCCCC")).toBeCloseTo(1.2247, 3);
    // Grupo de laptop con una sola persona: sin z.
    expect(z("P-DDDDDD")).toBeNull();
  });

  it("sin variación en el grupo, z queda vacío", () => {
    expect(long.filter((l) => l.variable === "rt_promedio_ms").every((l) => l.z === null)).toBe(true);
  });

  it("distribución por tramos con resumen de cinco números", () => {
    const [mobile] = distribution(long, "cambios_pestana_por_sesion").filter(
      (d) => d.dispositivo === "mobile",
    );
    expect(mobile).toMatchObject({ n: 3, min: 1, mediana: 2, max: 3, tramos: [1, 0, 1, 0, 1] });
  });
});

describe("índices y estilos atencionales", () => {
  it("cuadrantes, con 0 del lado sereno / fluido", () => {
    expect(styleOf(0, 0)).toBe("sereno_fluido");
    expect(styleOf(0.1, -0.1)).toBe("activo_buen_ritmo");
    expect(styleOf(-0.1, 0.1)).toBe("sereno_exigente");
    expect(styleOf(0.1, 0.1)).toBe("activo_exigente");
    expect(styleOf(null, 1)).toBe("sin_datos");
  });

  it("invierte el signo de span en la dificultad", () => {
    const byId = new Map(profiles(ROWS).map((p) => [p.participante, p]));
    // Menos cambios de pestaña (pasivo < 0) y span más bajo (más dificultad).
    expect(byId.get("P-AAAAAA")?.estilo).toBe("sereno_exigente");
    expect(byId.get("P-AAAAAA")?.dificultad).toBeCloseTo(1.2247, 3);
    expect(byId.get("P-BBBBBB")?.estilo).toBe("sereno_fluido");
    expect(byId.get("P-CCCCCC")?.estilo).toBe("activo_buen_ritmo");
    expect(byId.get("P-DDDDDD")?.estilo).toBe("sin_datos");
  });

  it("perfil individual: promedio y percentil dentro de su grupo", () => {
    const detail = personDetail(toLong(ROWS), "P-AAAAAA");
    const tabs = detail.find((d) => d.variable === "cambios_pestana_por_sesion")!;
    expect(tabs).toMatchObject({ valor: 1, promedioGrupo: 2, nGrupo: 3 });
    expect(tabs.percentil).toBeCloseTo(1 / 3);
  });
});

describe("recorrido del taller", () => {
  it("sesiones por estado y porcentaje completado", () => {
    const totals = sessionTotals([
      { status: "completada", total_sesiones: 18 },
      { status: "completada", total_sesiones: "2" },
      { status: "abandonada", total_sesiones: 5 },
    ]);
    expect(totals).toMatchObject({ total: 25, completadas: 20, pctCompletadas: 80 });
  });

  it("participantes por desafío y desafíos por persona", () => {
    expect(
      participantsPerActivity([
        { activity_type: "deep_read", device_type: "mobile", participantes: 16 },
        { activity_type: "deep_read", device_type: "desktop", participantes: 4 },
      ]).get("deep_read"),
    ).toBe(20);
    expect(completedPerPerson([{ actividades_completadas: 6 }, { actividades_completadas: 6 }, { actividades_completadas: 2 }])).toEqual([
      { completados: 1, n: 0 },
      { completados: 2, n: 1 },
      { completados: 3, n: 0 },
      { completados: 4, n: 0 },
      { completados: 5, n: 0 },
      { completados: 6, n: 2 },
    ]);
  });
});

describe("detalle por ensayo", () => {
  const trial = (over: Partial<TrialRow>): TrialRow => ({
    participante: "P-AAAAAA",
    activity_type: "reaction_test",
    device_type: "mobile",
    corrida_inicio: "2026-10-04T10:00:00Z",
    condition: {},
    rt_ms: 300,
    correct: true,
    valid: true,
    ...over,
  });

  it("usa solo el primer intento de cada desafío", () => {
    const rows = [trial({}), trial({ corrida_inicio: "2026-10-04T11:00:00Z", rt_ms: 999 })];
    expect(firstRunOnly(rows).map((r) => r.rt_ms)).toEqual([300]);
  });

  it("histograma de 50 ms con intervalos vacíos y solo ensayos válidos", () => {
    const [mobile] = rtHistogram([
      trial({ rt_ms: 260 }),
      trial({ rt_ms: 401 }),
      trial({ rt_ms: 999, valid: false }),
      trial({ rt_ms: null }),
    ]);
    expect(mobile.n).toBe(2);
    expect(mobile.bins.map((b) => [b.etiqueta, b.n])).toEqual([
      ["250–299", 1],
      ["300–349", 0],
      ["350–399", 0],
      ["400–449", 1],
    ]);
  });

  it("Word Sprint y Pattern Hunt: solo respuestas correctas, por condición", () => {
    const ws = stroopMeans([
      trial({ activity_type: "word_sprint", condition: { congruent: true }, rt_ms: 500 }),
      trial({ activity_type: "word_sprint", condition: { congruent: false }, rt_ms: 600 }),
      trial({ activity_type: "word_sprint", condition: { congruent: false }, rt_ms: 700 }),
      trial({ activity_type: "word_sprint", condition: { congruent: false }, rt_ms: 100, correct: false }),
    ]);
    expect(ws.find((c) => c.condicion === "incongruente")).toMatchObject({ promedio: 650, n: 2 });
    const ph = searchMeans([
      trial({ activity_type: "pattern_hunt", condition: { type: "conjunction", setSize: 12 }, rt_ms: 900 }),
      trial({ activity_type: "pattern_hunt", condition: { type: "conjunction", setSize: 6 }, rt_ms: 700 }),
    ]);
    expect(ph.map((c) => c.tamano)).toEqual([6, 12]);
  });
});

// ----------------------------------------------------------------------
// Cifras de control de Power BI (datos de demostración, 20 participantes).
// Para correrla: en /admin → "Participantes (seudónimo)" descargar el CSV y
// guardarlo como tests/fixtures/demo-participantes.csv. Sin el archivo, se
// omite.
const FIXTURE = "tests/fixtures/demo-participantes.csv";

function parseCsv(text: string): ParticipantRow[] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((f) => f !== "")) rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field || row.length) rows.push([...row, field]);
  const [header, ...body] = rows;
  return body.map(
    (cells) =>
      Object.fromEntries(header.map((h, i) => [h, cells[i] === "" ? null : cells[i]])) as ParticipantRow,
  );
}

describe.runIf(fs.existsSync(FIXTURE))("cifras de control (Power BI)", () => {
  const rows = fs.existsSync(FIXTURE) ? parseCsv(fs.readFileSync(FIXTURE, "utf8")) : [];

  it("20 participantes: 16 en celular y 4 en laptop", () => {
    expect(rows).toHaveLength(20);
    expect(rows.filter((r) => r.dispositivo_principal === "mobile")).toHaveLength(16);
    expect(rows.filter((r) => r.dispositivo_principal === "desktop")).toHaveLength(4);
  });

  it("estilos: 8 / 1 / 5 / 6", () => {
    const counts = Object.fromEntries(styleCounts(profiles(rows)).map((s) => [s.id, s.n]));
    expect(counts).toMatchObject({
      sereno_fluido: 8,
      activo_buen_ritmo: 1,
      sereno_exigente: 5,
      activo_exigente: 6,
    });
  });

  it("r(cambios de pestaña por sesión, comisiones en Focus Flow) ≈ 0.77", () => {
    const cell = correlationMatrix(rows).find(
      (c) => c.pasiva === "cambios_pestana_por_sesion" && c.cognitiva === "ff_comision_pct",
    )!;
    expect(cell.r).toBeCloseTo(0.77, 2);
  });
});
