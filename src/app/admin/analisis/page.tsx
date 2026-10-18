import Link from "next/link";

import { AnalysisHeader, ANALYSIS_PAGES } from "@/components/analysis/ui";
import { getParticipantRows, requireResearcher } from "@/lib/services/analysis";
import { deviceOf } from "@/lib/analysis/participants";

const DESCRIPTIONS: Record<string, string> = {
  "/admin/analisis/patrones": "Actividad pasiva frente al desempeño en los desafíos, con correlaciones.",
  "/admin/analisis/perfil-pasivo": "Una fila por participante: desempeño, actividad pasiva y pulso de concentración.",
  "/admin/analisis/ensayos": "Tiempos de reacción, interferencia y búsqueda visual, ensayo por ensayo.",
  "/admin/analisis/distribuciones": "Cuántas personas caen en cada tramo de una variable, por dispositivo.",
  "/admin/analisis/puntajes": "Puntaje z de cada persona frente a su grupo de dispositivo.",
  "/admin/analisis/estilos": "Cuatro estilos según actividad pasiva y dificultad en los desafíos.",
  "/admin/analisis/recorrido": "Participación, desafíos completados y cierre de las sesiones.",
  "/admin/analisis/persona": "El estilo y la posición de una persona en cada variable, frente a su grupo.",
};

export default async function AnalisisPage() {
  const supabase = await requireResearcher();
  const rows = await getParticipantRows(supabase);
  const mobile = rows.filter((r) => deviceOf(r) === "mobile").length;
  const desktop = rows.filter((r) => deviceOf(r) === "desktop").length;

  return (
    <div className="space-y-6">
      <AnalysisHeader
        current="/admin/analisis"
        title="Análisis del taller"
        description={`Datos por participante con seudónimo, del primer intento de cada desafío. ${rows.length} participantes: ${mobile} en celular y ${desktop} en laptop.`}
      />
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ANALYSIS_PAGES.map((p) => (
          <li key={p.href}>
            <Link
              href={p.href}
              className="flex h-full flex-col gap-1.5 rounded-lg border border-border bg-card p-4 transition-colors hover:border-foreground/40"
            >
              <span className="font-heading font-semibold">{p.title}</span>
              <span className="text-sm text-muted-foreground">{DESCRIPTIONS[p.href]}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
