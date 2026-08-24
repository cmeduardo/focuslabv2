import { ComingSoon } from "@/components/layout/coming-soon";

export default function PomodoroPage() {
  return (
    <ComingSoon
      title="Pomodoro"
      description="Temporizador configurable de bloques de trabajo y descanso (RF-06). Se implementa en el Sprint 3."
      sprint="Sprint 3"
      backHref="/herramientas"
      backLabel="Herramientas"
    />
  );
}
