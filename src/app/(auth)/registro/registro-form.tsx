"use client";

import Link from "next/link";
import { Check, Circle, Eye, EyeOff, Lock, Mail, MailCheck, User } from "lucide-react";
import { useActionState, useState } from "react";

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
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_RULES,
} from "@/lib/auth/password-policy";

function StepBadge({ step }: { step: 1 | 2 }) {
  return (
    <span className="mb-1 inline-flex w-fit items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium tracking-wide text-secondary-foreground uppercase">
      Paso {step} de 2
    </span>
  );
}

const initialState: RegistroState = { error: null, needsEmailConfirmation: false };

// Requisitos de la contraseña, marcados mientras se escribe. El servidor
// vuelve a validar con las mismas reglas (lib/auth/password-policy.ts).
function PasswordChecklist({ password }: { password: string }) {
  return (
    <ul id="password-rules" className="space-y-1 text-xs" aria-live="polite">
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(password);
        return (
          <li
            key={rule.id}
            className={`flex items-center gap-1.5 ${ok ? "text-primary" : "text-muted-foreground"}`}
          >
            {ok ? <Check className="size-3.5" /> : <Circle className="size-3" />}
            {rule.label}
            <span className="sr-only">{ok ? " (cumplido)" : " (pendiente)"}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function RegistroForm() {
  const [state, formAction, isPending] = useActionState(registro, initialState);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                minLength={PASSWORD_MIN_LENGTH}
                maxLength={PASSWORD_MAX_LENGTH}
                aria-describedby="password-rules"
                className="pr-10"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((shown) => !shown)}
                className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <PasswordChecklist password={password} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password_confirmation" className="gap-1.5">
              <Lock className="size-3.5 text-muted-foreground" />
              Confirmar contraseña
            </Label>
            <Input
              id="password_confirmation"
              name="password_confirmation"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              minLength={PASSWORD_MIN_LENGTH}
              maxLength={PASSWORD_MAX_LENGTH}
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
