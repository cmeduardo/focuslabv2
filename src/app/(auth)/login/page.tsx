import { LoginForm } from "@/app/(auth)/login/login-form";

// /auth/confirm redirige con ?error=confirmacion si el enlace venció o ya se usó.
const NOTICES: Record<string, string> = {
  confirmacion:
    "El enlace venció o ya se usó. Inicia sesión, o pide otro desde «¿Olvidaste tu contraseña?».",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; error?: string }>;
}) {
  const params = await searchParams;

  return (
    <LoginForm
      redirectTo={params.redirect ?? ""}
      notice={(params.error && NOTICES[params.error]) ?? null}
    />
  );
}
