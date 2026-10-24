import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { escapeCsv } from "@/lib/csv";
import type { Database, UserRole } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

// Las vistas vw_* filtran por rol en la base y nunca exponen perfil_id.
// aggregate: investigador y autoridad. participant: solo investigador.
export const EXPORT_DATASETS = {
  dimensiones: {
    view: "vw_actividades_dimensiones",
    scope: "aggregate",
    label: "Dimensiones",
    columns: [
      "tipo_actividad",
      "dimension",
      "metrica_principal",
      "tipo_dispositivo",
      "participantes",
      "valor_promedio",
      "valor_desv_estandar",
      "valor_minimo",
      "valor_maximo",
      "precision_promedio",
      "duracion_s_promedio",
    ],
  },
  actividades: {
    view: "vw_resumen_resultados_actividad",
    scope: "aggregate",
    label: "Actividades",
    columns: [
      "tipo_actividad",
      "total_resultados",
      "duracion_ms_promedio",
      "precision_promedio",
      "nivel_promedio",
      "precision_desv_estandar",
    ],
  },
  eventos: {
    view: "vw_resumen_eventos_interaccion",
    scope: "aggregate",
    label: "Eventos",
    columns: ["tipo_evento", "dia", "total_eventos"],
  },
  sesiones: {
    view: "vw_resumen_sesiones",
    scope: "aggregate",
    label: "Sesiones",
    columns: ["dia", "estado", "total_sesiones", "duracion_segundos_promedio"],
  },
  herramientas: {
    view: "vw_resumen_uso_herramientas",
    scope: "aggregate",
    label: "Herramientas",
    columns: ["herramienta", "dia", "total_usos", "total_interrupciones"],
  },
  participantes: {
    view: "vw_participantes_analisis",
    scope: "participant",
    label: "Participantes (seudónimo)",
    columns: null,
  },
  ensayos: {
    view: "vw_ensayos_analisis",
    scope: "participant",
    label: "Ensayos (seudónimo)",
    columns: [
      "participante",
      "tipo_actividad",
      "tipo_dispositivo",
      "entrada_principal",
      "frecuencia_refresco_est",
      "corrida_inicio",
      "indice_ensayo",
      "condicion",
      "inicio_estimulo_ms",
      "tiempo_reaccion_ms",
      "respuesta",
      "correcto",
      "clasificacion",
      "tipo_entrada",
      "valido",
      "motivo_invalidez",
    ],
  },
} as const satisfies Record<
  string,
  {
    view: keyof Database["public"]["Views"];
    scope: "aggregate" | "participant";
    label: string;
    columns: readonly string[] | null;
  }
>;

export type ExportDataset = keyof typeof EXPORT_DATASETS;

export function isExportDataset(value: string | null): value is ExportDataset {
  return value !== null && value in EXPORT_DATASETS;
}

export function canExport(dataset: ExportDataset, role: UserRole | null | undefined) {
  if (EXPORT_DATASETS[dataset].scope === "participant") return role === "investigador";
  return role === "investigador" || role === "autoridad";
}

// PostgREST corta en 1000 filas.
const PAGE_SIZE = 1000;

async function fetchAllRows(supabase: Client, view: keyof Database["public"]["Views"]) {
  const rows: Record<string, unknown>[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from(view)
      .select("*")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error("No se pudo generar la exportación.");
    rows.push(...((data ?? []) as Record<string, unknown>[]));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

export async function getAdminOverview(supabase: Client) {
  const [dimensions, activities, events, sessions, tools] = await Promise.all([
    supabase.from("vw_actividades_dimensiones").select("*"),
    supabase.from("vw_resumen_resultados_actividad").select("*"),
    supabase.from("vw_resumen_eventos_interaccion").select("*"),
    supabase.from("vw_resumen_sesiones").select("*").order("dia"),
    supabase.from("vw_resumen_uso_herramientas").select("*").order("dia"),
  ]);

  if (dimensions.error || activities.error || events.error || sessions.error || tools.error) {
    throw new Error("No se pudo cargar el panel agregado.");
  }

  return {
    dimensions: dimensions.data ?? [],
    activities: activities.data ?? [],
    events: events.data ?? [],
    sessions: sessions.data ?? [],
    tools: tools.data ?? [],
  };
}

export async function buildDatasetCsv(supabase: Client, dataset: ExportDataset) {
  const { view, columns } = EXPORT_DATASETS[dataset];
  const rows = await fetchAllRows(supabase, view);
  const header: readonly string[] = columns ?? (rows[0] ? Object.keys(rows[0]) : ["participante"]);
  const lines = [
    header.join(","),
    ...rows.map((row) => header.map((column) => escapeCsv(row[column])).join(",")),
  ];

  // BOM para que Excel interprete el UTF-8 correctamente.
  return `\uFEFF${lines.join("\n")}\n`;
}
