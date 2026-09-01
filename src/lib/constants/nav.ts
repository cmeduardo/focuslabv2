import {
  BookOpen,
  CalendarDays,
  Flame,
  Grid3x3,
  KanbanSquare,
  Search,
  Target,
  Timer,
  Type,
  Zap,
  type LucideIcon,
} from "lucide-react";

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
  icon: LucideIcon;
}[] = [
  {
    slug: "reaction_test",
    name: "Reaction Test",
    description: "Mide el tiempo de reacción ante un estímulo visual.",
    icon: Zap,
  },
  {
    slug: "focus_flow",
    name: "Focus Flow",
    description: "Atención sostenida mediante seguimiento visual continuo.",
    icon: Target,
  },
  {
    slug: "memory_matrix",
    name: "Memory Matrix",
    description: "Memoria de trabajo con secuencias en cuadrícula.",
    icon: Grid3x3,
  },
  {
    slug: "word_sprint",
    name: "Word Sprint",
    description: "Velocidad de procesamiento y precisión léxica.",
    icon: Type,
  },
  {
    slug: "pattern_hunt",
    name: "Pattern Hunt",
    description: "Atención selectiva: búsqueda de patrones entre distractores.",
    icon: Search,
  },
  {
    slug: "deep_read",
    name: "Deep Read",
    description: "Comprensión lectora bajo tiempo limitado.",
    icon: BookOpen,
  },
];

export const TOOLS: {
  slug: string;
  name: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    slug: "pomodoro",
    name: "Pomodoro",
    description: "Temporizador configurable de bloques de trabajo y descanso.",
    icon: Timer,
  },
  {
    slug: "kanban",
    name: "Kanban",
    description: "Tablero personal: pendiente / en progreso / completado.",
    icon: KanbanSquare,
  },
  {
    slug: "habitos",
    name: "Hábitos",
    description: "Seguimiento diario de hábitos definidos por ti.",
    icon: Flame,
  },
  {
    slug: "calendario",
    name: "Calendario",
    description: "Calendario semanal de actividades.",
    icon: CalendarDays,
  },
];
