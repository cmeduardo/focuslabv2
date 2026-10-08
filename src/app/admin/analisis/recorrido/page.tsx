import { ColumnChart, HBarChart } from "@/components/analysis/charts";
import { AnalysisHeader, DataTable, Panel } from "@/components/analysis/ui";
import { fmtNum } from "@/lib/analysis/format";
import { completedPerPerson, participantsPerActivity, sessionTotals } from "@/lib/analysis/overview";
import { mean, toNumber } from "@/lib/analysis/participants";
import { ACTIVITIES } from "@/lib/constants/nav";
import { getJourneyData, requireResearcher } from "@/lib/services/analysis";

const STATUS_LABEL: Record<string, string> = {
  completada: "Completadas",
  en_progreso: "En curso",
  abandonada: "Sin terminar",
};

// Página 9 · Recorrido del taller.
export default async function RecorridoPage() {
  const supabase = await requireResearcher();
  const { participants, dimensions, sessions } = await getJourneyData(supabase);
  const totals = sessionTotals(sessions);
  const perActivity = participantsPerActivity(dimensions);
  const perPerson = completedPerPerson(participants);
  const avgCompleted = mean(
    participants.map((p) => toNumber(p.actividades_completadas)).filter((v): v is number => v !== null),
  );

  const kpis = [
    { label: "Participantes con resultados", value: fmtNum(participants.length, 0) },
    { label: "Sesiones", value: fmtNum(totals.total, 0) },
    { label: "Sesiones completadas", value: totals.pctCompletadas === null ? "—" : `${fmtNum(totals.pctCompletadas, 0)} %` },
    { label: "Desafíos por persona (promedio)", value: fmtNum(avgCompleted) },
  ];

  return (
    <div className="space-y-6">
      <AnalysisHeader
        current="/admin/analisis/recorrido"
        title="Recorrido del taller"
        description="Cuántas personas completaron cada desafío, cuántos desafíos completó cada una y cómo terminaron las sesiones."
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="journey-kpis">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className="font-heading text-3xl font-semibold">{k.value}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Participantes que completaron cada desafío" description="Primer intento completado, celular y laptop sumados.">
          <HBarChart
            title="Participantes por desafío"
            domain={[0, Math.max(participants.length, 1)]}
            format={(v) => fmtNum(v, 0)}
            data={ACTIVITIES.map((a) => {
              const n = perActivity.get(a.slug) ?? 0;
              return { label: a.name, value: n, tip: `${a.name}\n${n} de ${participants.length} participantes` };
            })}
          />
        </Panel>
        <Panel title="Desafíos completados por persona">
          <ColumnChart
            title="Participantes según cuántos desafíos completaron"
            xLabel="Desafíos completados"
            yLabel="Participantes"
            data={perPerson.map((c) => ({
              label: String(c.completados),
              value: c.n,
              tip: `${c.completados} desafío${c.completados === 1 ? "" : "s"}\n${c.n} participantes`,
            }))}
          />
          <DataTable
            caption="Desafíos completados por persona"
            headers={["Desafíos completados", "Participantes"]}
            rows={perPerson.map((c) => [c.completados, c.n])}
          />
        </Panel>
      </div>

      <Panel title="Sesiones según cómo terminaron">
        <HBarChart
          title="Sesiones por estado"
          domain={[0, Math.max(totals.total, 1)]}
          format={(v) => fmtNum(v, 0)}
          data={["completada", "en_progreso", "abandonada"].map((s) => {
            const n = totals.byStatus.get(s) ?? 0;
            return { label: STATUS_LABEL[s], value: n, tip: `${STATUS_LABEL[s]}\n${n} de ${totals.total} sesiones` };
          })}
        />
      </Panel>
    </div>
  );
}
