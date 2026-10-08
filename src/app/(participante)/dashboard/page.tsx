import { FileText } from "lucide-react";

import { FocusAperture } from "@/components/brand/focus-aperture";
import { ActionTile } from "@/components/dashboard/action-tile";
import { ProgressSection } from "@/components/dashboard/progress-section";
import { ACTIVITIES, TOOLS } from "@/lib/constants/nav";
import { listProgressRows } from "@/lib/services/progress";
import { createClient } from "@/lib/supabase/server";

const ACTIVITY_ROUTE: Record<string, string> = {
  reaction_test: "reaction-test",
  focus_flow: "focus-flow",
  memory_matrix: "memory-matrix",
  word_sprint: "word-sprint",
  pattern_hunt: "pattern-hunt",
  deep_read: "deep-read",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Si el historial falla, el dashboard igual tiene que servir para jugar.
  const progressRows = user
    ? await listProgressRows(supabase, user.id).catch(() => [])
    : [];

  return (
    <div className="space-y-10">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-secondary/70 via-card to-card px-6 py-8 sm:px-8">
        <FocusAperture
          className="pointer-events-none absolute -top-10 -right-10 size-56 text-primary/10 sm:size-64"
          animated
        />
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full bg-background/70 px-3 py-1 text-xs font-medium tracking-wide text-primary uppercase">
            <FocusAperture className="size-3.5" />
            Tu sesión de hoy
          </span>
          <h1 className="mt-3 font-heading text-3xl font-semibold tracking-tight">
            ¿En qué quieres enfocarte?
          </h1>
          <p className="mt-1 max-w-xl text-muted-foreground">
            Elige un desafío o una herramienta de productividad.
            Cada interacción se registra en tu sesión actual.
          </p>
        </div>
      </div>

      <ProgressSection
        rows={progressRows}
        hrefs={Object.fromEntries(
          Object.entries(ACTIVITY_ROUTE).map(([slug, route]) => [
            slug,
            `/actividades/${route}`,
          ]),
        )}
      />

      <section>
        <h2 className="mb-4 font-heading text-lg font-semibold">
          Actividades cognitivas
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ACTIVITIES.map((activity, i) => (
            <ActionTile
              key={activity.slug}
              href={`/actividades/${ACTIVITY_ROUTE[activity.slug]}`}
              name={activity.name}
              description={activity.description}
              icon={activity.icon}
              accent={i % 2 === 0 ? "signal" : "pulse"}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-heading text-lg font-semibold">
          Herramientas de productividad
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((tool, i) => (
            <ActionTile
              key={tool.slug}
              href={`/herramientas/${tool.slug}`}
              name={tool.name}
              description={tool.description}
              icon={tool.icon}
              accent={i % 2 === 0 ? "pulse" : "signal"}
            />
          ))}
          <ActionTile
            href="/informes"
            name="Mis informes"
            description="Historial de sesiones y tu perfil atencional."
            icon={FileText}
            accent="signal"
          />
        </div>
      </section>
    </div>
  );
}
