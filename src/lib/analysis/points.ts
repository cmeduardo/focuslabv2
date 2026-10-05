import type { ScatterPoint } from "@/components/analysis/charts";
import { fmtNum } from "@/lib/analysis/format";
import { deviceOf, toNumber, type ParticipantRow } from "@/lib/analysis/participants";
import { deviceLabel, VARIABLE_BY_KEY } from "@/lib/analysis/variables";

export const label = (key: string) => VARIABLE_BY_KEY.get(key)?.label ?? key;

// Puntos de dispersión (uno por participante con ambos valores), color por
// dispositivo. El tooltip lleva seudónimo, dispositivo y los dos valores.
export function scatterPoints(
  rows: readonly ParticipantRow[],
  xKey: string,
  yKey: string,
  value: (row: ParticipantRow, key: string) => number | null = (row, key) => toNumber(row[key]),
  digits = 1,
): ScatterPoint[] {
  return rows.flatMap((row) => {
    const x = value(row, xKey);
    const y = value(row, yKey);
    if (x === null || y === null) return [];
    const device = deviceOf(row);
    return [
      {
        id: row.participante,
        x,
        y,
        series: device,
        tip: `${row.participante} · ${deviceLabel(device)}\n${label(xKey)}: ${fmtNum(x, digits)}\n${label(yKey)}: ${fmtNum(y, digits)}`,
      },
    ];
  });
}

export function filterByDevice<T extends Pick<ParticipantRow, "dispositivo_principal">>(
  rows: readonly T[],
  device: string,
): T[] {
  return device === "todos" ? [...rows] : rows.filter((r) => deviceOf(r) === device);
}

export const H1_PAIRS = [
  { x: "cambios_pestana_por_sesion", y: "ff_comision_pct" },
  { x: "inactividad_promedio_s", y: "rt_lapsos" },
  { x: "dr_salidas_pestana", y: "dr_comprension" },
] as const;
