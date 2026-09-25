"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// El informe 'pendiente' se completa en background (webhook a n8n). Como la
// página es un Server Component, refrescamos solos cada pocos segundos hasta
// que cambie de estado, en vez de pedirle al participante que recargue a mano.
export function PendingAutoRefresh({ intervalMs = 3000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);

  return null;
}
