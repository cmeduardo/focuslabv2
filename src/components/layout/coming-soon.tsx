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
        className="text-sm text-muted-foreground underline underline-offset-4"
      >
        ← {backLabel}
      </Link>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{title}</CardTitle>
            <Badge variant="outline">{sprint}</Badge>
          </div>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
