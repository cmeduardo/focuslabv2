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
import { deviceOf, toLong } from "@/lib/analysis/participants";
import { filterByDevice, H1_PAIRS, label, scatterPoints } from "@/lib/analysis/points";
import { deviceLabel, VARIABLES } from "@/lib/analysis/variables";
import { getParticipantRows, requireResearcher } from "@/lib/services/analysis";

// Página 7 · Puntajes por dispositivo: z de cada persona frente a su propio
// grupo de dispositivo (0 = promedio del grupo). El z se calcula con todos
// los participantes; el filtro solo elige qué filas se muestran.
export default async function PuntajesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await requireResearcher();
  const device = parseDevice((await searchParams).dispositivo);
  const all = await getParticipantRows(supabase);
  const long = toLong(all);
  const rows = filterByDevice(all, device);
  const z = new Map(long.map((l) => [`${l.participante}|${l.variable}`, l.z]));
  const zOf = (row: { participante: string }, key: string) => z.get(`${row.participante}|${key}`) ?? null;
  const series = deviceSeries(rows.map(deviceOf));

  return (
    <div className="space-y-6">
      <AnalysisHeader
        current="/admin/analisis/puntajes"
        title="Puntajes por dispositivo"
        description="Cada valor convertido en puntaje z frente al grupo del mismo dispositivo: 0 es el promedio del grupo, ±1 una desviación. Así celular y laptop se leen en la misma escala sin mezclarse."
      >
        <SelectNav param="dispositivo" label="Dispositivo" value={device} options={DEVICE_FILTER_OPTIONS} />
      </AnalysisHeader>
      <ExploratoryNote n={rows.length}>
        Un grupo con menos de 3 personas o sin variación no tiene puntaje (“—”).
      </ExploratoryNote>

      <Panel title="Participante × variable" description="Violeta: por encima del promedio de su grupo. Ámbar: por debajo.">
        <DivergingKey low="−2" high="+2" />
        <div className="max-h-[34rem] overflow-auto rounded-xl border border-border">
          <table className="w-max min-w-full text-xs" data-testid="z-matrix">
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="text-muted-foreground">
                <th className="sticky left-0 bg-card px-2 py-2 text-left font-medium">Participante</th>
                {VARIABLES.map((v) => (
                  <th key={v.key} className="max-w-24 px-1 py-2 text-center align-bottom font-medium">
                    {v.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.participante}>
                  <th className="sticky left-0 bg-card px-2 py-1 text-left font-medium whitespace-nowrap">
                    {r.participante}
                    <span className="block text-[10px] font-normal text-muted-foreground">{deviceLabel(deviceOf(r))}</span>
                  </th>
                  {VARIABLES.map((v) => {
                    const value = zOf(r, v.key);
                    return (
                      <td key={v.key} className="p-0.5">
                        <div
                          className="flex h-9 min-w-14 items-center justify-center rounded-md tabular-nums"
                          style={divergingCell(value, 2)}
                          title={`${r.participante} · ${v.label}: z = ${fmtSigned(value)}`}
                        >
                          {fmtSigned(value)}
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

      <div className="grid gap-4 lg:grid-cols-3">
        {H1_PAIRS.map(({ x, y }) => {
          const points = scatterPoints(rows, x, y, zOf, 2);
          return (
            <Panel key={`${x}-${y}`} title={`${label(x)} y ${label(y)}`} description={`Puntajes z · n = ${points.length}`}>
              <ScatterChart
                zeroLines
                points={points}
                series={series}
                xLabel={`${label(x)} (z)`}
                yLabel={`${label(y)} (z)`}
                title={`Puntajes z de ${label(x)} frente a ${label(y)}`}
              />
              <DataTable
                caption={`Puntajes z de ${label(x)} y ${label(y)}`}
                headers={["Participante", `${label(x)} (z)`, `${label(y)} (z)`]}
                rows={points.map((p) => [p.id, fmtNum(p.x, 2), fmtNum(p.y, 2)])}
              />
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
