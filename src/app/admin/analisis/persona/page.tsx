import { HBarChart } from "@/components/analysis/charts";
import { SelectNav } from "@/components/analysis/select-nav";
import { AnalysisHeader, ExploratoryNote, Panel, STYLE_SERIES } from "@/components/analysis/ui";
import { fmtNum, fmtPct, fmtSigned } from "@/lib/analysis/format";
import { personDetail, profiles, toLong } from "@/lib/analysis/participants";
import { label } from "@/lib/analysis/points";
import { deviceLabel } from "@/lib/analysis/variables";
import { getParticipantRows, requireResearcher } from "@/lib/services/analysis";

// Página 10 · Perfil individual (solo seudónimos).
export default async function PersonaPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await requireResearcher();
  const requested = (await searchParams).p;
  const rows = await getParticipantRows(supabase);
  const long = toLong(rows);
  const list = profiles(rows, long);
  const selected = list.find((p) => p.participante === requested) ?? list[0];
  const detail = selected ? personDetail(long, selected.participante) : [];
  const group = selected ? rows.filter((r) => (r.dispositivo_principal ?? "sin_dato") === selected.dispositivo).length : 0;
  const style = STYLE_SERIES.find((s) => s.id === selected?.estilo);

  return (
    <div className="space-y-6">
      <AnalysisHeader
        current="/admin/analisis/persona"
        title="Perfil individual"
        description="Vista descriptiva para conversar sobre estilos y tendencias, no un ranking."
      >
        {list.length > 0 && (
          <SelectNav
            param="p"
            label="Participante"
            value={selected?.participante ?? ""}
            options={list.map((p) => ({ value: p.participante, label: `${p.participante} · ${deviceLabel(p.dispositivo)}` }))}
          />
        )}
      </AnalysisHeader>

      {!selected ? (
        <p className="text-sm text-muted-foreground">Todavía no hay participantes con resultados.</p>
      ) : (
        <>
          <ExploratoryNote n={group}>
            Se compara solo con su grupo de {deviceLabel(selected.dispositivo).toLowerCase()}.
          </ExploratoryNote>
          <section className="grid gap-3 sm:grid-cols-3" data-testid="person-summary">
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Estilo</p>
              <p className="font-heading text-lg font-semibold">{style?.label}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Índice de actividad pasiva</p>
              <p className="font-heading text-2xl font-semibold tabular-nums">{fmtSigned(selected.pasivo)}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Índice de dificultad en desafíos</p>
              <p className="font-heading text-2xl font-semibold tabular-nums">{fmtSigned(selected.dificultad)}</p>
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel
              title="Posición en cada variable"
              description="Puntaje z frente a su grupo: a la derecha, por encima del promedio; a la izquierda, por debajo."
            >
              <HBarChart
                diverging
                title={`Puntajes z de ${selected.participante}`}
                format={(v) => fmtSigned(v)}
                data={detail.map((d) => ({
                  label: label(d.variable),
                  value: d.z,
                  color: d.z !== null && d.z < 0 ? "var(--viz-3)" : "var(--viz-1)",
                  tip: `${label(d.variable)}\nz = ${fmtSigned(d.z)} · grupo n = ${d.nGrupo}`,
                }))}
              />
            </Panel>
            <Panel title="Valores frente a su grupo">
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="person-table">
                  <thead className="text-muted-foreground">
                    <tr>
                      <th className="py-1.5 pr-2 text-left font-medium">Variable</th>
                      <th className="py-1.5 pr-2 text-right font-medium">Valor</th>
                      <th className="py-1.5 pr-2 text-right font-medium">Promedio del grupo</th>
                      <th className="py-1.5 text-right font-medium">Percentil</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.map((d) => (
                      <tr key={d.variable} className="border-t border-border tabular-nums">
                        <td className="py-1.5 pr-2">{label(d.variable)}</td>
                        <td className="py-1.5 pr-2 text-right">{fmtNum(d.valor)}</td>
                        <td className="py-1.5 pr-2 text-right">{fmtNum(d.promedioGrupo)}</td>
                        <td className="py-1.5 text-right">{fmtPct(d.percentil)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground">
                Percentil: parte de su grupo con un valor igual o menor.
              </p>
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
