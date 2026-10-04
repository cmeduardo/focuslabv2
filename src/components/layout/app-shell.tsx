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
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 print:hidden border-b border-border/80 bg-background/85 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6 sm:py-3.5">
          <div className="flex min-w-0 items-center gap-8">
            <Link href="/" className="flex items-center gap-2 text-primary">
              <FocusAperture className="size-6" />
              <span className="hidden font-heading text-lg font-semibold tracking-tight text-foreground min-[380px]:inline">
                FocusLab
              </span>
            </Link>
            <nav className="hidden items-center gap-1 text-sm md:flex">
              {nav.map((item) => (
                <NavLink key={item.href} item={item} pathname={pathname} />
              ))}
            </nav>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Badge className="hidden bg-accent text-accent-foreground sm:inline-flex">
              {roleLabel}
            </Badge>
            <span className="hidden text-sm text-muted-foreground lg:inline">
              {userEmail}
            </span>
            {sessionId && <CompleteSessionButton sessionId={sessionId} />}
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-24 sm:px-6 sm:py-10 md:pb-10 print:p-0">
        {children}
      </main>
      {/* Celular: navegación como barra inferior, al alcance del pulgar. */}
      <nav
        style={{ gridTemplateColumns: `repeat(${nav.length}, minmax(0, 1fr))` }}
        className="fixed inset-x-0 bottom-0 z-40 grid border-t print:hidden border-border/80 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden"
      >
        {nav.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-14 items-center justify-center px-1 text-center text-xs font-medium text-muted-foreground",
                active && "text-primary",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function NavLink({
  item,
  pathname,
}: {
  item: NavItem;
  pathname: string;
}) {
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative rounded-full px-3.5 py-1.5 font-medium text-muted-foreground transition-colors hover:text-foreground",
        active && "text-foreground",
      )}
    >
      {active && <span className="absolute inset-0 rounded-full bg-secondary" />}
      <span className="relative">{item.label}</span>
    </Link>
  );
}
