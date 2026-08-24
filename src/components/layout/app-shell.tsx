import Link from "next/link";

import { LogoutButton } from "@/components/layout/logout-button";
import { Badge } from "@/components/ui/badge";

type NavItem = { href: string; label: string };

export function AppShell({
  nav,
  roleLabel,
  userEmail,
  children,
}: {
  nav: readonly NavItem[];
  roleLabel: string;
  userEmail: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-semibold tracking-tight">
              FocusLab
            </Link>
            <nav className="flex items-center gap-4 text-sm text-muted-foreground">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="transition-colors hover:text-foreground"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary">{roleLabel}</Badge>
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {userEmail}
            </span>
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
