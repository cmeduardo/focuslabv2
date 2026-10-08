import { expect, test } from "@playwright/test";

// React vacía los formularios después de cada acción del servidor: tras un
// error, el correo (y el nombre en el registro) no deben perderse.
test.use({ storageState: { cookies: [], origins: [] } });

test("login: tras credenciales inválidas se conserva el correo", async ({ page }) => {
  await page.goto("/login");
  await page.fill("#email", "nadie@focuslab.test");
  await page.fill("#password", "incorrecta-123");
  await page.click("button[type=submit]");

  await expect(page.getByText("Correo o contraseña incorrectos.")).toBeVisible();
  await expect(page.locator("#email")).toHaveValue("nadie@focuslab.test");
  await expect(page.locator("#password")).toHaveValue("");
  await expect(page.locator("#password")).toBeFocused();
});

test("registro: si las contraseñas no coinciden se conservan nombre y correo", async ({ page }) => {
  await page.goto("/registro");
  await page.fill("#full_name", "Ana Prueba");
  await page.fill("#email", "ana@focuslab.test");
  await page.fill("#password", "clave-123456");
  await page.fill("#password_confirmation", "otra-123456");
  await page.click("button[type=submit]");

  await expect(page.getByText("Las contraseñas no coinciden.")).toBeVisible();
  await expect(page.locator("#full_name")).toHaveValue("Ana Prueba");
  await expect(page.locator("#email")).toHaveValue("ana@focuslab.test");
});
