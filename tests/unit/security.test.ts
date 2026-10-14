import { describe, expect, it } from "vitest";

import { validatePassword } from "@/lib/auth/password-policy";
import { safeRedirectPath } from "@/lib/auth/safe-redirect";
import { escapeCsv } from "@/lib/csv";

describe("validatePassword", () => {
  it("acepta una contraseña que cumple todas las reglas", () => {
    expect(validatePassword("Atencion#2026")).toBeNull();
  });

  it("lista lo que falta", () => {
    expect(validatePassword("corta")).toMatch(/10 caracteres.*mayúscula.*número.*símbolo/);
    expect(validatePassword("sinsimbolo2026A")).toMatch(/símbolo/);
  });

  it("no cuenta letras con tilde ni espacios como símbolo, igual que Supabase", () => {
    expect(validatePassword("Atención 2026a")).toMatch(/símbolo/);
  });

  it("rechaza contraseñas que contienen el correo", () => {
    expect(validatePassword("Juan.perez2026!", "juan.perez@umg.edu.gt")).toMatch(/correo/);
  });

  it("rechaza más de 72 bytes", () => {
    expect(validatePassword(`Aa1!${"x".repeat(80)}`)).toMatch(/demasiado larga/);
  });
});

describe("safeRedirectPath", () => {
  it("deja pasar rutas internas con query", () => {
    expect(safeRedirectPath("/informes/abc?x=1", "/dashboard")).toBe("/informes/abc?x=1");
  });

  it.each([
    "https://otro-sitio.com",
    "//otro-sitio.com",
    "/\\otro-sitio.com",
    "/\t/otro-sitio.com",
    "javascript:alert(1)",
    "dashboard",
    "",
    null,
  ])("manda %s al destino por defecto", (target) => {
    expect(safeRedirectPath(target, "/dashboard")).toBe("/dashboard");
  });
});

describe("escapeCsv", () => {
  it("neutraliza textos que Excel ejecutaría como fórmula", () => {
    expect(escapeCsv("=HYPERLINK(\"http://x\")")).toBe("\"'=HYPERLINK(\"\"http://x\"\")\"");
    expect(escapeCsv("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(escapeCsv("+1+1")).toBe("'+1+1");
  });

  it("no toca números negativos", () => {
    expect(escapeCsv(-12.5)).toBe("-12.5");
    expect(escapeCsv("-12.5")).toBe("-12.5");
  });

  it("entrecomilla comas, comillas y saltos de línea", () => {
    expect(escapeCsv("a,b")).toBe("\"a,b\"");
    expect(escapeCsv("a\r\nb")).toBe("\"a\r\nb\"");
  });
});
