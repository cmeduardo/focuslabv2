"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

import { CAPTCHA_FIELD } from "@/components/auth/turnstile-field";

// Captcha de Cloudflare para login, registro y recuperación. Supabase Auth valida el token
// (Authentication → Attack Protection), así que aquí solo se obtiene y se manda en el formulario.
// La site key es pública; NEXT_PUBLIC_TURNSTILE_SITE_KEY permite usar otra en desarrollo.
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "0x4AAAAAAFcPia8KaatVAvN4";

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      language?: string;
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    },
  ) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

// `resetKey` cambia cada vez que la acción responde: el token es de un solo uso.
export function Turnstile({ resetKey }: { resetKey: unknown }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const lastResetKey = useRef(resetKey);
  const [scriptReady, setScriptReady] = useState(
    () => typeof window !== "undefined" && Boolean(window.turnstile),
  );
  const [token, setToken] = useState("");

  useEffect(() => {
    if (!scriptReady || !containerRef.current || !window.turnstile) return;
    const widgetId = window.turnstile.render(containerRef.current, {
      sitekey: SITE_KEY,
      language: "es",
      callback: setToken,
      "expired-callback": () => setToken(""),
      "error-callback": () => setToken(""),
    });
    widgetIdRef.current = widgetId;
    return () => {
      window.turnstile?.remove(widgetId);
      widgetIdRef.current = null;
    };
  }, [scriptReady]);

  useEffect(() => {
    if (lastResetKey.current === resetKey) return;
    lastResetKey.current = resetKey;
    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
      setToken("");
    }
  }, [resetKey]);

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
      />
      <div ref={containerRef} className="flex min-h-[65px] justify-center" />
      <input type="hidden" name={CAPTCHA_FIELD} value={token} />
    </>
  );
}
