import { LoginForm } from "@/app/(auth)/login/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const params = await searchParams;

  return <LoginForm redirectTo={params.redirect ?? "/dashboard"} />;
}
