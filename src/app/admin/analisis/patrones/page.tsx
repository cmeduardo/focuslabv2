import { DivergingKey, divergingCell, ScatterChart } from "@/components/analysis/charts";
import { SelectNav } from "@/components/analysis/select-nav";
import {
  AnalysisHeader,
  DataTable,
  DEVICE_FILTER_OPTIONS,
  deviceSeries,
  ExploratoryNote,
  Panel,
  parseDevice,
} from "@/components/analysis/ui";
import { fmtNum, fmtSigned } from "@/lib/analysis/format";
import { correlationMatrix, deviceOf } from "@/lib/analysis/participants";
import { filterByDevice, H1_PAIRS, label, scatterPoints } from "@/lib/analysis/points";
import { COGNITIVE_VARIABLES, PASSIVE_VARIABLES } from "@/lib/analysis/variables";
import { getParticipantRows, requireResearcher } from "@/lib/services/analysis";

// Página 3 · Patrones diferenciados (H1).
export default async function PatronesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await requireResearcher();
  const device = parseDevice((await searchParams).dispositivo);
  const rows = filterByDevice(await getParticipantRows(supabase), device);
  const series = deviceSeries(rows.map(deviceOf));
  const matrix = correlationMatrix(rows);
  const cell = (p: string, c: string) => matrix.find((m) => m.pasiva === p && m.cognitiva === c)!;

  return (
    <div className="space-y-6">
      <AnalysisHeader
        current="/admin/analisis/patrones"
        title="Patrones diferenciados"
        description="Cada punto es un participante: su actividad pasiva (cambios de pestaña, inactividad) junto a su desempeño en los desafíos."
      >
        <SelectNav param="dispositivo" label="Dispositivo" value={device} options={DEVICE_FILTER_OPTIONS} />
      </AnalysisHeader>
      <ExploratoryNote n={rows.length}>
        Los tiempos de celular y laptop se distinguen por color y no se interpretan como un mismo grupo.
      </ExploratoryNote>

      <div className="grid gap-4 lg:grid-cols-3">
        {H1_PAIRS.map(({ x, y }) => {
          const points = scatterPoints(rows, x, y);
          const r = cell(x, y);
          return (
            <Panel
              key={`${x}-${y}`}
              title={`${label(x)} y ${label(y)}`}
              description={`r = ${r.r === null ? "—" : fmtSigned(r.r)} · n = ${r.n}`}
            >
              <ScatterChart points={points} series={series} xLabel={label(x)} yLabel={label(y)} title={`${label(x)} frente a ${label(y)}`} />
              <DataTable
                caption={`${label(x)} y ${label(y)} por participante`}
                headers={["Participante", label(x), label(y)]}
                rows={points.map((p) => [p.id, fmtNum(p.x), fmtNum(p.y)])}
              />
            </Panel>
          );
        })}
      </div>

      <Panel
        title="Correlaciones entre variables pasivas y desafíos"
        description="Pearson sobre las personas que tienen ambos valores. Con menos de 5 pares se muestra “—”."
      >
        <DivergingKey low="−1 (relación inversa)" high="+1 (relación directa)" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[56rem] text-xs" data-testid="correlation-matrix">
            <thead>
              <tr className="text-muted-foreground">
                <th className="w-48 py-2 pr-2 text-left font-medium">Variable pasiva</th>
                {COGNITIVE_VARIABLES.map((c) => (
                  <th key={c.key} className="px-1 py-2 text-center align-bottom font-medium">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PASSIVE_VARIABLES.map((p) => (
                <tr key={p.key}>
                  <th className="py-1 pr-2 text-left font-normal">{p.label}</th>
                  {COGNITIVE_VARIABLES.map((c) => {
                    const m = cell(p.key, c.key);
                    return (
                      <td key={c.key} className="p-0.5">
                        <div
                          className="flex h-11 flex-col items-center justify-center rounded-md tabular-nums"
                          style={divergingCell(m.r, 1)}
                          title={`${p.label} · ${c.label}: r = ${fmtSigned(m.r)}, n = ${m.n}`}
                        >
                          <span className="font-semibold">{fmtSigned(m.r)}</span>
                          <span className="text-[10px] opacity-80">n = {m.n}</span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
