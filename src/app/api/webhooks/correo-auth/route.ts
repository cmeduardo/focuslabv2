import { NextResponse, type NextRequest } from "next/server";

import { verificarFirmaWebhook } from "@/lib/email/firma-webhook";
import { enviarConGmail } from "@/lib/email/gmail";
import { correosParaEvento, type EventoCorreoAuth } from "@/lib/email/plantillas-auth";

// Send Email Hook de Supabase Auth: reemplaza el SMTP de Supabase y envía con Gmail.
// Supabase espera 200 con {} o {"error": {http_code, message}}.
function errorHook(httpCode: number, message: string) {
  return NextResponse.json({ error: { http_code: httpCode, message } }, { status: httpCode });
}

export async function POST(request: NextRequest) {
  const secreto = process.env.SEND_EMAIL_HOOK_SECRET;
  if (!secreto) {
    return errorHook(500, "Hook de correo sin configurar.");
  }

  const cuerpo = await request.text();
  const valida = verificarFirmaWebhook(
    cuerpo,
    {
      id: request.headers.get("webhook-id"),
      timestamp: request.headers.get("webhook-timestamp"),
      firma: request.headers.get("webhook-signature"),
    },
    secreto,
  );
  if (!valida) {
    return errorHook(401, "Firma inválida.");
  }

  let evento: EventoCorreoAuth;
  try {
    evento = JSON.parse(cuerpo) as EventoCorreoAuth;
  } catch {
    return errorHook(400, "Payload inválido.");
  }
  if (!evento?.user?.email || !evento?.email_data?.email_action_type) {
    return errorHook(400, "Payload inválido.");
  }

  const correos = correosParaEvento(evento, request.nextUrl.origin);
  try {
    for (const correo of correos) {
      await enviarConGmail(correo);
    }
  } catch (error) {
    console.error("[correo-auth]", evento.email_data.email_action_type, error);
    return errorHook(502, "No se pudo enviar el correo.");
  }

  // Supabase rechaza la respuesta si no trae Content-Type JSON, aunque sea 200.
  return NextResponse.json({});
}
