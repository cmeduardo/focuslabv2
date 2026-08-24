import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-muted/30 px-6 py-16">
      <Link href="/" className="mb-8 text-lg font-semibold tracking-tight">
        FocusLab
      </Link>
      {children}
    </div>
  );
}
