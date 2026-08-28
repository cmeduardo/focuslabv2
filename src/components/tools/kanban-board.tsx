"use client";

import { useEffect, useState } from "react";
import { Circle, CircleDot, CircleCheck, Inbox, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useEventLogger } from "@/components/tracking/event-tracker-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { playHit } from "@/lib/audio/beep";
import {
  createKanbanTask,
  deleteKanbanTask,
  listKanbanTasks,
  moveKanbanTask,
} from "@/lib/services/kanban";
import { createClient } from "@/lib/supabase/client";
import type { Database, KanbanTaskStatus } from "@/lib/types/database";
import { cn } from "@/lib/utils";

type KanbanTask = Database["public"]["Tables"]["kanban_tasks"]["Row"];

function msSince(iso: string) {
  return Date.now() - new Date(iso).getTime();
}

const COLUMNS: {
  status: KanbanTaskStatus;
  label: string;
  icon: typeof Circle;
  emptyHint: string;
}[] = [
  {
    status: "pendiente",
    label: "Pendiente",
    icon: Circle,
    emptyHint: "Sin tareas todavía",
  },
  {
    status: "en_progreso",
    label: "En progreso",
    icon: CircleDot,
    emptyHint: "Nada en curso",
  },
  {
    status: "completado",
    label: "Completado",
    icon: CircleCheck,
    emptyHint: "Todavía nada completado",
  },
];

export function KanbanBoard() {
  const { userId, logEvent } = useEventLogger();
  const [tasks, setTasks] = useState<KanbanTask[] | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [dragOverStatus, setDragOverStatus] = useState<KanbanTaskStatus | null>(
    null,
  );
  const [justCreatedId, setJustCreatedId] = useState<string | null>(null);

  useEffect(() => {
    if (!justCreatedId) return;
    const timer = setTimeout(() => setJustCreatedId(null), 400);
    return () => clearTimeout(timer);
  }, [justCreatedId]);

  useEffect(() => {
    const supabase = createClient();
    listKanbanTasks(supabase, userId)
      .then(setTasks)
      .catch(() => {
        toast.error("No se pudieron cargar las tareas.");
        setTasks([]);
      });
  }, [userId]);

  async function handleCreate() {
    const title = newTitle.trim();
    if (!title) return;
    const supabase = createClient();
    try {
      const task = await createKanbanTask(supabase, {
        userId,
        title,
        description: newDescription.trim() || null,
      });
      setTasks((prev) => [...(prev ?? []), task]);
      setNewTitle("");
      setNewDescription("");
      setDialogOpen(false);
      setJustCreatedId(task.id);
      toast.success("Tarea creada");
      logEvent("tool_progress", {
        tool: "kanban",
        type: "task_created",
        taskId: task.id,
      });
    } catch {
      toast.error("No se pudo crear la tarea.");
    }
  }

  async function handleMove(id: string, status: KanbanTaskStatus) {
    if (status === "completado") playHit();
    const previous = (tasks ?? []).find((t) => t.id === id);
    setTasks((prev) =>
      (prev ?? []).map((t) =>
        t.id === id ? { ...t, status, position: Date.now() } : t,
      ),
    );
    if (previous && previous.status !== status) {
      logEvent("tool_progress", {
        tool: "kanban",
        type: "status_change",
        taskId: id,
        from: previous.status,
        to: status,
        msSinceCreated: msSince(previous.created_at),
      });
    }
    const supabase = createClient();
    try {
      await moveKanbanTask(supabase, id, status);
    } catch {
      toast.error("No se pudo mover la tarea.");
    }
  }

  async function handleDelete(id: string) {
    const deleted = (tasks ?? []).find((t) => t.id === id);
    if (deleted) {
      logEvent("tool_progress", {
        tool: "kanban",
        type: "task_deleted",
        taskId: id,
        status: deleted.status,
        msSinceCreated: msSince(deleted.created_at),
      });
    }
    setTasks((prev) => (prev ?? []).filter((t) => t.id !== id));
    const supabase = createClient();
    try {
      await deleteKanbanTask(supabase, id);
    } catch {
      toast.error("No se pudo borrar la tarea.");
    }
  }

  if (tasks === null) {
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        {COLUMNS.map((c) => (
          <Skeleton key={c.status} className="h-64" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <Button className="gap-1.5" onClick={() => setDialogOpen(true)}>
            <Plus className="size-4" />
            Nueva tarea
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nueva tarea</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="task-title">Título</Label>
                <Input
                  id="task-title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="¿Qué hay que hacer?"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="task-description">Descripción (opcional)</Label>
                <textarea
                  id="task-description"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={3}
                  className="w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreate} disabled={!newTitle.trim()}>
                Crear
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {COLUMNS.map((column) => {
          const columnTasks = tasks
            .filter((t) => t.status === column.status)
            .sort((a, b) => a.position - b.position);
          return (
            <div
              key={column.status}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverStatus(column.status);
              }}
              onDragLeave={() => setDragOverStatus(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverStatus(null);
                const id = e.dataTransfer.getData("text/plain");
                if (id) void handleMove(id, column.status);
              }}
              className={cn(
                "min-h-40 space-y-2 rounded-2xl border border-dashed border-border bg-muted/20 p-3",
                dragOverStatus === column.status && "border-primary bg-primary/5",
              )}
            >
              <div className="flex items-center justify-between px-1">
                <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <column.icon
                    className={cn(
                      "size-3.5",
                      column.status === "pendiente" && "text-muted-foreground",
                      column.status === "en_progreso" && "text-primary",
                      column.status === "completado" && "text-primary",
                    )}
                  />
                  {column.label}
                </h2>
                <span className="text-xs text-muted-foreground">
                  {columnTasks.length}
                </span>
              </div>
              {columnTasks.length === 0 && (
                <div className="flex flex-col items-center gap-1.5 py-6 text-center">
                  <Inbox className="size-5 text-muted-foreground/50" />
                  <p className="text-xs text-muted-foreground">
                    {column.emptyHint}
                  </p>
                </div>
              )}
              {columnTasks.map((task) => {
                const isDone = task.status === "completado";
                return (
                  <Card
                    key={task.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", task.id);
                    }}
                    className={cn(
                      "cursor-grab gap-2 p-3 transition-all hover:shadow-md active:cursor-grabbing",
                      isDone && "bg-muted/40 opacity-70",
                      justCreatedId === task.id && "animate-pop",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={cn(
                          "text-sm font-medium",
                          isDone && "text-muted-foreground line-through",
                        )}
                      >
                        {task.title}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleDelete(task.id)}
                        className="text-muted-foreground transition-colors hover:text-destructive"
                        aria-label="Borrar tarea"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                    {task.description && (
                      <p
                        className={cn(
                          "line-clamp-2 text-xs text-muted-foreground",
                          isDone && "line-through",
                        )}
                      >
                        {task.description}
                      </p>
                    )}
                    <Select
                      value={task.status}
                      onValueChange={(value) =>
                        handleMove(task.id, value as KanbanTaskStatus)
                      }
                    >
                      <SelectTrigger size="sm" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COLUMNS.map((c) => (
                          <SelectItem key={c.status} value={c.status}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Card>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
