"use client";

import { useActionState, useState } from "react";

import {
  acceptConsentAction,
  type ConsentState,
} from "@/app/(auth)/consentimiento/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const initialState: ConsentState = { error: null };

export function ConsentForm() {
  const [checked, setChecked] = useState(false);
  const [state, formAction, isPending] = useActionState(
    acceptConsentAction,
    initialState,
  );

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <span className="mb-1 inline-flex w-fit items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium tracking-wide text-secondary-foreground uppercase">
          Paso 2 de 2
        </span>
        <CardTitle className="font-heading text-xl">
          Consentimiento informado
        </CardTitle>
        <CardDescription>
          Debes aceptar este consentimiento antes de iniciar tu primera
          sesión en FocusLab. Tu aceptación queda registrada con fecha y
          hora.
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          <div className="max-h-48 overflow-y-auto rounded-xl border border-dashed bg-muted/40 p-4 text-sm text-muted-foreground">
            FocusLab recopila resultados de actividades cognitivas
            gamificadas y eventos de interacción (clics, cambios de pestaña,
            periodos de inactividad) durante tus sesiones de uso, con fines
            de investigación para un taller piloto de tesis. Los datos se
            almacenan de forma segura y solo el equipo investigador accede a
            información individual; las autoridades académicas solo ven
            resultados agregados y anonimizados. FocusLab es una herramienta
            de autoconocimiento, no una herramienta médica: describe estilos
            y tendencias de tu atención, sin etiquetas ni juicios. Puedes
            dejar de participar en cualquier momento.
          </div>
          <div className="flex items-start gap-2 rounded-xl border border-border bg-secondary/40 p-3">
            <Checkbox
              id="accept"
              checked={checked}
              onCheckedChange={(value) => setChecked(value === true)}
            />
            <Label htmlFor="accept" className="font-normal">
              He leído y acepto participar en el taller piloto de FocusLab.
            </Label>
          </div>
          {state.error ? (
            <p className="text-sm text-destructive">{state.error}</p>
          ) : null}
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={!checked || isPending}>
            {isPending ? "Guardando…" : "Aceptar y continuar"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
