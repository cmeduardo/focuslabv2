import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

// Lenguaje no clínico en el panel del investigador y la autoridad: ninguno
// de estos términos puede aparecer en texto visible (títulos, etiquetas,
// tooltips, ayudas, mensajes). Se revisan las cadenas y el texto JSX, no
// los comentarios ni los identificadores (p. ej. "normalizar" en código no
// cuenta: se comparan palabras completas). El guion cuenta como parte de
// la palabra, para no confundir clases de Tailwind como "font-normal".
const FORBIDDEN = [
  "diagnostico",
  "prueba",
  "trastorno",
  "deficit",
  "tdah",
  "sintoma",
  "evaluacion",
  "normal",
  "anormal",
];

const ROOTS = ["src/app/admin", "src/components/admin", "src/components/analysis", "src/lib/analysis"];

function files(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return files(full);
    return /\.(tsx?|jsx?)$/.test(entry.name) ? [full] : [];
  });
}

const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

export function visibleText(source: string): string[] {
  const code = source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
  const strings = [...code.matchAll(/"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g)].map(
    (m) => m[1] ?? m[2] ?? m[3] ?? "",
  );
  // Texto entre etiquetas JSX: >texto<
  const jsx = [...code.matchAll(/>([^<>{}]*[A-Za-zÁÉÍÓÚáéíóúñÑ][^<>{}]*)</g)].map((m) => m[1]);
  return [...strings, ...jsx];
}

export function forbiddenIn(texts: string[]): string[] {
  const hits: string[] = [];
  for (const text of texts) {
    const n = normalize(text);
    for (const term of FORBIDDEN) {
      if (new RegExp(`(^|[^a-z0-9ñ-])${term}(es|s)?([^a-z0-9ñ-]|$)`).test(n)) hits.push(`${term} ← "${text.trim()}"`);
    }
  }
  return hits;
}

describe("lenguaje del panel administrativo", () => {
  it("detecta los términos sin importar mayúsculas ni tildes, y no confunde palabras parecidas", () => {
    expect(forbiddenIn(["Evaluación del grupo"])).toHaveLength(1);
    expect(forbiddenIn(["Valores NORMALES"])).toHaveLength(1);
    expect(forbiddenIn(["normalizar los datos", "pruebas", "anormalmente"]).map((h) => h.split(" ")[0])).toEqual([
      "prueba",
    ]);
    expect(forbiddenIn(["py-1 font-normal"])).toEqual([]);
    expect(visibleText('// prueba en comentario\nconst a = "texto";')).toEqual(["texto"]);
  });

  const all = ROOTS.flatMap(files);

  it("revisa archivos", () => {
    expect(all.length).toBeGreaterThan(5);
  });

  for (const file of all) {
    it(`sin términos clínicos visibles: ${file}`, () => {
      expect(forbiddenIn(visibleText(fs.readFileSync(file, "utf8")))).toEqual([]);
    });
  }
});
