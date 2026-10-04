import { ACTIVITIES } from "@/lib/constants/nav";
import type { Database } from "@/lib/types/database";

type DimensionRow = Database["public"]["Views"]["vw_actividades_dimensiones"]["Row"];

const DEVICE_LABEL: Record<string, string> = {
  mobile: "Celular",
  tablet: "Tablet",
  desktop: "Laptop",
  sin_dato: "Sin dato",
};

const number = new Intl.NumberFormat("es-GT", { maximumFractionDigits: 1 });
const fmt = (value: number | null | undefined) =>
  value === null || value === undefined ? "—" : number.format(Number(value));

// Métrica principal de cada dimensión atencional (primer intento v2 de cada
// participante), separada por dispositivo: los tiempos de reacción en
// celular no son comparables con los de laptop.
export function DimensionsTable({ rows }: { rows: DimensionRow[] }) {
  const ordered = ACTIVITIES.flatMap((activity) =>
    rows
      .filter((row) => row.activity_type === activity.slug)
      .sort((a, b) => a.device_type.localeCompare(b.device_type))
      .map((row) => ({ ...row, name: activity.name })),
  );

  if (ordered.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no hay resultados de participantes con los desafíos actuales.
      </p>
    );
  }

  return (
    <table className="w-full text-left text-sm">
      <thead className="text-muted-foreground">
        <tr>
          <th className="py-2 pr-3 font-medium">Desafío</th>
          <th className="py-2 pr-3 font-medium">Dimensión</th>
          <th className="py-2 pr-3 font-medium">Métrica principal</th>
          <th className="py-2 pr-3 font-medium">Dispositivo</th>
          <th className="py-2 pr-3 text-right font-medium">n</th>
          <th className="py-2 pr-3 text-right font-medium">Media</th>
          <th className="py-2 pr-3 text-right font-medium">DE</th>
          <th className="py-2 pr-3 text-right font-medium">Mín–máx</th>
          <th className="py-2 text-right font-medium">Precisión (%)</th>
        </tr>
      </thead>
      <tbody>
        {ordered.map((row) => (
          <tr key={`${row.activity_type}-${row.device_type}`} className="border-t break-inside-avoid">
            <td className="py-2 pr-3 font-medium">{row.name}</td>
            <td className="py-2 pr-3">{row.dimension}</td>
            <td className="py-2 pr-3">{row.metrica_principal}</td>
            <td className="py-2 pr-3">{DEVICE_LABEL[row.device_type] ?? row.device_type}</td>
            <td className="py-2 pr-3 text-right">{fmt(row.participantes)}</td>
            <td className="py-2 pr-3 text-right">{fmt(row.valor_promedio)}</td>
            <td className="py-2 pr-3 text-right">{fmt(row.valor_desv_estandar)}</td>
            <td className="py-2 pr-3 text-right">
              {fmt(row.valor_minimo)}–{fmt(row.valor_maximo)}
            </td>
            <td className="py-2 text-right">{fmt(row.precision_promedio)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
