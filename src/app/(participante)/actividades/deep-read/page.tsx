import { ComingSoon } from "@/components/layout/coming-soon";

export default function DeepReadPage() {
  return (
    <ComingSoon
      title="Deep Read"
      description="Comprensión lectora bajo tiempo limitado. Se implementa en el Sprint 2."
      sprint="Sprint 2"
      backHref="/actividades"
      backLabel="Actividades"
    />
  );
}
