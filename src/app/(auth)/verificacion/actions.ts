"use server";

import { redirect } from "next/navigation";

import { enviarCodigoVerificacion, verificarCodigo } from "@/lib/services/verificacion-staff";

export type EnvioState = { error: string | null; esperaSegundos?: number };
export type VerificacionState = { error: string | null };

export async function enviarCodigo(): Promise<EnvioState> {
  return enviarCodigoVerificacion();
}

export async function verificar(
  _prevState: VerificacionState,
  formData: FormData,
): Promise<VerificacionState> {
  const codigo = String(formData.get("codigo") ?? "").replace(/\D/g, "");
  if (codigo.length !== 6) {
    return { error: "El código tiene 6 dígitos." };
  }

  const { error } = await verificarCodigo(codigo);
  if (error) {
    return { error };
  }

  redirect("/admin");
}
