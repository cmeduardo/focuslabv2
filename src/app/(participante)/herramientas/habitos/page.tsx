"use client";

import { Flame } from "lucide-react";

import { HabitTracker } from "@/components/tools/habit-tracker";
import { ToolLayout } from "@/components/tools/tool-layout";
import { useToolSession } from "@/hooks/use-tool-session";

export default function HabitosPage() {
  useToolSession("habitos");
  return (
    <ToolLayout title="Hábitos" icon={Flame} backHref="/herramientas">
      <HabitTracker />
    </ToolLayout>
  );
}
