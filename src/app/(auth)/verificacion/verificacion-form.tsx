"use client";

import { KeyRound, ShieldCheck } from "lucide-react";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";

import {
  enviarCodigo,
  verificar,
  type EnvioState,
  type VerificacionState,
} from "@/app/(auth)/verificacion/actions";
import { logoutAction } from "@/components/layout/logout-action";
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

const initialState: VerificacionState = { error: null };

export function VerificacionForm({ correo }: { correo: string }) {
  const [state, formAction, isPending] = useActionState(verificar, initialState);
  // enviadoEn se toma del reloj del navegador para que la cuenta regresiva no dependa del servidor.
  const [envio, setEnvio] = useState<(EnvioState & { enviadoEn: number }) | null>(null);
  const [isSending, startSending] = useTransition();
  const [ahora, setAhora] = useState(() => Date.now());
  const enviadoAlEntrar = useRef(false);

  function pedirCodigo() {
    startSending(async () => {
      const resultado = await enviarCodigo();
      const enviadoEn = Date.now();
      setAhora(enviadoEn);
      setEnvio({ ...resultado, enviadoEn });
    });
  }

  // El servidor no reenvía antes de un minuto, así que un doble montaje no manda dos correos.
  useEffect(() => {
    if (enviadoAlEntrar.current) return;
    enviadoAlEntrar.current = true;
    pedirCodigo();
  }, []);

  useEffect(() => {
    if (!envio?.esperaSegundos) return;
    const intervalo = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(intervalo);
  }, [envio]);

  const espera =
    envio?.esperaSegundos
      ? Math.max(0, Math.ceil(envio.esperaSegundos - (ahora - envio.enviadoEn) / 1000))
      : 0;

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <span className="mb-1 flex size-10 items-center justify-center rounded-full bg-secondary text-primary">
          <ShieldCheck className="size-5" />
        </span>
        <CardTitle className="font-heading text-xl">Confirma que eres tú</CardTitle>
        <CardDescription>
          {isSending && !envio
            ? `Enviando un código a ${correo}…`
            : `Te enviamos un código de 6 dígitos a ${correo}. Revisa también la carpeta de spam.`}
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="codigo" className="gap-1.5">
              <KeyRound className="size-3.5 text-muted-foreground" />
              Código
            </Label>
            <Input
              id="codigo"
              name="codigo"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="123456"
              className="text-center font-mono text-lg tracking-[0.4em]"
              autoFocus
              required
            />
          </div>
          {state.error ? (
            <p className="text-sm text-destructive">{state.error}</p>
          ) : envio?.error ? (
            <p className="text-sm text-destructive">{envio.error}</p>
          ) : null}
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Verificando…" : "Entrar al panel"}
          </Button>
          <div className="flex w-full items-center justify-between text-sm">
            <button
              type="button"
              onClick={pedirCodigo}
              disabled={isSending || espera > 0}
              className="font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
            >
              {espera > 0 ? `Reenviar en ${espera} s` : "Reenviar código"}
            </button>
            <button
              type="button"
              onClick={() => logoutAction()}
              className="text-muted-foreground hover:text-foreground hover:underline"
            >
              Cerrar sesión
            </button>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
