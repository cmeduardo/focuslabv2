import Link from "next/link";
import { RotateCcw, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ActivityResult({
  saving,
  stats,
  onRetry,
  backHref,
}: {
  saving: boolean;
  stats: { label: string; value: string }[];
  onRetry: () => void;
  backHref: string;
}) {
  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <span className="mb-1 flex size-10 items-center justify-center rounded-full bg-secondary text-primary">
          <Sparkles className="size-5" />
        </span>
        <CardTitle className="font-heading text-xl">
          ¡Actividad completada!
        </CardTitle>
        <CardDescription>
          {saving
            ? "Guardando tu resultado…"
            : "Tu resultado quedó registrado en esta sesión."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-border bg-muted/40 p-3"
            >
              <dt className="text-xs text-muted-foreground">{stat.label}</dt>
              <dd className="font-heading text-lg font-semibold">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        <Button
          variant="outline"
          className="w-full gap-1.5"
          onClick={onRetry}
        >
          <RotateCcw className="size-4" />
          Intentar de nuevo
        </Button>
        <Button className="w-full" render={<Link href={backHref}>Volver a actividades</Link>} />
      </CardFooter>
    </Card>
  );
}
