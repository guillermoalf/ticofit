// Test data for the Playwright walkthrough, on the real Supabase project.
// Everything it creates is named "DEMO E2E" / uses @ticofit.test emails, and
// `node e2e/data.mjs teardown` deletes all of it (also run by the global teardown).
//
//   node e2e/data.mjs seed      → creates accounts, writes e2e/.data/accounts.json (gitignored)
//   node e2e/data.mjs teardown  → deletes every DEMO E2E row and auth user
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { randomBytes, randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^"|"$/g, "")]),
);
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DIR = new URL("./.data/", import.meta.url);
const FILE = new URL("./.data/accounts.json", import.meta.url);
const DESK_EMAIL = "e2e-desk@ticofit.test";
const CLIENT_EMAIL = "e2e-cliente@ticofit.test";
const STAFF_NAME = "DEMO E2E Admin";
const SEDE = "bellavista";

function must(res, what) {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data;
}

async function createLogin(email, role, fullName, password) {
  must(await admin.from("preauthorized_emails").insert({ email, intended_role: role, full_name: fullName }), `preauth ${email}`);
  const user = must(await admin.auth.admin.createUser({ email, password, email_confirm: true }), `user ${email}`).user;
  return user.id;
}

async function seed() {
  await teardown(true);
  const password = randomBytes(18).toString("base64url");
  const pin = String(randomInt(0, 10000)).padStart(4, "0");

  const deskId = await createLogin(DESK_EMAIL, "desk", "DEMO E2E Escritorio", password);
  must(await admin.from("desk_sedes").insert({ desk_id: deskId, sede_id: SEDE }), "desk sede");

  const staff = must(
    await admin.from("staff").insert({ full_name: STAFF_NAME, role_id: "admin", can_manage_payroll: true }).select("id").single(),
    "staff",
  );
  must(await admin.from("staff_sedes").insert({ staff_id: staff.id, sede_id: SEDE }), "staff sede");
  // pgcrypto's crypt() verifies bcrypt hashes ($2a$), so the PIN works with staff_unlock().
  must(await admin.from("staff_pins").insert({ staff_id: staff.id, pin_hash: bcrypt.hashSync(pin, 10).replace(/^\$2b\$/, "$2a$") }), "pin");

  const clientUser = await createLogin(CLIENT_EMAIL, "client", "DEMO E2E Cliente", password);
  const client = must(
    await admin
      .from("clients")
      .insert({ sede_id: SEDE, full_name: "DEMO E2E Cliente", email: CLIENT_EMAIL, user_id: clientUser, birth_date: "1990-05-10", gender: "female" })
      .select("id")
      .single(),
    "client",
  );
  // A second file with no login: it takes the only spot so the client hits the capacity limit.
  const other = must(
    await admin.from("clients").insert({ sede_id: SEDE, full_name: "DEMO E2E Otro" }).select("id").single(),
    "other client",
  );
  // Paid up, so the desk may book them (bookings need an active membership).
  const plan = must(await admin.from("plans").select("id").eq("sede_id", SEDE).order("sort_order").limit(1).single(), "plan");
  must(
    await admin.from("client_memberships").insert({ client_id: other.id, plan_id: plan.id, start_date: new Date().toISOString().slice(0, 10), periods_paid: 1 }),
    "other membership",
  );

  mkdirSync(DIR, { recursive: true });
  writeFileSync(
    FILE,
    JSON.stringify(
      { password, pin, deskEmail: DESK_EMAIL, clientEmail: CLIENT_EMAIL, staffName: STAFF_NAME, staffId: staff.id, clientId: client.id, otherId: other.id },
      null,
      2,
    ),
  );
  console.log("seeded");
}

async function teardown(quiet = false) {
  const { data: staff } = await admin.from("staff").select("id").like("full_name", "DEMO E2E%");
  const staffIds = (staff ?? []).map((s) => s.id);
  const { data: clients } = await admin.from("clients").select("id").like("full_name", "DEMO E2E%");
  const clientIds = (clients ?? []).map((c) => c.id);

  if (clientIds.length) {
    // Receipt files live in storage under <client_id>/.
    for (const id of clientIds) {
      const { data: files } = await admin.storage.from("receipts").list(id);
      if (files?.length) await admin.storage.from("receipts").remove(files.map((f) => `${id}/${f.name}`));
    }
  }
  if (staffIds.length) {
    // Classes, templates and payroll made during the run carry the test employee's id.
    const runs = must(await admin.from("payroll_runs").select("id").in("created_by_staff", staffIds), "runs");
    if (runs.length) must(await admin.from("payroll_runs").delete().in("id", runs.map((r) => r.id)), "delete runs");
    must(await admin.from("payroll_lines").delete().in("staff_id", staffIds), "delete lines");
    must(await admin.from("classes").delete().in("created_by_staff", staffIds), "delete classes");
    must(await admin.from("class_templates").delete().in("created_by_staff", staffIds), "delete templates");
    must(await admin.from("client_routines").delete().is("client_id", null).in("created_by_staff", staffIds), "delete templates");
  }
  if (clientIds.length) must(await admin.from("clients").delete().in("id", clientIds), "delete clients");
  if (staffIds.length) must(await admin.from("staff").delete().in("id", staffIds), "delete staff");

  const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 });
  for (const u of users?.users ?? []) {
    if (u.email === DESK_EMAIL || u.email === CLIENT_EMAIL) must(await admin.auth.admin.deleteUser(u.id), `delete ${u.email}`);
  }
  must(await admin.from("preauthorized_emails").delete().in("email", [DESK_EMAIL, CLIENT_EMAIL]), "delete preauth");
  if (existsSync(FILE)) rmSync(FILE);
  if (!quiet) console.log(`teardown: ${staffIds.length} staff, ${clientIds.length} clients`);
}

const cmd = process.argv[2];
if (cmd === "seed") await seed();
else if (cmd === "teardown") await teardown();
else console.log("usage: node e2e/data.mjs seed|teardown");
