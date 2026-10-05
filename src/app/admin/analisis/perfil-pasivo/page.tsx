import Link from "next/link";

import { HBarChart } from "@/components/analysis/charts";
import { SelectNav } from "@/components/analysis/select-nav";
import {
  AnalysisHeader,
  DEVICE_FILTER_OPTIONS,
  deviceColor,
  ExploratoryNote,
  Panel,
  parseDevice,
} from "@/components/analysis/ui";
import { fmtNum } from "@/lib/analysis/format";
import { deviceOf, toNumber } from "@/lib/analysis/participants";
import { filterByDevice } from "@/lib/analysis/points";
import { COGNITIVE_VARIABLES, deviceLabel, PASSIVE_VARIABLES } from "@/lib/analysis/variables";
import { getParticipantRows, requireResearcher } from "@/lib/services/analysis";
import { cn } from "@/lib/utils";

const COLUMNS = [
  ...COGNITIVE_VARIABLES.map((v) => ({ key: v.key, label: v.label, group: "Desafíos" })),
  ...PASSIVE_VARIABLES.map((v) => ({ key: v.key, label: v.label, group: "Actividad pasiva" })),
  { key: "pulso_concentracion_promedio", label: "Pulso de concentración (1 a 5)", group: "Autorreporte" },
];

// Página 4 · Variables pasivas y perfil (H2).
export default async function PerfilPasivoPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await requireResearcher();
  const params = await searchParams;
  const device = parseDevice(params.dispositivo);
  const orden = typeof params.orden === "string" && COLUMNS.some((c) => c.key === params.orden) ? params.orden : "participante";
  const dir = params.dir === "desc" ? "desc" : "asc";
  const rows = filterByDevice(await getParticipantRows(supabase), device);

  const sorted = [...rows].sort((a, b) => {
    if (orden === "participante") return a.participante.localeCompare(b.participante) * (dir === "asc" ? 1 : -1);
    const va = toNumber(a[orden]);
    const vb = toNumber(b[orden]);
    // Vacíos siempre al final.
    if (va === null) return 1;
    if (vb === null) return -1;
    return (va - vb) * (dir === "asc" ? 1 : -1);
  });

  const sortHref = (key: string) => {
    const next = new URLSearchParams();
    if (device !== "todos") next.set("dispositivo", device);
    next.set("orden", key);
    next.set("dir", orden === key && dir === "asc" ? "desc" : "asc");
    return `?${next.toString()}`;
  };

  const bars = (key: string, digits = 1) =>
    sorted.map((r) => {
      const v = toNumber(r[key]);
      return {
        label: r.participante,
        value: v,
        color: deviceColor(deviceOf(r)),
        tip: `${r.participante} · ${deviceLabel(deviceOf(r))}\n${fmtNum(v, digits)}`,
      };
    });
  const withPomodoro = rows.filter((r) => toNumber(r.pomodoro_interrupcion_pct) !== null).length;
  const withPulse = rows.filter((r) => toNumber(r.pulso_concentracion_promedio) !== null).length;

  return (
    <div className="space-y-6">
      <AnalysisHeader
        current="/admin/analisis/perfil-pasivo"
        title="Variables pasivas y perfil"
        description="Lo que aportan los datos pasivos más allá del puntaje: una fila por participante, para cotejar con su informe."
      >
        <SelectNav param="dispositivo" label="Dispositivo" value={device} options={DEVICE_FILTER_OPTIONS} />
      </AnalysisHeader>
      <ExploratoryNote n={rows.length}>
        Úsala para conversar sobre estilos: un valor aislado no describe a la persona.
      </ExploratoryNote>

      <Panel title="Participantes" description="Toca el título de una columna para ordenar. Desliza hacia el lado para ver todas.">
        <div className="max-h-[32rem] overflow-auto rounded-xl border border-border">
          <table className="w-max min-w-full text-xs" data-testid="participants-table">
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="text-muted-foreground">
                <th className="sticky left-0 bg-card px-2 py-2 text-left font-medium">
                  <Link href={sortHref("participante")} className="hover:text-foreground">
                    Participante
                  </Link>
                </th>
                <th className="px-2 py-2 text-left font-medium">Dispositivo</th>
                {COLUMNS.map((c) => (
                  <th key={c.key} className="max-w-28 px-2 py-2 text-right align-bottom font-medium">
                    <Link
                      href={sortHref(c.key)}
                      className={cn("hover:text-foreground", orden === c.key && "text-foreground")}
                      aria-sort={orden === c.key ? (dir === "asc" ? "ascending" : "descending") : undefined}
                    >
                      {c.label}
                      {orden === c.key && (dir === "asc" ? " ↑" : " ↓")}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <tr key={r.participante} className="border-t border-border">
                  <th className="sticky left-0 bg-card px-2 py-1.5 text-left font-medium">{r.participante}</th>
                  <td className="px-2 py-1.5">{deviceLabel(deviceOf(r))}</td>
                  {COLUMNS.map((c) => (
                    <td key={c.key} className="px-2 py-1.5 text-right tabular-nums">
                      {fmtNum(toNumber(r[c.key]))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Interrupción de Pomodoro (%)"
          description={`Porcentaje de bloques detenidos antes de tiempo. n = ${withPomodoro}; color según el dispositivo.`}
        >
          <HBarChart title="Interrupción de Pomodoro por participante" data={bars("pomodoro_interrupcion_pct", 0)} domain={[0, 100]} format={(v) => `${fmtNum(v, 0)} %`} />
        </Panel>
        <Panel
          title="Pulso de concentración (1 a 5)"
          description={`Promedio de lo que cada persona indicó durante la sesión. n = ${withPulse}.`}
        >
          <HBarChart title="Pulso de concentración por participante" data={bars("pulso_concentracion_promedio")} domain={[0, 5]} />
        </Panel>
      </div>
    </div>
  );
}
