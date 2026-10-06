import { defineConfig, devices } from "@playwright/test";

// Pruebas E2E de las actividades en los tres perfiles del taller: laptop,
// Android y iPhone (emulación con touch). Corre contra el proyecto real de
// Supabase (focuslabv2) con un usuario de prueba que global-setup crea y
// global-teardown borra (ON DELETE CASCADE limpia todo lo que generó).
// NEXT_PUBLIC_ACTIVITY_FAST=1 acorta las esperas de los ensayos.
try {
  process.loadEnvFile(".env.local");
} catch {
  // En CI las variables vienen del entorno.
}

const PORT = 3100;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 120_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  globalSetup: "./tests/e2e/global-setup.ts",
  globalTeardown: "./tests/e2e/global-teardown.ts",
  use: {
    baseURL: `http://localhost:${PORT}`,
    storageState: "tests/e2e/.auth/participant.json",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "Desktop Chrome", use: { ...devices["Desktop Chrome"] } },
    { name: "Pixel 7", use: { ...devices["Pixel 7"] } },
    { name: "iPhone 13", use: { ...devices["iPhone 13"] } },
  ],
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    timeout: 180_000,
    reuseExistingServer: false,
    env: { NEXT_PUBLIC_ACTIVITY_FAST: "1" },
  },
});
