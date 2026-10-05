// Gráficas del análisis del investigador: SVG propio, sin librería. Son
// Server Components (no envían JS); el tooltip lo pone <ChartTooltip>.
// Especificaciones: barras ≤ 24 px con punta redondeada y base recta,
// líneas de 2 px, puntos ≥ 8 px con anillo del color de la superficie,
// rejilla de 1 px recesiva, leyenda con ≥ 2 series y texto siempre en
// tokens de texto (nunca del color de la serie).

import { ChartTooltip } from "@/components/analysis/chart-tooltip";
import { fmtNum } from "@/lib/analysis/format";
import { cn } from "@/lib/utils";

export type Shape = "circle" | "square" | "triangle" | "diamond";
export type SeriesDef = { id: string; label: string; color: string; shape?: Shape };

export { fmtNum };

// Marcas de eje "redondas" (1, 2, 5 × 10^k).
export function niceTicks(min: number, max: number, count = 5): number[] {
  if (min === max) {
    const pad = Math.abs(min) > 0 ? Math.abs(min) * 0.1 : 1;
    min -= pad;
    max += pad;
  }
  const raw = (max - min) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let t = start; t <= end + step / 2; t += step) ticks.push(Math.round(t * 1e6) / 1e6);
  return ticks;
}

const W = 360;
const H = 260;
const M = { top: 12, right: 12, bottom: 48, left: 54 };

function linear(domain: [number, number], range: [number, number]) {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  return (v: number) => (d1 === d0 ? (r0 + r1) / 2 : r0 + ((v - d0) / (d1 - d0)) * (r1 - r0));
}

export function Legend({ series, className }: { series: SeriesDef[]; className?: string }) {
  if (series.length < 2) return null;
  return (
    <ul className={cn("flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground", className)}>
      {series.map((s) => (
        <li key={s.id} className="flex items-center gap-1.5">
          <svg viewBox="0 0 12 12" className="size-3" aria-hidden>
            <Marker shape={s.shape ?? "circle"} cx={6} cy={6} r={5} fill={s.color} ring={false} />
          </svg>
          {s.label}
        </li>
      ))}
    </ul>
  );
}

function Marker({
  shape,
  cx,
  cy,
  r,
  fill,
  ring = true,
}: {
  shape: Shape;
  cx: number;
  cy: number;
  r: number;
  fill: string;
  ring?: boolean;
}) {
  const common = {
    fill,
    stroke: ring ? "var(--card)" : "none",
    strokeWidth: ring ? 2 : 0,
  };
  if (shape === "square") return <rect x={cx - r} y={cy - r} width={2 * r} height={2 * r} rx={1.5} {...common} />;
  if (shape === "triangle")
    return <polygon points={`${cx},${cy - r * 1.15} ${cx + r * 1.1},${cy + r * 0.85} ${cx - r * 1.1},${cy + r * 0.85}`} {...common} />;
  if (shape === "diamond")
    return <polygon points={`${cx},${cy - r * 1.2} ${cx + r * 1.2},${cy} ${cx},${cy + r * 1.2} ${cx - r * 1.2},${cy}`} {...common} />;
  return <circle cx={cx} cy={cy} r={r} {...common} />;
}

// Las etiquetas largas ("Deep Read · comprensión (aciertos)") no caben en
// el eje vertical: se queda la parte tras el "·"; el título del panel ya
// nombra el desafío.
function axisLabel(text: string, max: number) {
  if (text.length <= max) return text;
  const tail = text.split(" · ").at(-1) ?? text;
  return tail.length <= max ? tail : `${tail.slice(0, max - 1)}…`;
}

function Axes({
  xTicks,
  yTicks,
  x,
  y,
  xLabel,
  yLabel,
  xFormat = (v) => fmtNum(v),
  yFormat = (v) => fmtNum(v),
}: {
  xTicks: number[] | null;
  yTicks: number[];
  x: ((v: number) => number) | null;
  y: (v: number) => number;
  xLabel: string;
  yLabel: string;
  xFormat?: (v: number) => string;
  yFormat?: (v: number) => string;
}) {
  return (
    <g className="text-[13px]" fill="var(--muted-foreground)">
      {yTicks.map((t) => (
        <g key={`y${t}`}>
          <line x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} stroke="var(--viz-grid)" strokeWidth={1} />
          <text x={M.left - 6} y={y(t)} textAnchor="end" dominantBaseline="middle" className="tabular-nums">
            {yFormat(t)}
          </text>
        </g>
      ))}
      {xTicks &&
        x &&
        xTicks.map((t) => (
          <g key={`x${t}`}>
            <line x1={x(t)} x2={x(t)} y1={M.top} y2={H - M.bottom} stroke="var(--viz-grid)" strokeWidth={1} />
            <text x={x(t)} y={H - M.bottom + 16} textAnchor="middle" className="tabular-nums">
              {xFormat(t)}
            </text>
          </g>
        ))}
      <text x={(M.left + W - M.right) / 2} y={H - 6} textAnchor="middle" fill="var(--foreground)">
        {axisLabel(xLabel, 40)}
      </text>
      <text
        transform={`translate(13 ${(M.top + H - M.bottom) / 2}) rotate(-90)`}
        textAnchor="middle"
        fill="var(--foreground)"
      >
        {axisLabel(yLabel, 26)}
      </text>
    </g>
  );
}

// ------------------------------------------------------------ dispersión
export type ScatterPoint = { id: string; x: number; y: number; series: string; tip: string };

export function ScatterChart({
  points,
  series,
  xLabel,
  yLabel,
  title,
  zeroLines = false,
}: {
  points: ScatterPoint[];
  series: SeriesDef[];
  xLabel: string;
  yLabel: string;
  title: string;
  // Líneas de referencia en 0 (puntajes z, índices).
  zeroLines?: boolean;
}) {
  if (points.length === 0) return <EmptyChart />;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const xTicks = niceTicks(Math.min(...xs, zeroLines ? 0 : Infinity), Math.max(...xs, zeroLines ? 0 : -Infinity));
  const yTicks = niceTicks(Math.min(...ys, zeroLines ? 0 : Infinity), Math.max(...ys, zeroLines ? 0 : -Infinity));
  const x = linear([xTicks[0], xTicks.at(-1)!], [M.left, W - M.right]);
  const y = linear([yTicks[0], yTicks.at(-1)!], [H - M.bottom, M.top]);
  const byId = new Map(series.map((s) => [s.id, s]));
  return (
    <figure className="space-y-2">
      <Legend series={series.filter((s) => points.some((p) => p.series === s.id))} />
      <ChartTooltip>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={title}>
          <Axes xTicks={xTicks} yTicks={yTicks} x={x} y={y} xLabel={xLabel} yLabel={yLabel} />
          {zeroLines && (
            <g stroke="var(--muted-foreground)" strokeWidth={1} opacity={0.6}>
              <line x1={x(0)} x2={x(0)} y1={M.top} y2={H - M.bottom} />
              <line x1={M.left} x2={W - M.right} y1={y(0)} y2={y(0)} />
            </g>
          )}
          {points.map((p) => {
            const s = byId.get(p.series);
            return (
              <g key={p.id} data-tip={p.tip} className="cursor-default">
                {/* Zona de toque más grande que la marca. */}
                <circle cx={x(p.x)} cy={y(p.y)} r={12} fill="transparent" />
                <Marker shape={s?.shape ?? "circle"} cx={x(p.x)} cy={y(p.y)} r={5} fill={s?.color ?? "var(--viz-neutral)"} />
              </g>
            );
          })}
        </svg>
      </ChartTooltip>
    </figure>
  );
}

// ------------------------------------------------- columnas categóricas
export type ColumnDatum = { label: string; value: number; tip: string };

export function ColumnChart({
  data,
  color = "var(--viz-1)",
  xLabel,
  yLabel,
  title,
}: {
  data: ColumnDatum[];
  color?: string;
  xLabel: string;
  yLabel: string;
  title: string;
}) {
  if (data.length === 0) return <EmptyChart />;
  const yTicks = niceTicks(0, Math.max(...data.map((d) => d.value), 1), 4);
  const y = linear([0, yTicks.at(-1)!], [H - M.bottom, M.top]);
  const band = (W - M.left - M.right) / data.length;
  const barW = Math.min(24, band - 2);
  // Etiquetas del eje x espaciadas para que no choquen (eje categórico).
  const every = Math.ceil(data.length / 6);
  return (
    <figure>
      <ChartTooltip>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={title}>
          <Axes
            xTicks={null}
            x={null}
            yTicks={yTicks}
            y={y}
            xLabel={xLabel}
            yLabel={yLabel}
            yFormat={(v) => fmtNum(v, 0)}
          />
          {data.map((d, i) => {
            const cx = M.left + band * i + band / 2;
            const top = y(d.value);
            const h = H - M.bottom - top;
            return (
              <g key={d.label} data-tip={d.tip}>
                <rect x={M.left + band * i} y={M.top} width={band} height={H - M.bottom - M.top} fill="transparent" />
                {h > 0 && <BarPath x={cx - barW / 2} y={top} w={barW} h={h} fill={color} />}
                {i % every === 0 && (
                  <text
                    x={cx}
                    y={H - M.bottom + 16}
                    textAnchor="middle"
                    className="text-[12px] tabular-nums"
                    fill="var(--muted-foreground)"
                  >
                    {d.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </ChartTooltip>
    </figure>
  );
}

// Barra con punta redondeada de 4 px y base recta.
function BarPath({ x, y, w, h, fill }: { x: number; y: number; w: number; h: number; fill: string }) {
  const r = Math.min(4, w / 2, h);
  return (
    <path
      d={`M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`}
      fill={fill}
    />
  );
}

// ------------------------------------------------------------ líneas
export type LinePoint = { x: number; y: number; tip: string };

export function LineChart({
  lines,
  xLabel,
  yLabel,
  title,
}: {
  lines: (SeriesDef & { points: LinePoint[] })[];
  xLabel: string;
  yLabel: string;
  title: string;
}) {
  const all = lines.flatMap((l) => l.points);
  if (all.length === 0) return <EmptyChart />;
  const xTicks = [...new Set(all.map((p) => p.x))].sort((a, b) => a - b);
  const yTicks = niceTicks(Math.min(...all.map((p) => p.y)), Math.max(...all.map((p) => p.y)), 4);
  const pad = 24;
  const x = linear([xTicks[0], xTicks.at(-1)!], [M.left + pad, W - M.right - pad]);
  const y = linear([yTicks[0], yTicks.at(-1)!], [H - M.bottom, M.top]);
  return (
    <figure className="space-y-2">
      <Legend series={lines} />
      <ChartTooltip>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={title}>
          <Axes
            xTicks={xTicks}
            yTicks={yTicks}
            x={x}
            y={y}
            xLabel={xLabel}
            yLabel={yLabel}
            xFormat={(v) => fmtNum(v, 0)}
            yFormat={(v) => fmtNum(v, 0)}
          />
          {lines.map((l) => {
            const pts = [...l.points].sort((a, b) => a.x - b.x);
            return (
              <g key={l.id}>
                <polyline
                  points={pts.map((p) => `${x(p.x)},${y(p.y)}`).join(" ")}
                  fill="none"
                  stroke={l.color}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {pts.map((p) => (
                  <g key={p.x} data-tip={p.tip}>
                    <circle cx={x(p.x)} cy={y(p.y)} r={12} fill="transparent" />
                    <Marker shape={l.shape ?? "circle"} cx={x(p.x)} cy={y(p.y)} r={4.5} fill={l.color} />
                  </g>
                ))}
              </g>
            );
          })}
        </svg>
      </ChartTooltip>
    </figure>
  );
}

// ------------------------------------------------------------ dona
export function DonutChart({
  slices,
  title,
  centerLabel,
}: {
  slices: (SeriesDef & { value: number; tip: string })[];
  title: string;
  centerLabel: string;
}) {
  const total = slices.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <EmptyChart />;
  const R = 80;
  const r = 52;
  const C = 100;
  const visible = slices.filter((s) => s.value > 0);
  // Ángulo inicial de cada porción: suma acumulada (sin reasignar variables).
  const starts = visible.map(
    (_, i) => -Math.PI / 2 + (visible.slice(0, i).reduce((sum, s) => sum + s.value, 0) / total) * Math.PI * 2,
  );
  const arcs = visible.map((s, i) => {
    const span = (s.value / total) * Math.PI * 2;
    const a0 = starts[i];
    const a1 = a0 + span;
    const large = span > Math.PI ? 1 : 0;
    const pt = (rad: number, a: number) => `${C + rad * Math.cos(a)},${C + rad * Math.sin(a)}`;
    const d =
      span >= Math.PI * 2 - 1e-6
        ? `M${C - R},${C} a${R},${R} 0 1,0 ${2 * R},0 a${R},${R} 0 1,0 ${-2 * R},0 M${C - r},${C} a${r},${r} 0 1,1 ${2 * r},0 a${r},${r} 0 1,1 ${-2 * r},0`
        : `M${pt(R, a0)} A${R},${R} 0 ${large} 1 ${pt(R, a1)} L${pt(r, a1)} A${r},${r} 0 ${large} 0 ${pt(r, a0)} Z`;
    return { ...s, d };
  });
  return (
    <figure className="flex flex-col items-center gap-3 sm:flex-row sm:items-center">
      <ChartTooltip className="w-44 shrink-0">
        <svg viewBox="0 0 200 200" className="w-full" role="img" aria-label={title}>
          {arcs.map((a) => (
            <path
              key={a.id}
              d={a.d}
              fill={a.color}
              fillRule="evenodd"
              stroke="var(--card)"
              strokeWidth={2}
              data-tip={a.tip}
            />
          ))}
          <text x={C} y={C - 4} textAnchor="middle" className="font-heading text-[26px] font-semibold" fill="var(--foreground)">
            {total}
          </text>
          <text x={C} y={C + 16} textAnchor="middle" className="text-[11px]" fill="var(--muted-foreground)">
            {centerLabel}
          </text>
        </svg>
      </ChartTooltip>
      <ul className="space-y-1.5 text-sm">
        {slices.map((s) => (
          <li key={s.id} className="flex items-center gap-2">
            <svg viewBox="0 0 12 12" className="size-3 shrink-0" aria-hidden>
              <Marker shape={s.shape ?? "circle"} cx={6} cy={6} r={5} fill={s.color} ring={false} />
            </svg>
            <span>{s.label}</span>
            <span className="ml-auto pl-3 font-medium tabular-nums">{s.value}</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}

// ------------------------------------------------- barras horizontales
// En HTML (no SVG): el texto de cada fila conserva su tamaño en celular.
export type HBarDatum = { label: string; value: number | null; tip: string; color?: string };

export function HBarChart({
  data,
  title,
  domain,
  format = (v: number) => fmtNum(v),
  diverging = false,
}: {
  data: HBarDatum[];
  title: string;
  domain?: [number, number];
  format?: (v: number) => string;
  // Barras desde 0 hacia ambos lados (puntajes z).
  diverging?: boolean;
}) {
  const values = data.map((d) => d.value).filter((v): v is number => v !== null);
  if (values.length === 0) return <EmptyChart />;
  const maxAbs = Math.max(...values.map(Math.abs), 1e-9);
  const [lo, hi] = domain ?? (diverging ? [-maxAbs, maxAbs] : [0, Math.max(...values)]);
  const pct = (v: number) => ((v - lo) / (hi - lo || 1)) * 100;
  const zero = pct(diverging ? 0 : lo);
  return (
    <ChartTooltip>
      <ul role="img" aria-label={title} className="space-y-1.5">
        {data.map((d) => (
          <li key={d.label} data-tip={d.tip} className="grid grid-cols-[minmax(0,9rem)_1fr_3.5rem] items-center gap-2 text-xs">
            <span className="truncate text-muted-foreground" title={d.label}>
              {d.label}
            </span>
            <span className="relative h-4">
              {diverging && <span className="absolute inset-y-0 w-px bg-muted-foreground/50" style={{ left: `${zero}%` }} />}
              {d.value !== null && (
                <span
                  className={cn(
                    "absolute inset-y-0.5",
                    diverging && d.value < 0 ? "rounded-l-[4px]" : "rounded-r-[4px]",
                  )}
                  style={{
                    left: `${Math.min(zero, pct(d.value))}%`,
                    width: `${Math.max(Math.abs(pct(d.value) - zero), 0.5)}%`,
                    backgroundColor: d.color ?? "var(--viz-1)",
                  }}
                />
              )}
            </span>
            <span className="text-right font-medium tabular-nums">{d.value === null ? "—" : format(d.value)}</span>
          </li>
        ))}
      </ul>
    </ChartTooltip>
  );
}

// ------------------------------------------------------- celdas de calor
// Divergente violeta (positivo) ↔ ámbar (negativo) con gris en 0. El texto
// va dentro de la celda: blanco o tinta según la intensidad.
export function divergingCell(value: number | null, maxAbs: number) {
  if (value === null) return { backgroundColor: "transparent" };
  const t = Math.min(1, Math.abs(value) / (maxAbs || 1));
  const hue = value >= 0 ? "var(--viz-1)" : "var(--viz-3)";
  return {
    backgroundColor: `color-mix(in oklab, ${hue} ${Math.round(t * 85)}%, var(--muted))`,
    color: t > 0.75 ? "#ffffff" : undefined,
  };
}

export function DivergingKey({ low, high }: { low: string; high: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground" aria-hidden>
      <span>{low}</span>
      <span
        className="h-2.5 w-28 rounded-full"
        style={{
          background:
            "linear-gradient(90deg, color-mix(in oklab, var(--viz-3) 85%, var(--muted)), var(--muted), color-mix(in oklab, var(--viz-1) 85%, var(--muted)))",
        }}
      />
      <span>{high}</span>
    </div>
  );
}

export function EmptyChart() {
  return (
    <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
      Todavía no hay datos suficientes para esta gráfica.
    </p>
  );
}

