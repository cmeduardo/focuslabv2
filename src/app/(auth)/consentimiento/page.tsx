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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export default function ConsentimientoPage() {
  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Consentimiento informado</CardTitle>
          <Badge variant="outline">Sprint 1</Badge>
        </div>
        <CardDescription>
          Debes aceptar este consentimiento antes de iniciar tu primera
          sesión en FocusLab (RS-05). Tu aceptación queda registrada con
          fecha y hora en la tabla <code>consents</code>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="max-h-48 overflow-y-auto rounded-md border p-4 text-sm text-muted-foreground">
          FocusLab recopila resultados de actividades cognitivas gamificadas
          y eventos de interacción (clics, cambios de pestaña, periodos de
          inactividad) durante tus sesiones de uso, con fines de
          investigación para un taller piloto de tesis. Los datos se
          almacenan de forma segura y solo el equipo investigador accede a
          información individual; las autoridades académicas solo ven
          resultados agregados y anonimizados. FocusLab no realiza ningún
          diagnóstico clínico. Puedes dejar de participar en cualquier
          momento.
        </div>
        <div className="flex items-start gap-2">
          <Checkbox id="accept" disabled />
          <Label htmlFor="accept" className="font-normal">
            He leído y acepto participar en el taller piloto de FocusLab.
          </Label>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full" disabled>
          Aceptar y continuar
        </Button>
      </CardFooter>
    </Card>
  );
}
