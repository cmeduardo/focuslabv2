import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

// RF-13/RF-14: las vistas vw_* ya filtran por current_user_role() y no
// exponen user_id (RS-04), así que se leen con el cliente del usuario — un
// participante que llegara aquí recibiría cero filas.
export const EXPORT_DATASETS = {
  actividades: {
    view: "vw_activity_results_summary",
    columns: [
      "activity_type",
      "total_resultados",
      "duracion_ms_promedio",
      "precision_promedio",
      "nivel_promedio",
      "precision_desv_estandar",
    ],
  },
  eventos: {
    view: "vw_interaction_events_summary",
    columns: ["event_type", "dia", "total_eventos"],
  },
  sesiones: {
    view: "vw_sessions_summary",
    columns: ["dia", "status", "total_sesiones", "duracion_segundos_promedio"],
  },
  herramientas: {
    view: "vw_tool_usage_summary",
    columns: ["herramienta", "dia", "total_usos", "total_interrupciones"],
  },
} as const;

export type ExportDataset = keyof typeof EXPORT_DATASETS;

export function isExportDataset(value: string | null): value is ExportDataset {
  return value !== null && value in EXPORT_DATASETS;
}

export async function getAdminOverview(supabase: Client) {
  const [activities, events, sessions, tools] = await Promise.all([
    supabase.from("vw_activity_results_summary").select("*"),
    supabase.from("vw_interaction_events_summary").select("*"),
    supabase.from("vw_sessions_summary").select("*").order("dia"),
    supabase.from("vw_tool_usage_summary").select("*").order("dia"),
  ]);

  if (activities.error || events.error || sessions.error || tools.error) {
    throw new Error("No se pudo cargar el panel agregado.");
  }

  return {
    activities: activities.data ?? [],
    events: events.data ?? [],
    sessions: sessions.data ?? [],
    tools: tools.data ?? [],
  };
}

function escapeCsv(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);

  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export async function buildDatasetCsv(supabase: Client, dataset: ExportDataset) {
  const { view, columns } = EXPORT_DATASETS[dataset];
  const { data, error } = await supabase.from(view).select("*");

  if (error) {
    throw new Error("No se pudo generar la exportación.");
  }

  const rows = (data ?? []) as Record<string, unknown>[];
  const lines = [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => escapeCsv(row[column])).join(",")),
  ];

  // BOM para que Excel interprete el UTF-8 correctamente.
  return `﻿${lines.join("\n")}\n`;
}
