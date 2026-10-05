import Link from "next/link";

import { DimensionsTable } from "@/components/admin/dimensions-table";
import { participantsByDevice, participantsWithResults } from "@/lib/analysis/overview";
import { getAdminOverview } from "@/lib/services/admin-stats";
import { createClient } from "@/lib/supabase/server";

import { PrintButton } from "./print-button";

const number = new Intl.NumberFormat("es-GT", { maximumFractionDigits: 1 });
const fmt = (value: number | null | undefined) =>
  value === null || value === undefined ? "—" : number.format(Number(value));

const EVENT_LABEL: Record<string, string> = {
  click: "Clics",
  visibility_change: "Cambios de pestaña",
  idle_start: "Periodos de inactividad",
  activity_start: "Desafíos iniciados",
  activity_end: "Desafíos terminados",
  tool_start: "Herramientas abiertas",
  tool_interrupt: "Herramientas interrumpidas",
  session_pulse: "Pulsos de sesión",
};

// RF-14: reporte agregado del taller (investigador y autoridad), listo para
// imprimir o guardar como PDF. Solo vistas agregadas: nunca datos
// individuales (RS-04).
export default async function ReportePage() {
  const supabase = await createClient();
  const { dimensions, events, sessions, tools } = await getAdminOverview(supabase);

  const sum = <T,>(rows: T[], pick: (row: T) => number | null) =>
    rows.reduce((total, row) => total + Number(pick(row) ?? 0), 0);
  const totalSessions = sum(sessions, (r) => r.total_sesiones);
  const completed = sum(
    sessions.filter((r) => r.status === "completada"),
    (r) => r.total_sesiones,
  );
  const participants = participantsWithResults(dimensions);
  const byDevice = participantsByDevice(dimensions);

  const eventTotals = new Map<string, number>();
  for (const row of events) {
    eventTotals.set(row.event_type, (eventTotals.get(row.event_type) ?? 0) + Number(row.total_eventos));
  }

  const generatedAt = new Date().toLocaleString("es-GT", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Guatemala",
  });

  return (
    <article className="mx-auto max-w-4xl space-y-8 print:max-w-none print:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">
          ← Panel agregado
        </Link>
        <PrintButton />
      </div>

      <header className="border-b pb-4">
        <p className="text-sm text-muted-foreground">FocusLab · Taller piloto</p>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Reporte agregado del taller
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Generado el {generatedAt}. Solo participantes y desafíos actuales
          (protocolo v2), primer intento de cada desafío. Datos agregados, sin
          identificadores individuales.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Participantes con resultados", value: participants },
          { label: "Sesiones", value: totalSessions },
          { label: "Sesiones completadas", value: completed },
          {
            label: "Celular / laptop (Reaction Test)",
            value: null,
            text: `${fmt(byDevice.get("mobile") ?? 0)} / ${fmt(byDevice.get("desktop") ?? 0)}`,
          },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl border p-3 break-inside-avoid">
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
            <p className="font-heading text-2xl font-semibold">{kpi.text ?? fmt(kpi.value)}</p>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl font-semibold">Dimensiones atencionales</h2>
        <p className="text-sm text-muted-foreground">
          Media, desviación estándar y rango de la métrica principal de cada
          desafío, por dispositivo. Los tiempos medidos en celular y en laptop
          no se comparan entre sí (latencia táctil).
        </p>
        <div className="overflow-x-auto">
          <DimensionsTable rows={dimensions} />
        </div>
      </section>

      <section className="grid gap-6 sm:grid-cols-2 print:grid-cols-2">
        <div className="space-y-2 break-inside-avoid">
          <h2 className="font-heading text-lg font-semibold">Comportamiento durante las sesiones</h2>
          <table className="w-full text-sm">
            <tbody>
              {Object.entries(EVENT_LABEL).map(([type, label]) => (
                <tr key={type} className="border-t">
                  <td className="py-1.5">{label}</td>
                  <td className="py-1.5 text-right font-medium">{fmt(eventTotals.get(type) ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="space-y-2 break-inside-avoid">
          <h2 className="font-heading text-lg font-semibold">Herramientas de productividad</h2>
          <table className="w-full text-sm">
            <thead className="text-muted-foreground">
              <tr>
                <th className="py-1.5 text-left font-medium">Herramienta</th>
                <th className="py-1.5 text-right font-medium">Usos</th>
                <th className="py-1.5 text-right font-medium">Interrupciones</th>
              </tr>
            </thead>
            <tbody>
              {(["pomodoro", "kanban"] as const).map((tool) => {
                const rows = tools.filter((r) => r.herramienta === tool);
                return (
                  <tr key={tool} className="border-t">
                    <td className="py-1.5 capitalize">{tool}</td>
                    <td className="py-1.5 text-right">{fmt(sum(rows, (r) => r.total_usos))}</td>
                    <td className="py-1.5 text-right">{fmt(sum(rows, (r) => r.total_interrupciones))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="border-t pt-3 text-xs text-muted-foreground">
        FocusLab es una herramienta de autoconocimiento: describe estilos y
        tendencias de atención, sin etiquetas ni juicios médicos. Análisis
        detallado por participante (seudonimizado) disponible para el
        investigador en Power BI y en las exportaciones CSV.
      </footer>
    </article>
  );
}
