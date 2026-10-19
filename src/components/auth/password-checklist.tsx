import { Check, Circle } from "lucide-react";

import { PASSWORD_RULES } from "@/lib/auth/password-policy";

// El servidor vuelve a validar con las mismas reglas.
export function PasswordChecklist({ password }: { password: string }) {
  return (
    <ul id="password-rules" className="space-y-1 text-xs" aria-live="polite">
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(password);
        return (
          <li
            key={rule.id}
            className={`flex items-center gap-1.5 ${ok ? "text-primary" : "text-muted-foreground"}`}
          >
            {ok ? <Check className="size-3.5" /> : <Circle className="size-3" />}
            {rule.label}
            <span className="sr-only">{ok ? " (cumplido)" : " (pendiente)"}</span>
          </li>
        );
      })}
    </ul>
  );
}
