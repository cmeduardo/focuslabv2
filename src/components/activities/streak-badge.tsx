import { Flame } from "lucide-react";

import { cn } from "@/lib/utils";

export function StreakBadge({ streak }: { streak: number }) {
  if (streak < 2) return null;
  const hot = streak >= 5;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold transition-colors",
        hot ? "bg-pulse/15 text-pulse" : "bg-secondary text-secondary-foreground",
      )}
    >
      <Flame className={cn("size-3.5", hot && "animate-pop")} />
      {streak}
    </span>
  );
}
