import { createHmac, timingSafeEqual } from "node:crypto";

// Firma de Standard Webhooks, la que usan los Auth Hooks de Supabase.
// El secreto llega como "v1,whsec_<base64>".
const TOLERANCIA_SEGUNDOS = 5 * 60;

export function verificarFirmaWebhook(
  cuerpo: string,
  cabeceras: { id: string | null; timestamp: string | null; firma: string | null },
  secreto: string,
  ahoraSegundos = Math.floor(Date.now() / 1000),
) {
  const { id, timestamp, firma } = cabeceras;
  if (!id || !timestamp || !firma) {
    return false;
  }

  const ts = Number(timestamp);
  if (!Number.isInteger(ts) || Math.abs(ahoraSegundos - ts) > TOLERANCIA_SEGUNDOS) {
    return false;
  }

  const clave = Buffer.from(secreto.replace(/^v1,/, "").replace(/^whsec_/, ""), "base64");
  const esperada = createHmac("sha256", clave)
    .update(`${id}.${timestamp}.${cuerpo}`)
    .digest();

  // La cabecera puede traer varias firmas separadas por espacio ("v1,<b64> v1,<b64>").
  return firma.split(" ").some((parte) => {
    const [version, valor] = parte.split(",");
    if (version !== "v1" || !valor) {
      return false;
    }
    const recibida = Buffer.from(valor, "base64");
    return recibida.length === esperada.length && timingSafeEqual(recibida, esperada);
  });
}
