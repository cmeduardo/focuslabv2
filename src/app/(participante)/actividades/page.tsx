import { ActionTile } from "@/components/dashboard/action-tile";
import { SessionPulseCheck } from "@/components/activities/session-pulse";
import { ACTIVITIES } from "@/lib/constants/nav";

const SLUG_TO_ROUTE: Record<string, string> = {
  reaction_test: "reaction-test",
  focus_flow: "focus-flow",
  memory_matrix: "memory-matrix",
  word_sprint: "word-sprint",
  pattern_hunt: "pattern-hunt",
  deep_read: "deep-read",
};

export default function ActividadesPage() {
  return (
    <div className="space-y-6">
      <SessionPulseCheck />
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Actividades
        </h1>
        <p className="text-muted-foreground">
          Actividades cognitivas gamificadas (RF-04). Cada resultado se
          guarda vinculado a tu sesión actual.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ACTIVITIES.map((activity, i) => (
          <ActionTile
            key={activity.slug}
            href={`/actividades/${SLUG_TO_ROUTE[activity.slug]}`}
            name={activity.name}
            description={activity.description}
            icon={activity.icon}
            accent={i % 2 === 0 ? "signal" : "pulse"}
          />
        ))}
      </div>
    </div>
  );
}
