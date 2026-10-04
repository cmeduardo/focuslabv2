import type { DeviceContext, DeviceType, InputType, TrialRecord } from "@/lib/activities/types";

type UserAgentData = {
  mobile?: boolean;
  platform?: string;
  brands?: { brand: string; version: string }[];
};

function getUserAgentData(): UserAgentData | undefined {
  return (navigator as Navigator & { userAgentData?: UserAgentData })
    .userAgentData;
}

export function detectDeviceType(
  ua: string,
  uaData: UserAgentData | undefined,
  maxTouchPoints: number,
  shortSide: number,
): DeviceType {
  // iPadOS se presenta como "Macintosh" pero con pantalla táctil.
  if (/iPad/.test(ua) || (/Macintosh/.test(ua) && maxTouchPoints > 1)) {
    return "tablet";
  }
  if (/Android/.test(ua) && !/Mobile/.test(ua)) return "tablet";
  if (uaData?.mobile || /Mobi|iPhone|iPod|Android/.test(ua)) {
    return shortSide >= 600 ? "tablet" : "mobile";
  }
  return "desktop";
}

export function detectBrowser(ua: string, uaData: UserAgentData | undefined): string {
  const brand = uaData?.brands?.find(
    (b) => !/Not.?A.?Brand|Chromium/i.test(b.brand),
  );
  if (brand) return `${brand.brand} ${brand.version}`;
  const patterns: [RegExp, string][] = [
    [/Edg\/(\d+)/, "Edge"],
    [/OPR\/(\d+)/, "Opera"],
    [/SamsungBrowser\/(\d+)/, "Samsung Internet"],
    [/CriOS\/(\d+)/, "Chrome"],
    [/FxiOS\/(\d+)/, "Firefox"],
    [/Firefox\/(\d+)/, "Firefox"],
    [/Chrome\/(\d+)/, "Chrome"],
    [/Version\/(\d+).*Safari/, "Safari"],
  ];
  for (const [re, name] of patterns) {
    const match = ua.match(re);
    if (match) return `${name} ${match[1]}`;
  }
  return "desconocido";
}

export function detectOs(ua: string, uaData: UserAgentData | undefined): string {
  if (uaData?.platform) return uaData.platform;
  if (/iPhone|iPad|iPod/.test(ua)) return "iOS";
  if (/Android/.test(ua)) return "Android";
  if (/Windows/.test(ua)) return "Windows";
  if (/Mac OS X|Macintosh/.test(ua)) return "macOS";
  if (/CrOS/.test(ua)) return "ChromeOS";
  if (/Linux/.test(ua)) return "Linux";
  return "desconocido";
}

// Frecuencia de refresco estimada: mediana de los intervalos entre
// callbacks de requestAnimationFrame. Útil para interpretar TR (a 60 Hz un
// estímulo puede tardar hasta ~16.7 ms en pintarse).
export function estimateRefreshHz(frames: number): Promise<number | null> {
  return new Promise((resolve) => {
    const stamps: number[] = [];
    const tick = (ts: number) => {
      stamps.push(ts);
      if (stamps.length > frames) {
        const deltas = stamps.slice(1).map((t, i) => t - stamps[i]);
        deltas.sort((a, b) => a - b);
        const mid = deltas[Math.floor(deltas.length / 2)];
        resolve(mid > 0 ? Math.round((1000 / mid) * 10) / 10 : null);
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    // Pestaña en segundo plano: rAF no corre.
    setTimeout(() => resolve(null), 2000);
  });
}

export function currentOrientation(): "portrait" | "landscape" {
  return window.matchMedia("(orientation: portrait)").matches
    ? "portrait"
    : "landscape";
}

export async function captureDeviceContext(
  refreshSampleFrames: number,
): Promise<DeviceContext> {
  const ua = navigator.userAgent;
  const uaData = getUserAgentData();
  return {
    deviceType: detectDeviceType(
      ua,
      uaData,
      navigator.maxTouchPoints ?? 0,
      Math.min(window.screen.width, window.screen.height),
    ),
    viewportW: window.innerWidth,
    viewportH: window.innerHeight,
    devicePixelRatio: Math.round(window.devicePixelRatio * 100) / 100,
    orientation: currentOrientation(),
    browser: detectBrowser(ua, uaData),
    os: detectOs(ua, uaData),
    refreshHzEst: await estimateRefreshHz(refreshSampleFrames),
  };
}

export function countInputs(
  trials: readonly TrialRecord[],
): { counts: Partial<Record<InputType, number>>; primary: InputType | null } {
  const counts: Partial<Record<InputType, number>> = {};
  for (const t of trials) {
    if (t.inputType) counts[t.inputType] = (counts[t.inputType] ?? 0) + 1;
  }
  let primary: InputType | null = null;
  for (const [type, n] of Object.entries(counts) as [InputType, number][]) {
    if (primary === null || n > (counts[primary] ?? 0)) primary = type;
  }
  return { counts, primary };
}
