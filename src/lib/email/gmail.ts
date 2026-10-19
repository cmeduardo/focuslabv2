import "server-only";

// Envío con la Gmail API usando el refresh token de la cuenta remitente
// (proyecto de Google Cloud en la organización UMG, app interna, permiso gmail.send).

export type CorreoSaliente = { para: string; asunto: string; html: string; texto: string };

const NOMBRE_REMITENTE = "FocusLab";

async function obtenerAccessToken() {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Faltan GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET o GMAIL_REFRESH_TOKEN.");
  }

  const respuesta = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!respuesta.ok) {
    // Sin el cuerpo: puede incluir detalles de la credencial.
    throw new Error(`Google rechazó el refresh token (HTTP ${respuesta.status}).`);
  }

  const { access_token } = (await respuesta.json()) as { access_token: string };
  return access_token;
}

function encabezadoUtf8(valor: string) {
  return `=?UTF-8?B?${Buffer.from(valor, "utf8").toString("base64")}?=`;
}

function enLineas(base64: string) {
  return base64.replace(/.{1,76}/g, "$&\r\n").trimEnd();
}

export function construirMensajeMime(correo: CorreoSaliente, remitente: string) {
  const limite = `focuslab-${crypto.randomUUID()}`;
  return [
    `From: ${encabezadoUtf8(NOMBRE_REMITENTE)} <${remitente}>`,
    `To: ${correo.para}`,
    `Subject: ${encabezadoUtf8(correo.asunto)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${limite}"`,
    "",
    `--${limite}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    enLineas(Buffer.from(correo.texto, "utf8").toString("base64")),
    `--${limite}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    enLineas(Buffer.from(correo.html, "utf8").toString("base64")),
    `--${limite}--`,
    "",
  ].join("\r\n");
}

export async function enviarConGmail(correo: CorreoSaliente) {
  const remitente = process.env.GMAIL_REMITENTE;
  if (!remitente) {
    throw new Error("Falta GMAIL_REMITENTE.");
  }

  const accessToken = await obtenerAccessToken();
  const raw = Buffer.from(construirMensajeMime(correo, remitente), "utf8").toString("base64url");

  const respuesta = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw }),
    },
  );

  if (!respuesta.ok) {
    const detalle = await respuesta.text().catch(() => "");
    throw new Error(`Gmail no envió el correo (HTTP ${respuesta.status}): ${detalle.slice(0, 300)}`);
  }
}
