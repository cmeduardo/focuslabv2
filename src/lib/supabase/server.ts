import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/lib/types/database";

/**
 * Cliente de Supabase para Server Components y Route Handlers. Usa la anon
 * key + las cookies de sesión del request: queda sujeto a RLS igual que el
 * cliente de navegador. Debe crearse una instancia nueva por request.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Se llamó desde un Server Component: se puede ignorar porque
            // src/proxy.ts ya se encarga de refrescar la sesión.
          }
        },
      },
    },
  );
}
