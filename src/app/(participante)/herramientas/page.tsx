import { ActionTile } from "@/components/dashboard/action-tile";
import { TOOLS } from "@/lib/constants/nav";

export default function HerramientasPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Herramientas
        </h1>
        <p className="text-muted-foreground">
          Herramientas de productividad para organizar tu tiempo. Lo que
          hagas aquí también forma parte de tu sesión.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((tool, i) => (
          <ActionTile
            key={tool.slug}
            href={`/herramientas/${tool.slug}`}
            name={tool.name}
            description={tool.description}
            icon={tool.icon}
            accent={i % 2 === 0 ? "pulse" : "signal"}
          />
        ))}
      </div>
    </div>
  );
}
