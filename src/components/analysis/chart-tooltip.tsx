"use client";

import { useRef, useState } from "react";

// Capa de tooltip para las gráficas SVG (que son Server Components): toda
// marca con `data-tip` muestra su texto al pasar el mouse o al tocarla. El
// texto incluye siempre el valor y el n.
export function ChartTooltip({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null);

  const show = (e: React.PointerEvent) => {
    const target = (e.target as Element).closest("[data-tip]");
    const box = ref.current?.getBoundingClientRect();
    if (!target || !box) {
      setTip(null);
      return;
    }
    setTip({
      text: target.getAttribute("data-tip") ?? "",
      x: Math.min(Math.max(e.clientX - box.left, 70), box.width - 70),
      y: e.clientY - box.top,
    });
  };

  return (
    <div
      ref={ref}
      className={`relative ${className ?? ""}`}
      onPointerMove={show}
      onPointerDown={show}
      onPointerLeave={(e) => e.pointerType === "mouse" && setTip(null)}
    >
      {children}
      {tip && (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-10 max-w-56 -translate-x-1/2 -translate-y-full rounded-lg border border-border bg-popover px-2.5 py-1.5 text-xs whitespace-pre-line text-popover-foreground shadow-lg"
          style={{ left: tip.x, top: tip.y - 10 }}
        >
          {tip.text}
        </div>
      )}
    </div>
  );
}
