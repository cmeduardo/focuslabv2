"use client";

import Link from "next/link";
import { Eye, EyeOff, Lock } from "lucide-react";
import { useActionState, useState } from "react";

import {
  restablecerContrasena,
  type RestablecerState,
} from "@/app/(auth)/restablecer-contrasena/actions";
import { PasswordChecklist } from "@/components/auth/password-checklist";
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
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/auth/password-policy";

const initialState: RestablecerState = { error: null };

export function RestablecerForm({ email }: { email: string }) {
  const [state, formAction, isPending] = useActionState(restablecerContrasena, initialState);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="font-heading text-xl">Elige una contraseña nueva</CardTitle>
        <CardDescription>Para la cuenta {email}.</CardDescription>
      </CardHeader>
      <form action={formAction}>
        {/* Para que el gestor de contraseñas asocie la nueva con la cuenta. */}
        <input type="hidden" name="username" autoComplete="username" value={email} />
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password" className="gap-1.5">
              <Lock className="size-3.5 text-muted-foreground" />
              Contraseña nueva
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
          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Guardando…" : "Guardar contraseña"}
          </Button>
          <Link href="/olvide-contrasena" className="text-sm font-medium text-primary hover:underline">
            Pedir otro enlace
          </Link>
        </CardFooter>
      </form>
    </Card>
  );
}
