import Link from "next/link";

import { FocusAperture } from "@/components/brand/focus-aperture";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ACTIVITIES, TOOLS } from "@/lib/constants/nav";
import { cn } from "@/lib/utils";

const ACCENTS = ["border-l-signal", "border-l-pulse"] as const;

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <section className="relative overflow-hidden border-b bg-gradient-to-b from-secondary/60 via-background to-background">
        <FocusAperture
          animated
          className="pointer-events-none absolute -top-24 -right-24 size-[32rem] text-primary/[0.07] sm:size-[40rem]"
        />
        <div className="relative mx-auto flex max-w-4xl flex-col items-start gap-6 px-6 py-24 sm:py-32">
          <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-medium tracking-wide text-secondary-foreground uppercase">
            <FocusAperture className="size-3.5 text-primary" />
            Laboratorio de atención
          </span>
          <h1 className="font-heading text-5xl font-semibold tracking-tight text-balance sm:text-6xl">
            Entrená tu foco.{" "}
            <span className="text-primary">Medí tu atención.</span>
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            Actividades cognitivas gamificadas y herramientas de productividad
            para estudiar patrones de atención en jóvenes universitarios.
            FocusLab no realiza ningún diagnóstico clínico: al terminar cada
            sesión recibes un informe descriptivo de tu perfil atencional.
          </p>
          <div className="flex gap-3">
            <Button
              size="lg"
              className="h-11 px-6 text-base"
              render={<Link href="/registro">Crear cuenta</Link>}
            />
            <Button
              size="lg"
              variant="outline"
              className="h-11 px-6 text-base"
              render={<Link href="/login">Iniciar sesión</Link>}
            />
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-4xl px-6 py-16">
        <h2 className="mb-6 font-heading text-2xl font-semibold">
          Actividades cognitivas
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {ACTIVITIES.map((activity, i) => (
            <Card
              key={activity.slug}
              className={cn(
                "border-l-4 transition-shadow hover:shadow-md",
                ACCENTS[i % ACCENTS.length]
              )}
            >
              <CardHeader>
                <CardTitle className="text-base">{activity.name}</CardTitle>
                <CardDescription>{activity.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-4xl px-6 pb-24">
        <h2 className="mb-6 font-heading text-2xl font-semibold">
          Herramientas de productividad
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {TOOLS.map((tool, i) => (
            <Card
              key={tool.slug}
              className={cn(
                "border-l-4 transition-shadow hover:shadow-md",
                ACCENTS[i % ACCENTS.length]
              )}
            >
              <CardHeader>
                <CardTitle className="text-base">{tool.name}</CardTitle>
                <CardDescription>{tool.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
