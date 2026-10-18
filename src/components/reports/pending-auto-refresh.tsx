"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Refresca la página hasta que el informe deje de estar 'pendiente'.
export function PendingAutoRefresh({ intervalMs = 3000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);

  return null;
}
