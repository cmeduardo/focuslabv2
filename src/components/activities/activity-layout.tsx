import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export function ActivityLayout({
  title,
  icon: Icon,
  backHref,
  children,
}: {
  title: string;
  icon: LucideIcon;
  backHref: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <Link
        href={backHref}
        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        ← Actividades
      </Link>
      <div className="flex items-center gap-3">
        <span className="inline-flex size-10 items-center justify-center rounded-xl bg-secondary text-primary">
          <Icon className="size-5" />
        </span>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {title}
        </h1>
      </div>
      <div className="mx-auto w-full max-w-2xl">{children}</div>
    </div>
  );
}
