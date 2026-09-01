import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

export function ActionTile({
  href,
  name,
  description,
  icon: Icon,
  accent = "signal",
}: {
  href: string;
  name: string;
  description: string;
  icon: LucideIcon;
  accent?: "signal" | "pulse";
}) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 focus-visible:-translate-y-0.5 focus-visible:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <span
        className={cn(
          "inline-flex size-10 items-center justify-center rounded-xl",
          accent === "signal"
            ? "bg-secondary text-primary"
            : "bg-accent text-accent-foreground"
        )}
      >
        <Icon className="size-5" strokeWidth={2} />
      </span>
      <div className="pr-6">
        <h3 className="font-heading font-semibold text-foreground">{name}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <ArrowRight className="absolute top-5 right-5 size-4 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
    </Link>
  );
}
