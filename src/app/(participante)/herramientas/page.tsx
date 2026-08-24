import Link from "next/link";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TOOLS } from "@/lib/constants/nav";

export default function HerramientasPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Herramientas
        </h1>
        <p className="text-muted-foreground">
          Herramientas de productividad. Su uso también genera eventos en el
          motor de captura (RF-06 a RF-09).
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {TOOLS.map((tool) => (
          <Link key={tool.slug} href={`/herramientas/${tool.slug}`}>
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardHeader>
                <CardTitle className="text-base">{tool.name}</CardTitle>
                <CardDescription>{tool.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
