import { ComingSoon } from "@/components/layout/coming-soon";

export default function InformesPage() {
  return (
    <ComingSoon
      title="Mis informes"
      description="Historial de sesiones e informes de perfil atencional anteriores (RF-12). Se implementa en el Sprint 4."
      sprint="Sprint 4"
      backHref="/dashboard"
      backLabel="Inicio"
    />
  );
}
