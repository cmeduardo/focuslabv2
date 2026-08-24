import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ACTIVITIES, TOOLS } from "@/lib/constants/nav";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <section className="border-b bg-muted/30">
        <div className="mx-auto flex max-w-4xl flex-col items-start gap-6 px-6 py-24">
          <h1 className="text-4xl font-semibold tracking-tight">FocusLab</h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            Actividades cognitivas gamificadas y herramientas de productividad
            para estudiar patrones de atención en jóvenes universitarios.
            FocusLab no realiza ningún diagnóstico clínico: al terminar cada
            sesión recibes un informe descriptivo de tu perfil atencional.
          </p>
          <div className="flex gap-3">
            <Button render={<Link href="/registro">Crear cuenta</Link>} />
            <Button
              variant="outline"
              render={<Link href="/login">Iniciar sesión</Link>}
            />
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-4xl px-6 py-16">
        <h2 className="mb-6 text-xl font-medium">Actividades cognitivas</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {ACTIVITIES.map((activity) => (
            <Card key={activity.slug}>
              <CardHeader>
                <CardTitle className="text-base">{activity.name}</CardTitle>
                <CardDescription>{activity.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-4xl px-6 pb-24">
        <h2 className="mb-6 text-xl font-medium">
          Herramientas de productividad
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {TOOLS.map((tool) => (
            <Card key={tool.slug}>
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
