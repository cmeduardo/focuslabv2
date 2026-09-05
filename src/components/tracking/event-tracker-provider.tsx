"use client";

import { createContext, useContext } from "react";

import { useEventTracker } from "@/hooks/use-event-tracker";
import type { InteractionEventType } from "@/lib/types/database";

type EventTrackerContextValue = {
  sessionId: string;
  userId: string;
  logEvent: (
    eventType: InteractionEventType,
    payload?: Record<string, unknown>,
  ) => void;
};

const EventTrackerContext = createContext<EventTrackerContextValue | null>(null);

export function EventTrackerProvider({
  sessionId,
  userId,
  children,
}: {
  sessionId: string;
  userId: string;
  children: React.ReactNode;
}) {
  const { logEvent } = useEventTracker({ sessionId, userId });

  return (
    <EventTrackerContext.Provider value={{ sessionId, userId, logEvent }}>
      {children}
    </EventTrackerContext.Provider>
  );
}

// Para usar desde actividades y herramientas (Sprint 2+), p. ej.:
// const { logEvent } = useEventLogger();
// logEvent("activity_start", { activity_type: "reaction_test" });
export function useEventLogger() {
  const context = useContext(EventTrackerContext);
  if (!context) {
    throw new Error("useEventLogger debe usarse dentro de EventTrackerProvider");
  }
  return context;
}
