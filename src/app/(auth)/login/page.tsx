import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Iniciar sesión</CardTitle>
          <Badge variant="outline">Sprint 1</Badge>
        </div>
        <CardDescription>
          Autenticación con correo y contraseña vía Supabase Auth (RF-01).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Correo electrónico</Label>
          <Input id="email" type="email" placeholder="tu@correo.com" disabled />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
          <Input id="password" type="password" disabled />
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        <Button className="w-full" disabled>
          Iniciar sesión
        </Button>
        <p className="text-sm text-muted-foreground">
          ¿No tienes cuenta?{" "}
          <Link href="/registro" className="font-medium text-foreground underline">
            Regístrate
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
