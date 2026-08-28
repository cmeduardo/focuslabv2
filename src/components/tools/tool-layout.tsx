import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function ToolLayout({
  title,
  icon: Icon,
  backHref,
  wide = false,
  children,
}: {
  title: string;
  icon: LucideIcon;
  backHref: string;
  // Kanban (3 columnas) y Calendario (7 columnas) necesitan más ancho que
  // el max-w-2xl centrado que usan Pomodoro y Hábitos.
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <Link
        href={backHref}
        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        ← Herramientas
      </Link>
      <div className="flex items-center gap-3">
        <span className="inline-flex size-10 items-center justify-center rounded-xl bg-secondary text-primary">
          <Icon className="size-5" />
        </span>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {title}
        </h1>
      </div>
      <div className={cn("mx-auto w-full", wide ? "max-w-4xl" : "max-w-2xl")}>
        {children}
      </div>
    </div>
  );
}
