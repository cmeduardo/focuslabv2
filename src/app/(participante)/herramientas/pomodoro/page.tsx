"use client";

import { Timer } from "lucide-react";

import { PomodoroTimer } from "@/components/tools/pomodoro-timer";
import { ToolLayout } from "@/components/tools/tool-layout";
import { useToolSession } from "@/hooks/use-tool-session";

export default function PomodoroPage() {
  useToolSession("pomodoro");
  return (
    <ToolLayout title="Pomodoro" icon={Timer} backHref="/herramientas">
      <PomodoroTimer />
    </ToolLayout>
  );
}
