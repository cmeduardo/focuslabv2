import Link from "next/link";

import { FocusAperture } from "@/components/brand/focus-aperture";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid flex-1 lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary px-10 py-12 text-primary-foreground lg:flex">
        <FocusAperture
          animated
          className="pointer-events-none absolute -bottom-32 -left-24 size-[34rem] text-primary-foreground/10"
        />
        <Link href="/" className="relative flex items-center gap-2">
          <FocusAperture className="size-6" />
          <span className="font-heading text-lg font-semibold tracking-tight">
            FocusLab
          </span>
        </Link>
        <div className="relative max-w-sm space-y-3">
          <p className="font-heading text-2xl leading-snug font-semibold text-balance">
            Un laboratorio para entender cómo prestas atención.
          </p>
          <p className="text-sm text-primary-foreground/75">
            Proyecto de tesis, Ingeniería en Sistemas de Información (UMG).
            Una herramienta de autoconocimiento: describe tu estilo de
            atención, sin etiquetas ni respuestas buenas o malas.
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center bg-muted/30 px-6 py-16 lg:bg-background">
        <Link
          href="/"
          className="mb-8 flex items-center gap-2 lg:hidden"
        >
          <FocusAperture className="size-5 text-primary" />
          <span className="font-heading text-lg font-semibold tracking-tight">
            FocusLab
          </span>
        </Link>
        {children}
      </div>
    </div>
  );
}
