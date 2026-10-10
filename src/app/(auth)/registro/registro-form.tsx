"use client";

import Link from "next/link";
import { Lock, Mail, MailCheck, User } from "lucide-react";
import { useActionState } from "react";

import { registro, type RegistroState } from "@/app/(auth)/registro/actions";
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

function StepBadge({ step }: { step: 1 | 2 }) {
  return (
    <span className="mb-1 inline-flex w-fit items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium tracking-wide text-secondary-foreground uppercase">
      Paso {step} de 2
    </span>
  );
}

const initialState: RegistroState = { error: null, needsEmailConfirmation: false };

export function RegistroForm() {
  const [state, formAction, isPending] = useActionState(registro, initialState);

  if (state.needsEmailConfirmation) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <span className="mb-1 flex size-10 items-center justify-center rounded-full bg-secondary text-primary">
            <MailCheck className="size-5" />
          </span>
          <CardTitle className="font-heading text-xl">
            Revisa tu correo
          </CardTitle>
          <CardDescription>
            Te enviamos un enlace de confirmación. Ábrelo para activar tu
            cuenta y continuar con el consentimiento informado.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Link
            href="/login"
            className="text-sm font-medium text-primary hover:underline"
          >
            Volver a iniciar sesión
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <StepBadge step={1} />
        <CardTitle className="font-heading text-xl">Crear cuenta</CardTitle>
        <CardDescription>
          Registro con correo y contraseña. Antes de tu primera sesión
          deberás aceptar el consentimiento informado.
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name" className="gap-1.5">
              <User className="size-3.5 text-muted-foreground" />
              Nombre completo
            </Label>
            <Input
              id="full_name"
              name="full_name"
              autoComplete="name"
              // React vacía el formulario tras la acción: nombre y correo
              // vuelven desde ella (ver LoginForm).
              defaultValue={state.fullName}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="gap-1.5">
              <Mail className="size-3.5 text-muted-foreground" />
              Correo electrónico
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="tu@correo.com"
              autoComplete="email"
              defaultValue={state.email}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="gap-1.5">
              <Lock className="size-3.5 text-muted-foreground" />
              Contraseña
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={6}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password_confirmation" className="gap-1.5">
              <Lock className="size-3.5 text-muted-foreground" />
              Confirmar contraseña
            </Label>
            <Input
              id="password_confirmation"
              name="password_confirmation"
              type="password"
              autoComplete="new-password"
              minLength={6}
              required
            />
          </div>
          {state.error ? (
            <p className="text-sm text-destructive">{state.error}</p>
          ) : null}
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Creando cuenta…" : "Crear cuenta"}
          </Button>
          <p className="text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Inicia sesión
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
