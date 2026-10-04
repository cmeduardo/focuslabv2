"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { logoutAction } from "@/components/layout/logout-action";

export function LogoutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-10 sm:h-8"
      disabled={isPending}
      onClick={() => startTransition(() => logoutAction())}
    >
      <span className="sm:hidden">Salir</span>
      <span className="hidden sm:inline">Cerrar sesión</span>
    </Button>
  );
}
