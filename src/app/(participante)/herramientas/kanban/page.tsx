"use client";

import { KanbanSquare } from "lucide-react";

import { KanbanBoard } from "@/components/tools/kanban-board";
import { ToolLayout } from "@/components/tools/tool-layout";
import { useToolSession } from "@/hooks/use-tool-session";

export default function KanbanPage() {
  useToolSession("kanban");
  return (
    <ToolLayout title="Kanban" icon={KanbanSquare} backHref="/herramientas" wide>
      <KanbanBoard />
    </ToolLayout>
  );
}
