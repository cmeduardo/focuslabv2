import type { ActivityType } from "@/lib/types/database";

export const PARTICIPANT_NAV = [
  { href: "/dashboard", label: "Inicio" },
  { href: "/actividades", label: "Actividades" },
  { href: "/herramientas", label: "Herramientas" },
  { href: "/informes", label: "Mis informes" },
] as const;

export const ADMIN_NAV = [
  { href: "/admin", label: "Panel agregado" },
  { href: "/admin/participantes", label: "Participantes" },
] as const;

export const ACTIVITIES: {
  slug: ActivityType;
  name: string;
  description: string;
}[] = [
  {
    slug: "reaction_test",
    name: "Reaction Test",
    description: "Mide el tiempo de reacción ante un estímulo visual.",
  },
  {
    slug: "focus_flow",
    name: "Focus Flow",
    description: "Atención sostenida mediante seguimiento visual continuo.",
  },
  {
    slug: "memory_matrix",
    name: "Memory Matrix",
    description: "Memoria de trabajo con secuencias en cuadrícula.",
  },
  {
    slug: "word_sprint",
    name: "Word Sprint",
    description: "Velocidad de procesamiento y precisión léxica.",
  },
  {
    slug: "pattern_hunt",
    name: "Pattern Hunt",
    description: "Atención selectiva: búsqueda de patrones entre distractores.",
  },
  {
    slug: "deep_read",
    name: "Deep Read",
    description: "Comprensión lectora bajo tiempo limitado.",
  },
];

export const TOOLS = [
  {
    slug: "pomodoro",
    name: "Pomodoro",
    description: "Temporizador configurable de bloques de trabajo y descanso.",
  },
  {
    slug: "kanban",
    name: "Kanban",
    description: "Tablero personal: pendiente / en progreso / completado.",
  },
  {
    slug: "habitos",
    name: "Hábitos",
    description: "Seguimiento diario de hábitos definidos por ti.",
  },
  {
    slug: "calendario",
    name: "Calendario",
    description: "Calendario semanal de actividades.",
  },
] as const;
