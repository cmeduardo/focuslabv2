import Link from "next/link";
import { Sparkles, TrendingUp } from "lucide-react";

import {
  activeDays,
  buildActivityProgress,
  type ActivityProgress,
  type ProgressRow,
} from "@/lib/activities/progress";
import { ACTIVITIES } from "@/lib/constants/nav";

// "Tu progreso": resumen personal sobre los desafíos completados. Solo se
// compara a cada quien consigo mismo y el texto evita etiquetas ("eres…"):
// describe intentos, no personas.
export function ProgressSection({
  rows,
  hrefs,
}: {
  rows: readonly (ProgressRow & { session_id: string })[];
  hrefs: Record<string, string>;
}) {
  if (rows.length === 0) {
    return (
      <section data-testid="progress-section" data-empty="true">
        <h2 className="mb-4 font-heading text-lg font-semibold">Tu progreso</h2>
        <div className="flex items-start gap-3 rounded-2xl border border-dashed border-border p-5">
          <TrendingUp className="mt-0.5 size-5 shrink-0 text-primary" />
          <p className="text-sm text-muted-foreground">
            Aquí vas a ver tus mejores marcas y cómo cambian tus resultados de un intento a otro.
            Completa tu primer desafío para tener tu punto de partida.
          </p>
        </div>
      </section>
    );
  }

  const sessions = new Set(rows.map((r) => r.session_id)).size;
  const days = activeDays(rows);
  const all = ACTIVITIES.map((activity) => ({
    activity,
    progress: buildActivityProgress(activity.slug, rows),
  }));
  const played = all.filter((a) => a.progress.attempts > 0);
  const pending = all.filter((a) => a.progress.attempts === 0);

  return (
    <section data-testid="progress-section">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-heading text-lg font-semibold">Tu progreso</h2>
        <p className="text-sm text-muted-foreground">
          {rows.length} {rows.length === 1 ? "desafío completado" : "desafíos completados"} ·{" "}
          {sessions} {sessions === 1 ? "sesión" : "sesiones"} · {days}{" "}
          {days === 1 ? "día activo" : "días activos"}
        </p>
      </div>
      {/* Tarjetas solo para lo que ya se jugó (en celular seis tarjetas
          empujaban los desafíos dos pantallas abajo); lo pendiente va en
          una sola línea. */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        {played.map(({ activity, progress }) => (
          <ProgressCard
            key={activity.slug}
            name={activity.name}
            icon={activity.icon}
            href={hrefs[activity.slug]}
            progress={progress}
          />
        ))}
      </div>
      {pending.length > 0 && (
        <p data-testid="progress-pending" className="mt-3 text-sm text-muted-foreground">
          Aún sin intentos:{" "}
          {pending.map(({ activity }, i) => (
            <span key={activity.slug}>
              {i > 0 && ", "}
              <Link
                href={hrefs[activity.slug]}
                className="font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
              >
                {activity.name}
              </Link>
            </span>
          ))}
          .
        </p>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        Este resumen se va enriqueciendo con cada sesión: con más intentos, las tendencias dicen
        más. Un resultado aislado depende de muchas cosas (el sueño, el lugar, el dispositivo).
      </p>
    </section>
  );
}

function ProgressCard({
  name,
  icon: Icon,
  href,
  progress,
}: {
  name: string;
  icon: (typeof ACTIVITIES)[number]["icon"];
  href: string;
  progress: ActivityProgress;
}) {
  const { attempts, latest, best, latestIsBest, values, label } = progress;
  const hasHistory = values.length >= 2;

  return (
    <Link
      href={href}
      data-testid={`progress-${progress.activity}`}
      className="flex min-w-0 flex-col gap-1 rounded-2xl border border-border bg-card p-3 transition-colors hover:border-primary/30 focus-visible:border-primary/30 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none sm:p-4"
    >
      <div className="flex items-center gap-2">
        <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
          <Icon className="size-3.5" />
        </span>
        <h3 className="truncate font-heading text-sm font-semibold">{name}</h3>
        <span className="ml-auto hidden shrink-0 text-xs text-muted-foreground sm:inline">
          {attempts} {attempts === 1 ? "intento" : "intentos"}
        </span>
      </div>
      <p className="mt-1 truncate text-xs text-muted-foreground">{label}</p>
      <p className="font-heading text-xl font-bold tracking-tight sm:text-2xl">{latest ?? "—"}</p>
      <div className="flex items-end justify-between gap-2">
        {!hasHistory ? (
          <p className="text-xs text-muted-foreground">Punto de partida</p>
        ) : latestIsBest ? (
          <p className="inline-flex items-center gap-1 text-xs font-medium text-primary">
            <Sparkles className="size-3 shrink-0" />
            ¡Tu mejor marca!
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">Mejor marca: {best}</p>
        )}
        {hasHistory && <Sparkline values={values} better={progress.better} />}
      </div>
    </Link>
  );
}

// Mini-gráfica de los últimos intentos. Si en la métrica "menos es mejor"
// (tiempos, errores) se invierte el eje, para que hacia arriba siempre
// signifique "mejor" y no haya que explicarlo.
function Sparkline({ values, better }: { values: number[]; better: "higher" | "lower" }) {
  const w = 96;
  const h = 32;
  const pad = 3;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values.map((v, i) => {
    const x = pad + (i * (w - 2 * pad)) / (values.length - 1);
    const t = (v - min) / span;
    const up = better === "higher" ? t : 1 - t;
    // Sin variación: línea plana al centro.
    const y = max === min ? h / 2 : h - pad - up * (h - 2 * pad);
    return [x, y] as const;
  });
  const [lx, ly] = points[points.length - 1];

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-6 w-14 shrink-0 overflow-visible text-primary sm:h-8 sm:w-20"
      role="img"
      aria-label={`Tus últimos ${values.length} intentos; hacia arriba es mejor`}
    >
      <polyline
        points={points.map(([x, y]) => `${x},${y}`).join(" ")}
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.55}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lx} cy={ly} r={2.75} className="fill-current" />
    </svg>
  );
}
