import { ColumnChart, HBarChart, LineChart } from "@/components/analysis/charts";
import { AnalysisHeader, DataTable, deviceColor, Panel } from "@/components/analysis/ui";
import { fmtNum } from "@/lib/analysis/format";
import { firstRunOnly, rtHistogram, searchMeans, stroopMeans } from "@/lib/analysis/trials";
import { deviceLabel, sortDevices } from "@/lib/analysis/variables";
import { getTrialRows, requireResearcher } from "@/lib/services/analysis";

const SEARCH_TYPE: Record<string, { label: string; color: string; shape: "circle" | "square" }> = {
  feature: { label: "Rasgo (solo forma)", color: "var(--viz-3)", shape: "circle" },
  conjunction: { label: "Conjunción (forma y orientación)", color: "var(--viz-4)", shape: "square" },
};

// Tipo de búsqueda con colores distintos a los de dispositivo (violeta y
// verde ya significan celular y laptop en toda la sección).
// Página 5 · Detalle por ensayo. Siempre un panel por dispositivo: los
// tiempos de celular y laptop no comparten eje.
export default async function EnsayosPage() {
  const supabase = await requireResearcher();
  const trials = firstRunOnly(await getTrialRows(supabase, ["reaction_test", "word_sprint", "pattern_hunt"]));
  const histograms = rtHistogram(trials);
  const stroop = stroopMeans(trials);
  const search = searchMeans(trials);

  const stroopDevices = sortDevices(stroop.map((c) => c.dispositivo));
  const searchDevices = sortDevices(search.map((c) => c.dispositivo));

  return (
    <div className="space-y-6">
      <AnalysisHeader
        current="/admin/analisis/ensayos"
        title="Detalle por ensayo"
        description="Primer intento de cada participante, solo ensayos válidos (sin salir de la pestaña). En Word Sprint y Pattern Hunt, solo respuestas correctas."
      />

      <Panel
        title="Reaction Test · tiempos de reacción"
        description="Cuántas respuestas cayeron en cada intervalo de 50 ms. El celular suma latencia táctil: cada dispositivo va en su propio panel."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {sortDevices(histograms.map((h) => h.dispositivo)).map((d) => {
            const h = histograms.find((x) => x.dispositivo === d)!;
            return (
              <div key={d} className="space-y-1">
                <p className="text-sm font-medium">
                  {deviceLabel(d)} <span className="font-normal text-muted-foreground">· {h.n} respuestas</span>
                </p>
                <ColumnChart
                  title={`Histograma de tiempos de reacción en ${deviceLabel(d)}`}
                  color={deviceColor(d)}
                  xLabel="Tiempo de reacción (ms)"
                  yLabel="Respuestas"
                  data={h.bins.map((b) => ({
                    label: String(b.desde),
                    value: b.n,
                    tip: `${b.etiqueta} ms\n${b.n} respuestas (de ${h.n})`,
                  }))}
                />
                <DataTable
                  caption={`Tiempos de reacción en ${deviceLabel(d)}`}
                  headers={["Intervalo (ms)", "Respuestas"]}
                  rows={h.bins.filter((b) => b.n > 0).map((b) => [b.etiqueta, b.n])}
                />
              </div>
            );
          })}
          {histograms.length === 0 && <p className="text-sm text-muted-foreground">Sin ensayos todavía.</p>}
        </div>
      </Panel>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Panel
          title="Word Sprint · palabra y color"
          description="Tiempo medio cuando la palabra coincide con el color de la tinta y cuando no. La diferencia es la interferencia."
        >
          {stroopDevices.map((d) => {
            const cells = stroop.filter((c) => c.dispositivo === d);
            const get = (cond: string) => cells.find((c) => c.condicion === cond);
            const con = get("congruente");
            const inc = get("incongruente");
            return (
              <div key={d} className="space-y-2">
                <p className="text-sm font-medium">
                  {deviceLabel(d)}
                  {con && inc && (
                    <span className="font-normal text-muted-foreground"> · interferencia {fmtNum(inc.promedio - con.promedio, 0)} ms</span>
                  )}
                </p>
                <HBarChart
                  title={`Word Sprint en ${deviceLabel(d)}`}
                  format={(v) => `${fmtNum(v, 0)} ms`}
                  data={[con, inc].flatMap((c) =>
                    c
                      ? [
                          {
                            label: c.condicion === "congruente" ? "Coincide" : "No coincide",
                            value: c.promedio,
                            color: deviceColor(d),
                            tip: `${c.condicion === "congruente" ? "Coincide" : "No coincide"}\n${fmtNum(c.promedio, 0)} ms · n = ${c.n} ensayos`,
                          },
                        ]
                      : [],
                  )}
                />
              </div>
            );
          })}
          {stroopDevices.length === 0 && <p className="text-sm text-muted-foreground">Sin ensayos todavía.</p>}
        </Panel>

        <Panel
          title="Pattern Hunt · tamaño del conjunto"
          description="Tiempo medio para responder según cuántas figuras hay. Una pendiente plana indica búsqueda eficiente."
        >
          {searchDevices.map((d) => {
            const cells = search.filter((c) => c.dispositivo === d);
            return (
              <div key={d} className="space-y-1">
                <p className="text-sm font-medium">{deviceLabel(d)}</p>
                <LineChart
                  title={`Pattern Hunt en ${deviceLabel(d)}`}
                  xLabel="Figuras en pantalla"
                  yLabel="Tiempo medio (ms)"
                  lines={Object.entries(SEARCH_TYPE).map(([id, look]) => ({
                    id,
                    ...look,
                    points: cells
                      .filter((c) => c.tipo === id)
                      .map((c) => ({
                        x: c.tamano,
                        y: c.promedio,
                        tip: `${look.label} · ${c.tamano} figuras\n${fmtNum(c.promedio, 0)} ms · n = ${c.n} ensayos`,
                      })),
                  }))}
                />
                <DataTable
                  caption={`Pattern Hunt en ${deviceLabel(d)}`}
                  headers={["Búsqueda", "Figuras", "Tiempo medio (ms)", "Ensayos"]}
                  rows={cells.map((c) => [SEARCH_TYPE[c.tipo]?.label ?? c.tipo, c.tamano, fmtNum(c.promedio, 0), c.n])}
                />
              </div>
            );
          })}
          {searchDevices.length === 0 && <p className="text-sm text-muted-foreground">Sin ensayos todavía.</p>}
        </Panel>
      </div>
    </div>
  );
}
