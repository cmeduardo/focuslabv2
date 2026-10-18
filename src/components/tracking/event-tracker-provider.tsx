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

export function useEventLogger() {
  const context = useContext(EventTrackerContext);
  if (!context) {
    throw new Error("useEventLogger debe usarse dentro de EventTrackerProvider");
  }
  return context;
}
