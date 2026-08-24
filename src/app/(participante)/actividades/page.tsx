import Link from "next/link";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Actividades</h1>
        <p className="text-muted-foreground">
          Actividades cognitivas gamificadas (RF-04). Cada resultado se
          guarda vinculado a tu sesión actual.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {ACTIVITIES.map((activity) => (
          <Link
            key={activity.slug}
            href={`/actividades/${SLUG_TO_ROUTE[activity.slug]}`}
          >
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardHeader>
                <CardTitle className="text-base">{activity.name}</CardTitle>
                <CardDescription>{activity.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
