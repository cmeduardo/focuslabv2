// Avance de la ronda: barra + "n de N". No revela aciertos ni errores.
export function RoundProgress({
  current,
  total,
  label,
}: {
  current: number;
  total: number;
  label?: string;
}) {
  const pct = total > 0 ? Math.min(100, (current / total) * 100) : 0;
  return (
    <div className="w-full max-w-xs">
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-center text-xs text-muted-foreground">
        {label ?? `${Math.min(current + 1, total)} de ${total}`}
      </p>
    </div>
  );
}
