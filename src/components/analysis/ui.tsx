import Link from "next/link";
import { Info } from "lucide-react";

import type { SeriesDef } from "@/components/analysis/charts";
import { STYLES, type StyleId } from "@/lib/analysis/participants";
import { deviceLabel, sortDevices } from "@/lib/analysis/variables";
import { cn } from "@/lib/utils";

export const ANALYSIS_PAGES = [
  { href: "/admin/analisis/patrones", label: "Patrones (H1)", title: "Patrones diferenciados" },
  { href: "/admin/analisis/perfil-pasivo", label: "Pasivas y perfil (H2)", title: "Variables pasivas y perfil" },
  { href: "/admin/analisis/ensayos", label: "Por ensayo", title: "Detalle por ensayo" },
  { href: "/admin/analisis/distribuciones", label: "Distribuciones", title: "Distribuciones" },
  { href: "/admin/analisis/puntajes", label: "Puntajes", title: "Puntajes por dispositivo" },
  { href: "/admin/analisis/estilos", label: "Estilos", title: "Perfiles atencionales" },
  { href: "/admin/analisis/recorrido", label: "Recorrido", title: "Recorrido del taller" },
  { href: "/admin/analisis/persona", label: "Perfil individual", title: "Perfil individual" },
] as const;

// Colores por dispositivo: siempre el mismo para la misma entidad (nunca
// por orden de aparición).
const DEVICE_COLOR: Record<string, string> = {
  mobile: "var(--viz-1)",
  desktop: "var(--viz-2)",
  tablet: "var(--viz-3)",
  sin_dato: "var(--viz-neutral)",
};

export function deviceSeries(devices: Iterable<string>): SeriesDef[] {
  return sortDevices(devices).map((d) => ({
    id: d,
    label: deviceLabel(d),
    color: DEVICE_COLOR[d] ?? "var(--viz-neutral)",
  }));
}

export function deviceColor(device: string) {
  return DEVICE_COLOR[device] ?? "var(--viz-neutral)";
}

// Estilos: color + forma (la forma es la segunda señal para quien no
// distingue bien los colores).
const STYLE_LOOK: Record<StyleId, Pick<SeriesDef, "color" | "shape">> = {
  sereno_fluido: { color: "var(--viz-2)", shape: "circle" },
  activo_buen_ritmo: { color: "var(--viz-1)", shape: "square" },
  sereno_exigente: { color: "var(--viz-3)", shape: "triangle" },
  activo_exigente: { color: "var(--viz-4)", shape: "diamond" },
  sin_datos: { color: "var(--viz-neutral)", shape: "circle" },
};

export const STYLE_SERIES: SeriesDef[] = STYLES.map((s) => ({ id: s.id, label: s.label, ...STYLE_LOOK[s.id] }));

export function AnalysisNav({ current }: { current: string }) {
  return (
    <nav aria-label="Páginas del análisis" className="-mx-4 overflow-x-auto px-4 print:hidden">
      <ul className="flex w-max gap-1.5">
        <li>
          <Link
            href="/admin/analisis"
            className={cn(
              "inline-flex h-9 items-center rounded-full border border-border px-3 text-sm",
              current === "/admin/analisis" ? "border-primary bg-secondary font-medium" : "text-muted-foreground hover:text-foreground",
            )}
          >
            Inicio
          </Link>
        </li>
        {ANALYSIS_PAGES.map((p) => (
          <li key={p.href}>
            <Link
              href={p.href}
              aria-current={current === p.href ? "page" : undefined}
              className={cn(
                "inline-flex h-9 items-center rounded-full border border-border px-3 text-sm whitespace-nowrap",
                current === p.href
                  ? "border-primary bg-secondary font-medium text-secondary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {p.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function AnalysisHeader({
  current,
  title,
  description,
  children,
}: {
  current: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="space-y-4">
      <AnalysisNav current={current} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl space-y-1">
          <p className="text-sm text-muted-foreground">Análisis del investigador</p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
          <p className="text-[15px] text-muted-foreground">{description}</p>
        </div>
        {children && <div className="flex flex-wrap gap-3">{children}</div>}
      </div>
    </header>
  );
}

// Aviso obligatorio en toda vista con correlaciones, puntajes z o estilos.
export function ExploratoryNote({ n, children }: { n: number; children?: React.ReactNode }) {
  return (
    <p
      data-testid="exploratory-note"
      className="flex gap-2 rounded-xl border border-border bg-muted/50 p-3 text-sm text-muted-foreground"
    >
      <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
      <span>
        Lectura exploratoria con una muestra pequeña (n = {n}). Muestra tendencias para
        conversar, no relaciones de causa y efecto. {children}
      </span>
    </p>
  );
}

export function Panel({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("min-w-0 space-y-3 rounded-2xl border border-border bg-card p-4 sm:p-5", className)}>
      <div className="space-y-0.5">
        <h2 className="font-heading text-lg font-semibold">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

// Tabla de datos plegable: alternativa accesible a cada gráfica.
export function DataTable({
  caption,
  headers,
  rows,
  open = false,
}: {
  caption: string;
  headers: string[];
  rows: (string | number)[][];
  open?: boolean;
}) {
  return (
    <details open={open} className="group text-sm">
      <summary className="cursor-pointer text-muted-foreground select-none hover:text-foreground">
        Ver tabla de datos
      </summary>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-left">
          <caption className="sr-only">{caption}</caption>
          <thead className="text-muted-foreground">
            <tr>
              {headers.map((h, i) => (
                <th key={h} className={cn("py-1.5 pr-3 font-medium whitespace-nowrap", i > 0 && "text-right")}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <tr key={r} className="border-t border-border">
                {row.map((cell, i) => (
                  <td key={i} className={cn("py-1.5 pr-3 whitespace-nowrap", i > 0 && "text-right tabular-nums")}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

export const DEVICE_FILTER_OPTIONS = [
  { value: "todos", label: "Todos los dispositivos" },
  { value: "mobile", label: "Celular" },
  { value: "desktop", label: "Laptop" },
];

export function parseDevice(value: string | string[] | undefined) {
  const v = Array.isArray(value) ? value[0] : value;
  return v === "mobile" || v === "desktop" || v === "tablet" ? v : "todos";
}
