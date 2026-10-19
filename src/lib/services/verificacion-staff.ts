import "server-only";

import { createHash, randomInt, timingSafeEqual } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { isStaffRole } from "@/lib/constants/nav";
import { enviarConGmail } from "@/lib/email/gmail";
import { correoCodigoVerificacion } from "@/lib/email/plantillas-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database";

// Segundo factor del staff: código de 6 dígitos por correo, ligado a la sesión
// de Supabase Auth. La base lo exige en las políticas (supabase/migrations/20261020000000).
export const CODIGO_VIGENCIA_MIN = 10;
export const CODIGO_MAX_INTENTOS = 5;
export const REENVIO_ESPERA_S = 60;

type Client = SupabaseClient<Database>;

type SesionStaff = {
  perfilId: string;
  sesionId: string;
  email: string;
  nombre: string | null;
};

export async function sesionStaffVerificada(supabase: Client) {
  const { data } = await supabase.rpc("sesion_staff_verificada");
  return data === true;
}

async function sesionStaffActual(): Promise<SesionStaff | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub || typeof claims.session_id !== "string" || !claims.email) {
    return null;
  }

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("rol, nombre_completo")
    .eq("id", claims.sub)
    .single();
  if (!isStaffRole(perfil?.rol)) {
    return null;
  }

  return {
    perfilId: claims.sub,
    sesionId: claims.session_id,
    email: claims.email,
    nombre: perfil.nombre_completo,
  };
}

// La sesión entra en el hash para que un código no sirva en otra sesión.
function hashCodigo(sesionId: string, codigo: string) {
  return createHash("sha256").update(`${sesionId}:${codigo}`).digest("hex");
}

export async function enviarCodigoVerificacion(): Promise<{
  error: string | null;
  esperaSegundos?: number;
}> {
  const sesion = await sesionStaffActual();
  if (!sesion) {
    return { error: "Tu sesión venció. Vuelve a iniciar sesión." };
  }

  const admin = createAdminClient();
  const { data: actual } = await admin
    .from("verificaciones_sesion")
    .select("enviado_en, verificada_en")
    .eq("sesion_auth_id", sesion.sesionId)
    .maybeSingle();

  if (actual?.verificada_en) {
    return { error: null };
  }

  if (actual) {
    const transcurrido = (Date.now() - new Date(actual.enviado_en).getTime()) / 1000;
    if (transcurrido < REENVIO_ESPERA_S) {
      return { error: null, esperaSegundos: Math.ceil(REENVIO_ESPERA_S - transcurrido) };
    }
  }

  const codigo = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const ahora = new Date();
  const { error: errorGuardar } = await admin.from("verificaciones_sesion").upsert({
    sesion_auth_id: sesion.sesionId,
    perfil_id: sesion.perfilId,
    codigo_hash: hashCodigo(sesion.sesionId, codigo),
    intentos: 0,
    enviado_en: ahora.toISOString(),
    expira_en: new Date(ahora.getTime() + CODIGO_VIGENCIA_MIN * 60_000).toISOString(),
    verificada_en: null,
  });
  if (errorGuardar) {
    console.error("[verificacion-staff] guardar", errorGuardar);
    return { error: "No pudimos generar el código. Intenta de nuevo." };
  }

  // .test es un dominio reservado que no recibe correo (cuentas de las pruebas E2E):
  // enviarlo solo produciría un rebote en la cuenta remitente.
  if (sesion.email.endsWith(".test")) {
    return { error: null, esperaSegundos: REENVIO_ESPERA_S };
  }

  try {
    await enviarConGmail(
      correoCodigoVerificacion(sesion.email, sesion.nombre, codigo, CODIGO_VIGENCIA_MIN),
    );
  } catch (error) {
    console.error("[verificacion-staff] enviar", error);
    return { error: "No pudimos enviar el código. Intenta de nuevo en un momento." };
  }

  return { error: null, esperaSegundos: REENVIO_ESPERA_S };
}

export async function verificarCodigo(codigo: string): Promise<{ error: string | null }> {
  const sesion = await sesionStaffActual();
  if (!sesion) {
    return { error: "Tu sesión venció. Vuelve a iniciar sesión." };
  }

  const admin = createAdminClient();
  const { data: fila } = await admin
    .from("verificaciones_sesion")
    .select("codigo_hash, intentos, expira_en, verificada_en")
    .eq("sesion_auth_id", sesion.sesionId)
    .maybeSingle();

  if (!fila) {
    return { error: "Pide un código primero." };
  }
  if (fila.verificada_en) {
    return { error: null };
  }
  if (fila.intentos >= CODIGO_MAX_INTENTOS) {
    return { error: "Demasiados intentos. Pide un código nuevo." };
  }
  if (new Date(fila.expira_en).getTime() < Date.now()) {
    return { error: "El código venció. Pide uno nuevo." };
  }

  const esperado = Buffer.from(fila.codigo_hash, "hex");
  const recibido = Buffer.from(hashCodigo(sesion.sesionId, codigo), "hex");
  if (esperado.length !== recibido.length || !timingSafeEqual(esperado, recibido)) {
    const intentos = fila.intentos + 1;
    await admin
      .from("verificaciones_sesion")
      .update({ intentos })
      .eq("sesion_auth_id", sesion.sesionId);
    const restantes = CODIGO_MAX_INTENTOS - intentos;
    return {
      error:
        restantes > 0
          ? `Código incorrecto. Te ${restantes === 1 ? "queda 1 intento" : `quedan ${restantes} intentos`}.`
          : "Demasiados intentos. Pide un código nuevo.",
    };
  }

  await admin
    .from("verificaciones_sesion")
    .update({ verificada_en: new Date().toISOString() })
    .eq("sesion_auth_id", sesion.sesionId);
  return { error: null };
}

// Para mostrar a qué correo llegó el código sin escribirlo completo.
export function enmascararCorreo(email: string) {
  const [usuario, dominio] = email.split("@");
  if (!dominio) {
    return email;
  }
  const visible = usuario.slice(0, Math.min(2, usuario.length));
  return `${visible}${"•".repeat(Math.max(usuario.length - visible.length, 3))}@${dominio}`;
}
