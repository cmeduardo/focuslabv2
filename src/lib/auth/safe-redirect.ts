// Evita open redirects con ?redirect= y ?next=.

export function safeRedirectPath(target: string | null | undefined, fallback: string) {
  if (!target || !target.startsWith("/") || target.startsWith("//") || target.startsWith("/\\")) {
    return fallback;
  }

  // Segunda barrera: tabuladores o saltos de línea que el navegador elimina al resolver.
  const resolved = new URL(target, "http://focuslab.invalid");
  if (resolved.origin !== "http://focuslab.invalid") {
    return fallback;
  }

  return `${resolved.pathname}${resolved.search}${resolved.hash}`;
}
