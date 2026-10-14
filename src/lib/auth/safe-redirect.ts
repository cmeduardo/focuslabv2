// Los destinos que llegan por URL o formulario (`?redirect=` del login,
// `?next=` del enlace de confirmación) los controla quien arma el enlace:
// sin este filtro, /login?redirect=https://otro-sitio.com mandaría al
// participante fuera de FocusLab justo después de poner su contraseña
// (open redirect, útil para phishing).

/**
 * Devuelve `target` solo si es una ruta interna ("/dashboard",
 * "/informes/abc?x=1"); si no, `fallback`. Rechaza URLs absolutas,
 * "//otro-sitio.com" (relativa al protocolo) y "/\otro-sitio.com", que
 * algunos navegadores tratan como "//".
 */
export function safeRedirectPath(target: string | null | undefined, fallback: string) {
  if (!target || !target.startsWith("/") || target.startsWith("//") || target.startsWith("/\\")) {
    return fallback;
  }

  // Segunda barrera: resuelta contra un origen ficticio, la ruta tiene que
  // quedarse en ese mismo origen (atrapa trucos con tabuladores o saltos de
  // línea que el navegador elimina antes de resolver).
  const resolved = new URL(target, "http://focuslab.invalid");
  if (resolved.origin !== "http://focuslab.invalid") {
    return fallback;
  }

  return `${resolved.pathname}${resolved.search}${resolved.hash}`;
}
