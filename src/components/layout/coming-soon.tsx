import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ComingSoon({
  title,
  description,
  sprint,
  backHref,
  backLabel,
}: {
  title: string;
  description: string;
  sprint: string;
  backHref: string;
  backLabel: string;
}) {
  return (
    <div className="space-y-4">
      <Link
        href={backHref}
        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        ← {backLabel}
      </Link>
      <Card className="border-dashed">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="font-heading text-xl">{title}</CardTitle>
            <Badge className="bg-secondary text-secondary-foreground">
              {sprint}
            </Badge>
          </div>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
