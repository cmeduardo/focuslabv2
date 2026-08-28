"use client";

import Link from "next/link";
import { useActionState } from "react";

import { login, type LoginState } from "@/app/(auth)/login/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: LoginState = { error: null };

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const [state, formAction, isPending] = useActionState(login, initialState);

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Iniciar sesión</CardTitle>
        <CardDescription>
          Autenticación con correo y contraseña vía Supabase Auth (RF-01).
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <input type="hidden" name="redirect" value={redirectTo} />
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="tu@correo.com"
              autoComplete="email"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          {state.error ? (
            <p className="text-sm text-destructive">{state.error}</p>
          ) : null}
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Ingresando…" : "Iniciar sesión"}
          </Button>
          <p className="text-sm text-muted-foreground">
            ¿No tienes cuenta?{" "}
            <Link
              href="/registro"
              className="font-medium text-foreground underline"
            >
              Regístrate
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
