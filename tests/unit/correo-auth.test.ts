import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { verificarFirmaWebhook } from "@/lib/email/firma-webhook";
import { correosParaEvento, type EventoCorreoAuth } from "@/lib/email/plantillas-auth";

const CLAVE = Buffer.from("clave-de-prueba-para-el-hook-123").toString("base64");
const SECRETO = `v1,whsec_${CLAVE}`;
const APP = "https://focuslab.example";

function firmar(cuerpo: string, id: string, ts: number) {
  const firma = createHmac("sha256", Buffer.from(CLAVE, "base64"))
    .update(`${id}.${ts}.${cuerpo}`)
    .digest("base64");
  return `v1,${firma}`;
}

function evento(tipo: string, extra: Partial<EventoCorreoAuth["email_data"]> = {}): EventoCorreoAuth {
  return {
    user: { email: "ana@example.com", user_metadata: { full_name: "Ana <b>" } },
    email_data: {
      token: "123456",
      token_hash: "hash-principal",
      redirect_to: "",
      email_action_type: tipo,
      site_url: "https://proyecto.supabase.co/auth/v1",
      token_new: "",
      token_hash_new: "",
      ...extra,
    },
  };
}

describe("verificarFirmaWebhook", () => {
  const cuerpo = JSON.stringify({ hola: "mundo" });
  const ahora = 1_800_000_000;

  it("acepta una firma válida", () => {
    const firma = firmar(cuerpo, "msg_1", ahora);
    expect(verificarFirmaWebhook(cuerpo, { id: "msg_1", timestamp: String(ahora), firma }, SECRETO, ahora)).toBe(true);
  });

  it("acepta si una de varias firmas coincide", () => {
    const firma = `v1,AAAA ${firmar(cuerpo, "msg_1", ahora)}`;
    expect(verificarFirmaWebhook(cuerpo, { id: "msg_1", timestamp: String(ahora), firma }, SECRETO, ahora)).toBe(true);
  });

  it("rechaza un cuerpo alterado", () => {
    const firma = firmar(cuerpo, "msg_1", ahora);
    expect(verificarFirmaWebhook(`${cuerpo} `, { id: "msg_1", timestamp: String(ahora), firma }, SECRETO, ahora)).toBe(false);
  });

  it("rechaza un timestamp viejo", () => {
    const viejo = ahora - 10 * 60;
    const firma = firmar(cuerpo, "msg_1", viejo);
    expect(verificarFirmaWebhook(cuerpo, { id: "msg_1", timestamp: String(viejo), firma }, SECRETO, ahora)).toBe(false);
  });

  it("rechaza si faltan cabeceras", () => {
    expect(verificarFirmaWebhook(cuerpo, { id: null, timestamp: String(ahora), firma: "v1,x" }, SECRETO, ahora)).toBe(false);
  });
});

describe("correosParaEvento", () => {
  it("arma el enlace de confirmación de registro hacia /auth/confirm", () => {
    const [correo] = correosParaEvento(evento("signup"), APP);
    expect(correo.para).toBe("ana@example.com");
    const url = new URL(correo.texto.match(/https:\/\/\S+/)![0]);
    // La base es la app, no el site_url de Supabase (que apunta a la API de Auth).
    expect(url.origin).toBe(APP);
    expect(url.pathname).toBe("/auth/confirm");
    expect(url.searchParams.get("token_hash")).toBe("hash-principal");
    expect(url.searchParams.get("type")).toBe("signup");
    expect(url.searchParams.get("next")).toBe("/consentimiento");
  });

  it("escapa el nombre en el HTML", () => {
    const [correo] = correosParaEvento(evento("signup"), APP);
    expect(correo.html).toContain("Ana &lt;b&gt;");
    expect(correo.html).not.toContain("Ana <b>");
  });

  it("lleva la recuperación a la página para elegir contraseña", () => {
    const [correo] = correosParaEvento(evento("recovery"), APP);
    const url = new URL(correo.texto.match(/https:\/\/\S+/)![0]);
    expect(url.searchParams.get("next")).toBe("/restablecer-contrasena");
  });

  it("ignora un redirect_to de otro dominio", () => {
    const [correo] = correosParaEvento(evento("signup", { redirect_to: "https://malo.example/robar" }), APP);
    const url = new URL(correo.texto.match(/https:\/\/\S+/)![0]);
    expect(url.searchParams.get("next")).toBe("/consentimiento");
  });

  it("respeta un redirect_to del mismo sitio", () => {
    const [correo] = correosParaEvento(evento("recovery", { redirect_to: "https://focuslab.example/restablecer-contrasena?x=1" }), APP);
    const url = new URL(correo.texto.match(/https:\/\/\S+/)![0]);
    expect(url.searchParams.get("next")).toBe("/restablecer-contrasena?x=1");
  });

  it("en cambio de correo seguro manda dos correos con los hashes cruzados", () => {
    const e = evento("email_change", { token_hash: "hash-para-nuevo", token_hash_new: "hash-para-actual" });
    e.user.new_email = "ana.nueva@example.com";
    const correos = correosParaEvento(e, APP);
    expect(correos.map((c) => c.para)).toEqual(["ana@example.com", "ana.nueva@example.com"]);
    expect(correos[0].texto).toContain("token_hash=hash-para-actual");
    expect(correos[1].texto).toContain("token_hash=hash-para-nuevo");
  });

  it("no manda nada para tipos que no maneja", () => {
    expect(correosParaEvento(evento("phone_changed_notification"), APP)).toEqual([]);
  });
});
