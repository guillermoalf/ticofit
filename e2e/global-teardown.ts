import { execFileSync } from "node:child_process";

export default function globalTeardown() {
  if (process.env.E2E_KEEP) return;
  execFileSync("node", ["e2e/data.mjs", "teardown"], { stdio: "inherit" });
}
