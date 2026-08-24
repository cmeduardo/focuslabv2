import { ComingSoon } from "@/components/layout/coming-soon";

export default async function InformeDetallePage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  await params;

  return (
    <ComingSoon
      title="Informe de perfil atencional"
      description="Perfil atencional, fortalezas, áreas de mejora y recomendaciones generadas por el agente de IA (RF-11). Se implementa en el Sprint 4."
      sprint="Sprint 4"
      backHref="/informes"
      backLabel="Mis informes"
    />
  );
}
