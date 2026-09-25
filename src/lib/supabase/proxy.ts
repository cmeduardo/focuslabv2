import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// "/consentimiento" y "/auth" (enlace de confirmación de correo) son
// públicos a nivel de red: cada uno valida por su cuenta que haya sesión.
// "/api/webhooks" tampoco pasa por Supabase Auth: son llamadas
// servidor-a-servidor (n8n) autenticadas con un secreto compartido propio,
// ver cada Route Handler.
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/registro",
  "/consentimiento",
  "/auth",
  "/api/webhooks",
];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

/**
 * Refresca la sesión de Supabase en cada request y redirige a /login a
 * quien no esté autenticado e intente entrar a una ruta protegida (RS-01).
 *
 * La autorización fina por rol (investigador/autoridad para /admin) se
 * resuelve en src/app/admin/layout.tsx, no aquí: este archivo solo cubre el
 * límite de red (autenticado / no autenticado), ver ARCHITECTURE.md.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublicPath(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return response;
}
