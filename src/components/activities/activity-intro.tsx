import { Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ActivityIntro({
  title,
  description,
  instructions,
  onStart,
}: {
  title: string;
  description: string;
  instructions: string[];
  onStart: () => void;
}) {
  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle className="font-heading text-xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="space-y-2 text-sm text-muted-foreground">
          {instructions.map((step, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium text-secondary-foreground">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </CardContent>
      <CardFooter>
        <Button className="w-full gap-1.5" onClick={onStart}>
          <Play className="size-4" />
          Comenzar
        </Button>
      </CardFooter>
    </Card>
  );
}
