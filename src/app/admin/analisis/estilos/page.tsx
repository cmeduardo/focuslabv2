import { DonutChart, ScatterChart } from "@/components/analysis/charts";
import { AnalysisHeader, DataTable, ExploratoryNote, Panel, STYLE_SERIES } from "@/components/analysis/ui";
import { fmtNum, fmtSigned } from "@/lib/analysis/format";
import { mean, profiles, styleCounts, toLong, toNumber } from "@/lib/analysis/participants";
import { label } from "@/lib/analysis/points";
import { deviceLabel } from "@/lib/analysis/variables";
import { getParticipantRows, requireResearcher } from "@/lib/services/analysis";

// Variables que se promedian por estilo (valores originales, no z).
const STYLE_TABLE_VARS = [
  "cambios_pestana_por_sesion",
  "inactividad_promedio_s",
  "rt_promedio_ms",
  "ff_comision_pct",
  "mm_span",
  "dr_comprension",
];

// Página 8 · Perfiles atencionales (H1): cuatro estilos según el índice de
// actividad pasiva y el índice de dificultad en desafíos (ambos en z,
// dentro de cada dispositivo).
export default async function EstilosPage() {
  const supabase = await requireResearcher();
  const rows = await getParticipantRows(supabase);
  const list = profiles(rows, toLong(rows));
  const counts = styleCounts(list).filter((s) => s.id !== "sin_datos" || s.n > 0);
  const byStyle = new Map(STYLE_SERIES.map((s) => [s.id, s]));
  const rowOf = new Map(rows.map((r) => [r.participante, r]));
  const placed = list.filter((p) => p.pasivo !== null && p.dificultad !== null);

  return (
    <div className="space-y-6">
      <AnalysisHeader
        current="/admin/analisis/estilos"
        title="Perfiles atencionales"
        description="Índice de actividad pasiva: promedio de los z de cambios de pestaña, inactividad y Pomodoro. Índice de dificultad: promedio de los z de los desafíos, con span y comprensión invertidos (más alto = más exigente)."
      />
      <ExploratoryNote n={placed.length}>
        Los estilos describen tendencias dentro de este grupo, no categorías fijas de las personas.
      </ExploratoryNote>

      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <Panel title="Actividad pasiva y dificultad en desafíos" description="Cada punto es un participante; las líneas marcan el promedio (0).">
          <ScatterChart
            zeroLines
            title="Índice de actividad pasiva frente a índice de dificultad"
            xLabel="Índice de actividad pasiva (z)"
            yLabel="Índice de dificultad (z)"
            series={STYLE_SERIES}
            points={placed.map((p) => ({
              id: p.participante,
              x: p.pasivo as number,
              y: p.dificultad as number,
              series: p.estilo,
              tip: `${p.participante} · ${deviceLabel(p.dispositivo)}\n${byStyle.get(p.estilo)?.label}\nPasivo ${fmtSigned(p.pasivo)} · dificultad ${fmtSigned(p.dificultad)}`,
            }))}
          />
        </Panel>
        <Panel title="Participantes por estilo">
          <DonutChart
            title="Participantes por estilo atencional"
            centerLabel="participantes"
            slices={counts.map((s) => ({
              ...byStyle.get(s.id)!,
              value: s.n,
              tip: `${s.label}\n${s.n} de ${list.length} participantes`,
            }))}
          />
        </Panel>
      </div>

      <Panel title="Promedios por estilo" description="Valores originales (no z) de algunas variables, para darle contenido a cada estilo.">
        <DataTable
          open
          caption="Promedios por estilo atencional"
          headers={["Estilo", "n", "Índice pasivo", "Índice de dificultad", ...STYLE_TABLE_VARS.map(label)]}
          rows={counts.map((s) => {
            const members = list.filter((p) => p.estilo === s.id);
            const avg = (pick: (p: (typeof members)[number]) => number | null) =>
              mean(members.map(pick).filter((v): v is number => v !== null));
            return [
              s.label,
              s.n,
              fmtSigned(avg((p) => p.pasivo)),
              fmtSigned(avg((p) => p.dificultad)),
              ...STYLE_TABLE_VARS.map((key) => fmtNum(avg((p) => toNumber(rowOf.get(p.participante)?.[key])))),
            ];
          })}
        />
      </Panel>
    </div>
  );
}
