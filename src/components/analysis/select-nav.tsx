"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { cn } from "@/lib/utils";

// Filtro que vive en la URL (?dispositivo=…, ?variable=…, ?p=…): la página
// es un Server Component y vuelve a calcular con el valor nuevo.
export function SelectNav({
  param,
  label,
  value,
  options,
  className,
}: {
  param: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  return (
    <label className={cn("flex flex-col gap-1 text-xs text-muted-foreground", className)}>
      {label}
      <select
        value={value}
        aria-busy={pending}
        onChange={(e) => {
          const next = new URLSearchParams(params);
          next.set(param, e.target.value);
          startTransition(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
        }}
        className={cn(
          "h-11 min-w-44 rounded-xl border border-border bg-card px-3 text-sm text-foreground",
          pending && "opacity-60",
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
