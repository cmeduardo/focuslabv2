import { describe, expect, it } from "vitest";

import {
  countInputs,
  detectBrowser,
  detectDeviceType,
  detectOs,
} from "@/lib/activities/device-context";
import { seededRng, shuffle } from "@/lib/activities/rng";
import { linearSlope, mean, median, percentage, standardDeviation } from "@/lib/activities/stats";

import { trial } from "./helpers";

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const PIXEL =
  "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36";
const IPAD_DESKTOP_MODE =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";
const WINDOWS_CHROME =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36";

describe("stats", () => {
  it("media, DE muestral, mediana y pendiente", () => {
    expect(mean([1, 2, 3])).toBe(2);
    expect(standardDeviation([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.138, 3);
    expect(median([5, 1, 3, 2])).toBe(2.5);
    expect(linearSlope([6, 12, 18], [500, 620, 740])).toBeCloseTo(20, 6);
  });

  it("devuelven null sin datos suficientes", () => {
    expect(mean([])).toBeNull();
    expect(standardDeviation([1])).toBeNull();
    expect(median([])).toBeNull();
    expect(linearSlope([1], [1])).toBeNull();
    expect(linearSlope([3, 3], [1, 2])).toBeNull();
    expect(percentage(1, 0)).toBeNull();
  });

  it("shuffle con semilla es determinista y conserva elementos", () => {
    const a = shuffle([1, 2, 3, 4, 5], seededRng(7));
    const b = shuffle([1, 2, 3, 4, 5], seededRng(7));
    expect(a).toEqual(b);
    expect([...a].sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("device-context", () => {
  it("clasifica tipo de dispositivo", () => {
    expect(detectDeviceType(IPHONE, undefined, 5, 390)).toBe("mobile");
    expect(detectDeviceType(PIXEL, { mobile: true }, 5, 412)).toBe("mobile");
    expect(detectDeviceType(IPAD_DESKTOP_MODE, undefined, 5, 820)).toBe("tablet");
    expect(detectDeviceType(WINDOWS_CHROME, { mobile: false }, 0, 1080)).toBe("desktop");
  });

  it("prefiere userAgentData y cae al userAgent", () => {
    expect(
      detectBrowser(WINDOWS_CHROME, {
        brands: [
          { brand: "Not)A;Brand", version: "99" },
          { brand: "Chromium", version: "129" },
          { brand: "Google Chrome", version: "129" },
        ],
      }),
    ).toBe("Google Chrome 129");
    expect(detectBrowser(IPHONE, undefined)).toBe("Safari 17");
    expect(detectOs(IPHONE, undefined)).toBe("iOS");
    expect(detectOs(PIXEL, { platform: "Android" })).toBe("Android");
  });

  it("cuenta entradas y elige la predominante", () => {
    const { counts, primary } = countInputs([
      trial({ trialIndex: 0, inputType: "touch" }),
      trial({ trialIndex: 1, inputType: "touch" }),
      trial({ trialIndex: 2, inputType: "keyboard" }),
      trial({ trialIndex: 3 }),
    ]);
    expect(counts).toEqual({ touch: 2, keyboard: 1 });
    expect(primary).toBe("touch");
  });
});
