import { readFileSync } from "node:fs";
import { expect, test, type Browser, type Page } from "@playwright/test";

/**
 * The internal system end to end (SISTEMA-INTERNO.md, phase 8), as a desk and
 * as a client, on DEMO E2E accounts created by e2e/data.mjs:
 * time clock → client file → measurement → routine → payment → class with one
 * spot → client: routine + PDF, progress, receipt upload, capacity limit,
 * booking and cancelling → receipt approval → payroll run and CSV → clock out.
 *
 * Not covered: the invitation email (needs SMTP); the client account is created
 * already linked, as the invitation would leave it.
 */

type Accounts = {
  password: string;
  pin: string;
  deskEmail: string;
  clientEmail: string;
  staffName: string;
  clientId: string;
};

const acc = (): Accounts => JSON.parse(readFileSync("e2e/.data/accounts.json", "utf8"));

/** Tomorrow in Costa Rica, YYYY-MM-DD. */
function tomorrowCR(): string {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Costa_Rica" }).format(new Date());
  return new Date(Date.parse(today) + 86_400_000).toISOString().slice(0, 10);
}

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: /entrar|ingresar|iniciar/i }).first().click();
}

async function unlock(page: Page, a: Accounts) {
  await page.goto("/bloqueo");
  await page.getByRole("button", { name: new RegExp(`^${a.staffName}`) }).click();
  await page.keyboard.type(a.pin);
  await page.waitForURL(/\/escritorio$/);
}

async function clock(page: Page, a: Accounts, expected: RegExp) {
  await page.goto("/bloqueo");
  await page.getByRole("button", { name: "Marcar entrada o salida" }).click();
  await page.getByRole("button", { name: new RegExp(`^${a.staffName}`) }).click();
  await page.keyboard.type(a.pin);
  await expect(page.getByRole("status")).toContainText(expected);
}

test.describe.serial("sistema interno", () => {
  let a: Accounts;
  let desk: Page;
  let client: Page;
  let classUrl = "";
  const day = tomorrowCR();

  test.beforeAll(async ({ browser }: { browser: Browser }) => {
    a = acc();
    desk = await (await browser.newContext()).newPage();
    client = await (await browser.newContext()).newPage();
    desk.on("dialog", (d) => d.accept());
    client.on("dialog", (d) => d.accept());
  });

  test("escritorio: login, marcar entrada y desbloquear con PIN", async () => {
    await signIn(desk, a.deskEmail, a.password);
    await desk.waitForURL(/bloqueo|escritorio/);
    await clock(desk, a, /Entrada marcada/);
    await unlock(desk, a);
    await expect(desk.getByRole("heading", { level: 1 })).toContainText("Hola");
  });

  test("expediente: registrar una medición", async () => {
    await desk.goto(`/escritorio/clientes/${a.clientId}?tab=mediciones&nueva=1`);
    await desk.getByLabel("Estatura (cm) *").fill("165");
    await desk.getByLabel("Peso (kg) *").fill("62");
    await desk.getByLabel("Músculo (kg)").fill("25");
    await desk.getByLabel("Grasa (kg)").fill("16");
    await desk.getByLabel("Agua (%)").fill("55");
    await desk.getByLabel("Cintura (cm)").fill("72");
    await desk.getByLabel("Cadera (cm)").fill("98");
    await desk.getByRole("button", { name: "Guardar medición" }).click();
    await desk.waitForURL((u) => !u.search.includes("nueva=1"));
    await expect(desk.getByText("Registrar la primera medición")).toHaveCount(0);
  });

  test("expediente: armar y asignar una rutina de 2 días", async () => {
    await desk.goto(`/escritorio/clientes/${a.clientId}/rutina/nueva?desde=`);
    await desk.getByLabel("Nombre de la rutina").fill("DEMO E2E Rutina");
    const addExercise = async (dayIndex: number, query: string) => {
      await desk.getByRole("button", { name: "+ Agregar ejercicio" }).nth(dayIndex).click();
      const dialog = desk.getByRole("dialog");
      await dialog.getByRole("searchbox", { name: "Buscar ejercicio" }).fill(query);
      await dialog.getByRole("button", { name: "Agregar" }).first().click();
      await dialog.getByRole("button", { name: "Listo" }).click();
    };
    await addExercise(0, "Bench press");
    await desk.getByRole("button", { name: "+ Agregar día" }).click();
    await addExercise(1, "Curl Femoral");
    await desk.getByRole("button", { name: "Asignar rutina" }).click();
    await desk.waitForURL(/tab=rutina/);
    await expect(desk.getByText("DEMO E2E Rutina").first()).toBeVisible();
  });

  test("membresía: pago en efectivo", async () => {
    await desk.goto(`/escritorio/clientes/${a.clientId}?tab=pagos`);
    const assign = desk.getByRole("button", { name: "Asignar plan" });
    if (await assign.isVisible()) await assign.click();
    await desk.getByRole("button", { name: "Registrar pago" }).click();
    await expect(desk.getByRole("heading", { name: "Pagos" }).locator("..")).toContainText("40.000");
  });

  test("salones: clase de un solo cupo y lo ocupa otro cliente", async () => {
    await desk.goto("/escritorio/salones");
    await desk.getByRole("link", { name: /^Salón 1/ }).first().click();
    await desk.waitForURL(/\/escritorio\/salones\/[0-9a-f-]+/);
    await desk.goto(`${desk.url().split("?")[0]}?dia=${day}`);
    await desk.getByRole("button", { name: "+ Clase de una sola vez" }).click();
    await desk.getByLabel("Disciplina", { exact: true }).selectOption({ label: "Yoga" });
    await desk.getByLabel("Empieza", { exact: true }).fill("10:00");
    await desk.getByLabel("Termina", { exact: true }).fill("11:00");
    await desk.getByLabel("Cupo (vacío = el de la disciplina)").fill("1");
    await desk.getByRole("button", { name: "Agregar clase" }).click();
    await expect(desk.getByText("Clase agregada.")).toBeVisible();
    await desk.reload();
    await desk.getByRole("link", { name: /Yoga/ }).first().click();
    await desk.waitForURL(/\/escritorio\/salones\/clase\//);
    classUrl = desk.url();
    await desk.getByLabel("Reservar para un cliente").fill("DEMO E2E Otro");
    await desk.getByRole("button", { name: "Reservar" }).first().click();
    await expect(desk.getByText("1 / 1 reservas")).toBeVisible();
  });

  test("cliente: rutina, PDF y progreso", async () => {
    await signIn(client, a.clientEmail, a.password);
    await client.waitForURL(/\/portal/);
    await client.goto("/portal/rutina");
    await expect(client.getByRole("heading", { level: 1 })).toHaveText("DEMO E2E Rutina");
    await client.getByRole("link", { name: "Descargar PDF" }).click();
    await client.waitForURL(/\/imprimir\/rutina\//);
    await expect(client.getByRole("button", { name: "Imprimir o guardar PDF" })).toBeVisible();
    await expect(client.getByText("Bench press", { exact: false }).first()).toBeVisible();
    await client.goto("/portal/progreso");
    await expect(client.getByText("Todavía no hay mediciones")).toHaveCount(0);
    await expect(client.locator("main svg").first()).toBeVisible();
  });

  test("cliente: sube un comprobante", async () => {
    await client.goto("/portal/pagos");
    // 1×1 PNG
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64",
    );
    await client.locator('input[type="file"]').setInputFiles({ name: "sinpe.png", mimeType: "image/png", buffer: png });
    await client.getByLabel("Referencia (opcional)").fill("DEMO E2E");
    await client.getByRole("button", { name: "Enviar comprobante" }).click();
    await expect(client.getByRole("heading", { name: "Comprobantes" }).locator("..")).toContainText(/pendiente|revisi/i);
  });

  test("cliente: clase llena, el escritorio libera el cupo, reserva y cancela", async () => {
    await client.goto("/portal/clases");
    await client.getByRole("link", { name: "Salón 1" }).click();
    await client.waitForURL(/\/portal\/clases\/[0-9a-f-]+/);
    const salonUrl = `${client.url().split("?")[0]}?dia=${day}`;
    await client.goto(salonUrl);
    await expect(client.getByText("Llena")).toBeVisible();
    await expect(client.getByRole("button", { name: "Reservar Yoga" })).toHaveCount(0);

    await desk.goto(classUrl);
    await desk.getByRole("button", { name: "Cancelar" }).first().click();
    await expect(desk.getByText("0 / 1 reservas")).toBeVisible();

    await client.goto(salonUrl);
    await client.getByRole("button", { name: "Reservar Yoga" }).click();
    await expect(client.getByText("Reservada")).toBeVisible();
    await client.goto("/portal/clases");
    await expect(client.getByRole("heading", { name: "Mis reservas" }).locator("..")).toContainText("Yoga");
    await client.goto(salonUrl);
    await client.getByRole("button", { name: "Cancelar" }).click();
    await expect(client.getByText("Reservada")).toHaveCount(0);
  });

  test("cliente: no entra al escritorio ni a la planilla", async () => {
    await client.goto("/escritorio/planilla");
    await expect(client).toHaveURL(/\/portal/);
  });

  test("escritorio: aprobar el comprobante", async () => {
    await desk.goto("/escritorio/comprobantes");
    await expect(desk.getByText("DEMO E2E Cliente").first()).toBeVisible();
    await desk.getByRole("button", { name: "Aprobar", exact: true }).first().click();
    await expect(desk.getByText("No hay comprobantes por revisar.")).toBeVisible();
  });

  test("planilla: datos de pago, planilla aprobada y pagada, CSV", async () => {
    await desk.goto("/escritorio/planilla?tab=personas");
    const row = desk.getByRole("listitem").filter({ hasText: a.staffName });
    await row.getByRole("button", { name: "Editar" }).click();
    await row.getByLabel("Puesto").fill("DEMO");
    await row.getByLabel("Salario mensual (₡)").fill("1.000");
    await row.getByRole("button", { name: "Guardar datos de planilla" }).click();
    await expect(desk.getByText("Datos de planilla guardados.")).toBeVisible();

    await desk.goto("/escritorio/planilla");
    await desk.getByRole("button", { name: "Nueva planilla" }).click();
    await desk.waitForURL(/\/escritorio\/planilla\/[0-9a-f-]+$/);
    await expect(desk.locator("main").getByText(a.staffName)).toBeVisible();
    await desk.getByRole("button", { name: "Aprobar" }).click();
    await desk.getByRole("button", { name: "Sí, aprobar" }).click();
    await expect(desk.getByText(/Aprobada/).first()).toBeVisible();
    await desk.getByRole("button", { name: "Marcar pagada" }).click();
    await desk.getByRole("button", { name: "Sí, marcar pagada" }).click();
    await expect(desk.getByText(/Pagada/).first()).toBeVisible();

    const href = await desk.getByRole("link", { name: "Descargar CSV" }).getAttribute("href");
    const res = await desk.request.get(href!);
    expect(res.status()).toBe(200);
    expect(await res.text()).toContain(a.staffName);
  });

  test("escritorio: bloquear y marcar salida", async () => {
    await desk.getByRole("button", { name: "Bloquear" }).first().click();
    await desk.waitForURL(/\/bloqueo/);
    await clock(desk, a, /Salida marcada/);
  });
});
