"use client";

import { CalendarDays } from "lucide-react";

import { ToolLayout } from "@/components/tools/tool-layout";
import { WeeklyCalendar } from "@/components/tools/weekly-calendar";
import { useToolSession } from "@/hooks/use-tool-session";

export default function CalendarioPage() {
  useToolSession("calendario");
  return (
    <ToolLayout title="Calendario" icon={CalendarDays} backHref="/herramientas" wide>
      <WeeklyCalendar />
    </ToolLayout>
  );
}
