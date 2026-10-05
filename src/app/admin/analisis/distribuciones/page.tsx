import { ColumnChart } from "@/components/analysis/charts";
import { SelectNav } from "@/components/analysis/select-nav";
import { AnalysisHeader, deviceColor, Panel } from "@/components/analysis/ui";
import { fmtNum } from "@/lib/analysis/format";
import { distribution, toLong, TRAMOS } from "@/lib/analysis/participants";
import { deviceLabel, isVariableKey, sortDevices, VARIABLES, type VariableKey } from "@/lib/analysis/variables";
import { getParticipantRows, requireResearcher } from "@/lib/services/analysis";

// Página 6 · Distribuciones: participantes por tramo (5 tramos de igual
// ancho dentro de cada dispositivo) y resumen de cinco números.
export default async function DistribucionesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await requireResearcher();
  const requested = (await searchParams).variable;
  const raw = typeof requested === "string" ? requested : null;
  const variable: VariableKey = isVariableKey(raw) ? raw : "rt_promedio_ms";
  const def = VARIABLES.find((v) => v.key === variable)!;
  const long = toLong(await getParticipantRows(supabase));
  const dist = distribution(long, variable);
  const devices = sortDevices(dist.map((d) => d.dispositivo));

  return (
    <div className="space-y-6">
      <AnalysisHeader
        current="/admin/analisis/distribuciones"
        title="Distribuciones"
        description="Cómo se reparte una variable entre las personas. Los tramos se calculan dentro de cada dispositivo: el tramo 1 de celular y el de laptop no son el mismo rango."
      >
        <SelectNav
          param="variable"
          label="Variable"
          value={variable}
          options={VARIABLES.map((v) => ({ value: v.key, label: v.label }))}
        />
      </AnalysisHeader>

      <div className="grid gap-4 lg:grid-cols-2">
        {devices.map((d) => {
          const g = dist.find((x) => x.dispositivo === d)!;
          const width = (g.max - g.min) / TRAMOS;
          const range = (i: number) =>
            width === 0 ? fmtNum(g.min) : `${fmtNum(g.min + width * i)}–${fmtNum(g.min + width * (i + 1))}`;
          return (
            <Panel key={d} title={deviceLabel(d)} description={`${def.label} · n = ${g.n}`}>
              <ColumnChart
                title={`${def.label} por tramo en ${deviceLabel(d)}`}
                color={deviceColor(d)}
                xLabel="Tramo (1 = valores más bajos)"
                yLabel="Participantes"
                data={g.tramos.map((n, i) => ({
                  label: String(i + 1),
                  value: n,
                  tip: `Tramo ${i + 1}: ${range(i)}\n${n} de ${g.n} participantes`,
                }))}
              />
            </Panel>
          );
        })}
        {devices.length === 0 && <p className="text-sm text-muted-foreground">Todavía no hay valores para esta variable.</p>}
      </div>

      {devices.length > 0 && (
        <Panel title="Resumen por dispositivo">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="distribution-summary">
              <thead className="text-muted-foreground">
                <tr>
                  {["Dispositivo", "n", "Mínimo", "P25", "Mediana", "P75", "Máximo"].map((h, i) => (
                    <th key={h} className={i === 0 ? "py-1.5 text-left font-medium" : "py-1.5 text-right font-medium"}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {devices.map((d) => {
                  const g = dist.find((x) => x.dispositivo === d)!;
                  return (
                    <tr key={d} className="border-t border-border tabular-nums">
                      <td className="py-1.5">{deviceLabel(d)}</td>
                      {[g.n, g.min, g.p25, g.mediana, g.p75, g.max].map((v, i) => (
                        <td key={i} className="py-1.5 text-right">
                          {fmtNum(v)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
}
