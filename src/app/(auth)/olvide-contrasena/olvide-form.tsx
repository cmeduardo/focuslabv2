"use client";

import Link from "next/link";
import { Mail, MailCheck } from "lucide-react";
import { useActionState } from "react";

import { olvideContrasena, type OlvideState } from "@/app/(auth)/olvide-contrasena/actions";
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

const initialState: OlvideState = { error: null, sent: false };

export function OlvideForm() {
  const [state, formAction, isPending] = useActionState(olvideContrasena, initialState);

  if (state.sent) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <span className="mb-1 flex size-10 items-center justify-center rounded-full bg-secondary text-primary">
            <MailCheck className="size-5" />
          </span>
          <CardTitle className="font-heading text-xl">Revisa tu correo</CardTitle>
          <CardDescription>
            Si hay una cuenta con {state.email}, te llegará un enlace para
            elegir una contraseña nueva. Vence en 1 hora. Revisa también la
            carpeta de spam.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Link href="/login" className="text-sm font-medium text-primary hover:underline">
            Volver a iniciar sesión
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="font-heading text-xl">¿Olvidaste tu contraseña?</CardTitle>
        <CardDescription>
          Escribe el correo de tu cuenta y te enviaremos un enlace para elegir
          una nueva.
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
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
          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Enviando…" : "Enviar enlace"}
          </Button>
          <Link href="/login" className="text-sm font-medium text-primary hover:underline">
            Volver a iniciar sesión
          </Link>
        </CardFooter>
      </form>
    </Card>
  );
}
