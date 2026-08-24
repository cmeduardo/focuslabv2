import Link from "next/link";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Inicio</h1>
        <p className="text-muted-foreground">
          Bienvenido a FocusLab. Desde aquí puedes iniciar una sesión, hacer
          las actividades cognitivas y usar tus herramientas de
          productividad.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/actividades">
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader>
              <CardTitle className="text-base">Actividades</CardTitle>
              <CardDescription>
                Seis actividades cognitivas gamificadas.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/herramientas">
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader>
              <CardTitle className="text-base">Herramientas</CardTitle>
              <CardDescription>
                Pomodoro, Kanban, hábitos y calendario.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/informes">
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader>
              <CardTitle className="text-base">Mis informes</CardTitle>
              <CardDescription>
                Historial de sesiones e informes de perfil atencional.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
