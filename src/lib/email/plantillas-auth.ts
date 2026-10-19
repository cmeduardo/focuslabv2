import { safeRedirectPath } from "@/lib/auth/safe-redirect";

import type { CorreoSaliente } from "@/lib/email/gmail";

// Payload del Send Email Hook de Supabase (solo los campos que usamos).
export type EventoCorreoAuth = {
  user: { email: string; new_email?: string; user_metadata?: { full_name?: string } };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: string;
    site_url: string;
    token_new: string;
    token_hash_new: string;
  };
};

export const RUTA_RESTABLECER = "/restablecer-contrasena";

// Adónde lleva cada enlace después de /auth/confirm si redirect_to no indica otra ruta.
const DESTINO_POR_TIPO: Record<string, string> = {
  signup: "/consentimiento",
  invite: "/consentimiento",
  magiclink: "/dashboard",
  recovery: RUTA_RESTABLECER,
  email_change: "/dashboard",
};

function escaparHtml(valor: string) {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function origenDe(url: string) {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

// Solo se respeta redirect_to si apunta a la app; si no, se usa el destino del tipo.
function destino(evento: EventoCorreoAuth, tipo: string, origenApp: string) {
  const fallback = DESTINO_POR_TIPO[tipo] ?? "/dashboard";
  const { redirect_to } = evento.email_data;
  if (!redirect_to || origenDe(redirect_to) !== origenApp) {
    return fallback;
  }
  const url = new URL(redirect_to);
  const ruta = url.pathname === "/" ? fallback : `${url.pathname}${url.search}`;
  return safeRedirectPath(ruta, fallback);
}

// email_data.site_url es la URL de la API de Auth (…supabase.co/auth/v1), no la de la app:
// la base del enlace es el origen donde corre el hook, que es la propia app.
export function enlaceConfirmacion(
  evento: EventoCorreoAuth,
  tokenHash: string,
  tipo: string,
  origenApp: string,
) {
  const params = new URLSearchParams({
    token_hash: tokenHash,
    type: tipo,
    next: destino(evento, tipo, origenApp),
  });
  return `${origenApp}/auth/confirm?${params.toString()}`;
}

function saludo(evento: EventoCorreoAuth) {
  return saludoPara(evento.user.user_metadata?.full_name);
}

function saludoPara(nombre: string | null | undefined) {
  const limpio = nombre?.trim();
  return limpio ? `Hola, ${limpio}:` : "Hola:";
}

function maquetar(saludoTexto: string, parrafos: string[], boton?: { texto: string; url: string }) {
  const cuerpoHtml = parrafos.map((p) => `<p style="margin:0 0 16px">${escaparHtml(p)}</p>`).join("");
  const botonHtml = boton
    ? `<p style="margin:24px 0"><a href="${escaparHtml(boton.url)}" style="background:#4f46e5;color:#ffffff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">${escaparHtml(boton.texto)}</a></p>` +
      `<p style="margin:0 0 16px;font-size:13px;color:#6b7280">Si el botón no funciona, copia este enlace en tu navegador:<br><span style="word-break:break-all">${escaparHtml(boton.url)}</span></p>`
    : "";
  const pie =
    "Recibiste este correo porque alguien usó esta dirección en FocusLab. Si no fuiste tú, puedes ignorarlo.";

  const html = `<!doctype html><html lang="es"><body style="margin:0;padding:24px;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;line-height:1.5"><div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px"><p style="margin:0 0 24px;font-size:20px;font-weight:700">FocusLab</p><p style="margin:0 0 16px">${escaparHtml(saludoTexto)}</p>${cuerpoHtml}${botonHtml}<p style="margin:24px 0 0;font-size:12px;color:#71717a">${escaparHtml(pie)}</p></div></body></html>`;

  const texto = [saludoTexto, "", ...parrafos, ...(boton ? ["", `${boton.texto}: ${boton.url}`] : []), "", pie].join("\n");

  return { html, texto };
}

function correo(para: string, asunto: string, contenido: { html: string; texto: string }): CorreoSaliente {
  return { para, asunto, ...contenido };
}

// Devuelve los correos a enviar para el evento (cero, uno o dos).
export function correosParaEvento(evento: EventoCorreoAuth, origenApp: string): CorreoSaliente[] {
  const { email_action_type: tipo, token, token_hash, token_new, token_hash_new } = evento.email_data;
  const email = evento.user.email;

  switch (tipo) {
    case "signup":
      return [
        correo(
          email,
          "Confirma tu correo en FocusLab",
          maquetar(saludo(evento), ["Para terminar de crear tu cuenta, confirma tu correo con el botón. El enlace vence en 1 hora."], {
            texto: "Confirmar correo",
            url: enlaceConfirmacion(evento, token_hash, "signup", origenApp),
          }),
        ),
      ];
    case "invite":
      return [
        correo(
          email,
          "Te invitaron a FocusLab",
          maquetar(saludo(evento), ["Te invitaron a crear una cuenta en FocusLab."], {
            texto: "Aceptar invitación",
            url: enlaceConfirmacion(evento, token_hash, "invite", origenApp),
          }),
        ),
      ];
    case "magiclink":
      return [
        correo(
          email,
          "Tu enlace para entrar a FocusLab",
          maquetar(saludo(evento), ["Usa el botón para entrar a FocusLab. El enlace vence en 1 hora y sirve una sola vez."], {
            texto: "Entrar",
            url: enlaceConfirmacion(evento, token_hash, "magiclink", origenApp),
          }),
        ),
      ];
    case "recovery":
      return [
        correo(
          email,
          "Restablece tu contraseña de FocusLab",
          maquetar(
            saludo(evento),
            [
              "Pediste restablecer tu contraseña. Con el botón eliges una nueva. El enlace vence en 1 hora.",
              "Si no lo pediste, ignora este correo: tu contraseña sigue igual.",
            ],
            { texto: "Elegir nueva contraseña", url: enlaceConfirmacion(evento, token_hash, "recovery", origenApp) },
          ),
        ),
      ];
    case "email_change": {
      const nuevo = evento.user.new_email;
      // Ojo: los nombres están cruzados en Supabase. token_hash_new va con el correo actual
      // y token_hash con el nuevo.
      const correos: CorreoSaliente[] = [];
      if (token_hash_new) {
        correos.push(
          correo(
            email,
            "Confirma el cambio de correo en FocusLab",
            maquetar(saludo(evento), [`Pediste cambiar tu correo a ${nuevo ?? "otra dirección"}. Confírmalo desde esta dirección.`], {
              texto: "Confirmar cambio",
              url: enlaceConfirmacion(evento, token_hash_new, "email_change", origenApp),
            }),
          ),
        );
      }
      if (token_hash && nuevo) {
        correos.push(
          correo(
            nuevo,
            "Confirma tu nuevo correo en FocusLab",
            maquetar(saludo(evento), ["Confirma que esta es tu nueva dirección de correo en FocusLab."], {
              texto: "Confirmar nuevo correo",
              url: enlaceConfirmacion(evento, token_hash, "email_change", origenApp),
            }),
          ),
        );
      }
      return correos;
    }
    case "reauthentication":
      return [
        correo(
          email,
          "Tu código de verificación de FocusLab",
          maquetar(saludo(evento), [`Tu código es ${token || token_new}. Vence en pocos minutos. No lo compartas con nadie.`]),
        ),
      ];
    case "password_changed_notification":
      return [
        correo(
          email,
          "Cambiaste tu contraseña de FocusLab",
          maquetar(saludo(evento), ["La contraseña de tu cuenta se cambió. Si no fuiste tú, avísale al investigador cuanto antes."]),
        ),
      ];
    case "mfa_factor_enrolled_notification":
      return [
        correo(
          email,
          "Activaste la verificación en dos pasos",
          maquetar(saludo(evento), ["Se agregó una app de autenticación a tu cuenta de FocusLab. Si no fuiste tú, avísale al investigador cuanto antes."]),
        ),
      ];
    case "mfa_factor_unenrolled_notification":
      return [
        correo(
          email,
          "Se quitó la verificación en dos pasos",
          maquetar(saludo(evento), ["Se quitó una app de autenticación de tu cuenta de FocusLab. Si no fuiste tú, avísale al investigador cuanto antes."]),
        ),
      ];
    default:
      return [];
  }
}

// Segundo factor del staff: no pasa por el hook, lo envía la app al entrar a /admin.
export function correoCodigoVerificacion(
  para: string,
  nombre: string | null,
  codigo: string,
  minutosVigencia: number,
): CorreoSaliente {
  return correo(
    para,
    `${codigo} es tu código para entrar al panel de FocusLab`,
    maquetar(saludoPara(nombre), [
      `Tu código para entrar al panel es ${codigo}. Vence en ${minutosVigencia} minutos.`,
      "Si no intentaste entrar, alguien conoce tu contraseña: cámbiala desde «¿Olvidaste tu contraseña?».",
    ]),
  );
}
