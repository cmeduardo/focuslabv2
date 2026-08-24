import { ComingSoon } from "@/components/layout/coming-soon";

export default function AdminDashboardPage() {
  return (
    <ComingSoon
      title="Panel agregado"
      description="Distribución de resultados por actividad, frecuencia de eventos pasivos y estadísticos descriptivos (RF-13). Las vistas SQL agregadas y anonimizadas ya existen en supabase/migrations para conectarse desde Power BI Desktop; esta pantalla se implementa en el Sprint 4."
      sprint="Sprint 4"
      backHref="/"
      backLabel="FocusLab"
    />
  );
}
