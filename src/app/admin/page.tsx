import Link from "next/link";
import { Download, FileText } from "lucide-react";

import { DimensionsTable } from "@/components/admin/dimensions-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDia } from "@/lib/analysis/overview";
import {
  canExport,
  EXPORT_DATASETS,
  getAdminOverview,
  type ExportDataset,
} from "@/lib/services/admin-stats";
import { createClient } from "@/lib/supabase/server";

const EVENT_LABEL: Record<string, string> = {
  click: "Clics",
  visibility_change: "Cambios de pestaña",
  idle_start: "Inicios de inactividad",
  idle_end: "Fines de inactividad",
  activity_start: "Inicios de actividad",
  activity_end: "Fines de actividad",
  tool_start: "Inicios de herramienta",
  tool_end: "Fines de herramienta",
  tool_interrupt: "Herramientas interrumpidas",
  tool_progress: "Progreso de herramienta",
  session_pulse: "Pulsos de sesión",
};

const number = new Intl.NumberFormat("es-GT", { maximumFractionDigits: 1 });

function formatNumber(value: number | null | undefined) {
  return value === null || value === undefined ? "—" : number.format(Number(value));
}

function sumBy<T>(rows: T[], pick: (row: T) => number | null) {
  return rows.reduce((total, row) => total + Number(pick(row) ?? 0), 0);
}

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user?.id ?? "")
    .single();
  const exports = (Object.keys(EXPORT_DATASETS) as ExportDataset[]).filter((dataset) =>
    canExport(dataset, profile?.role),
  );
  const { dimensions, activities, events, sessions, tools } = await getAdminOverview(supabase);

  const totalSessions = sumBy(sessions, (row) => row.total_sesiones);
  const completedSessions = sumBy(
    sessions.filter((row) => row.status === "completada"),
    (row) => row.total_sesiones,
  );
  const totalResults = sumBy(activities, (row) => row.total_resultados);
  const totalEvents = sumBy(events, (row) => row.total_eventos);

  const sessionsByDay = new Map<string, number>();
  for (const row of sessions) {
    sessionsByDay.set(
      row.dia,
      (sessionsByDay.get(row.dia) ?? 0) + Number(row.total_sesiones),
    );
  }
  const recentDays = Array.from(sessionsByDay).slice(-14);
  const maxPerDay = Math.max(1, ...recentDays.map(([, total]) => total));

  const eventsByType = new Map<string, number>();
  for (const row of events) {
    eventsByType.set(
      row.event_type,
      (eventsByType.get(row.event_type) ?? 0) + Number(row.total_eventos),
    );
  }
  const eventRows = Array.from(eventsByType).sort((a, b) => b[1] - a[1]);

  const toolRows = (["pomodoro", "kanban"] as const).map((tool) => {
    const rows = tools.filter((row) => row.herramienta === tool);

    return {
      tool,
      uses: sumBy(rows, (row) => row.total_usos),
      interruptions: sumBy(rows, (row) => row.total_interrupciones),
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Panel agregado
          </h1>
          <p className="text-muted-foreground">
            Resultados del taller piloto, siempre agregados y sin datos
            individuales. Solo participantes y desafíos actuales.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 text-sm">
          <Link
            href="/admin/reporte"
            className="flex min-h-10 items-center gap-1.5 rounded-lg bg-primary px-3 font-medium text-primary-foreground transition-colors hover:bg-primary/85"
          >
            <FileText className="size-4" /> Reporte del taller (PDF)
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Download className="size-4" /> CSV:
            </span>
            {exports.map((dataset) => (
              <a
                key={dataset}
                href={`/admin/export?dataset=${dataset}`}
                className="rounded-lg border px-2.5 py-1 transition-colors hover:bg-muted"
              >
                {EXPORT_DATASETS[dataset].label}
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Sesiones", value: totalSessions },
          { label: "Sesiones completadas", value: completedSessions },
          { label: "Resultados de actividad", value: totalResults },
          { label: "Eventos registrados", value: totalEvents },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="font-heading text-2xl font-semibold">
                {formatNumber(stat.value)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dimensiones atencionales</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <DimensionsTable rows={dimensions} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sesiones por día</CardTitle>
          </CardHeader>
          <CardContent>
            {recentDays.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Todavía no hay sesiones registradas.
              </p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {recentDays.map(([dia, total]) => (
                  <li key={dia} className="flex items-center gap-3">
                    <span className="w-20 tabular-nums shrink-0 text-muted-foreground">
                      {formatDia(dia)}
                    </span>
                    <div className="h-2 flex-1 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-primary"
                        style={{ width: `${(total / maxPerDay) * 100}%` }}
                      />
                    </div>
                    <span className="w-8 shrink-0 text-right">{total}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Uso de herramientas</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-left text-sm">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4 font-medium">Herramienta</th>
                  <th className="py-2 pr-4 font-medium">Usos</th>
                  <th className="py-2 font-medium">Interrupciones</th>
                </tr>
              </thead>
              <tbody>
                {toolRows.map((row) => (
                  <tr key={row.tool} className="border-t">
                    <td className="py-2 pr-4 font-medium capitalize">{row.tool}</td>
                    <td className="py-2 pr-4">{formatNumber(row.uses)}</td>
                    <td className="py-2">{formatNumber(row.interruptions)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Eventos pasivos por tipo</CardTitle>
        </CardHeader>
        <CardContent>
          {eventRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Todavía no hay eventos registrados.
            </p>
          ) : (
            <ul className="grid gap-x-8 gap-y-1.5 text-sm sm:grid-cols-2">
              {eventRows.map(([type, total]) => (
                <li key={type} className="flex justify-between border-b py-1">
                  <span>{EVENT_LABEL[type] ?? type}</span>
                  <span className="font-medium">{formatNumber(total)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
