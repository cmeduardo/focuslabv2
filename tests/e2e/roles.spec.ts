import { expect, test, type Page } from "@playwright/test";

// La etiqueta de rol se oculta en pantallas angostas (ver AppShell): se
// comprueba que esté en la página, no que se vea. Los enlaces sí se ven en
// todos los tamaños (menú superior o barra inferior).
async function expectRole(page: Page, label: string) {
  await expect(page.getByRole("banner").getByText(label, { exact: true })).toBeAttached();
}

function visibleLink(page: Page, name: string) {
  return page.getByRole("link", { name, exact: true }).locator("visible=true");
}

test.describe("investigador", () => {
  test.use({ storageState: "tests/e2e/.auth/researcher.json" });

  test("ve su rol en la zona de participante y pasa al panel y de vuelta", async ({ page }) => {
    await page.goto("/dashboard");
    await expectRole(page, "Investigador");

    await visibleLink(page, "Panel").click();
    await expect(page).toHaveURL(/\/admin$/);
    await expectRole(page, "Investigador");
    await expect(visibleLink(page, "Participantes")).toBeVisible();

    await visibleLink(page, "Vista participante").click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });
});

test.describe("autoridad", () => {
  test.use({ storageState: "tests/e2e/.auth/authority.json" });

  test("ve su rol y llega al panel, sin el listado de participantes", async ({ page }) => {
    await page.goto("/dashboard");
    await expectRole(page, "Autoridad académica");

    await visibleLink(page, "Panel").click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(visibleLink(page, "Participantes")).toHaveCount(0);
  });
});

test.describe("participante", () => {
  test.use({ storageState: "tests/e2e/.auth/participant.json" });

  test("no ve el enlace al panel", async ({ page }) => {
    await page.goto("/dashboard");
    await expectRole(page, "Participante");
    await expect(visibleLink(page, "Panel")).toHaveCount(0);
  });
});
