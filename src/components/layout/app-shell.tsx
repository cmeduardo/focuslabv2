"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { FocusAperture } from "@/components/brand/focus-aperture";
import { CompleteSessionButton } from "@/components/layout/complete-session-button";
import { LogoutButton } from "@/components/layout/logout-button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string };

export function AppShell({
  nav,
  roleLabel,
  userEmail,
  sessionId,
  children,
}: {
  nav: readonly NavItem[];
  roleLabel: string;
  userEmail: string;
  sessionId?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3.5">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 text-primary">
              <FocusAperture className="size-6" />
              <span className="font-heading text-lg font-semibold tracking-tight text-foreground">
                FocusLab
              </span>
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              {nav.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative rounded-full px-3.5 py-1.5 font-medium text-muted-foreground transition-colors hover:text-foreground",
                      active && "text-foreground"
                    )}
                  >
                    {active && (
                      <span className="absolute inset-0 rounded-full bg-secondary" />
                    )}
                    <span className="relative">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-accent text-accent-foreground">
              {roleLabel}
            </Badge>
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {userEmail}
            </span>
            {sessionId && <CompleteSessionButton sessionId={sessionId} />}
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        {children}
      </main>
    </div>
  );
}
