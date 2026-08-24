import { ComingSoon } from "@/components/layout/coming-soon";

export default function KanbanPage() {
  return (
    <ComingSoon
      title="Kanban"
      description="Tablero personal: pendiente / en progreso / completado (RF-07). Se implementa en el Sprint 3."
      sprint="Sprint 3"
      backHref="/herramientas"
      backLabel="Herramientas"
    />
  );
}
