import { execFileSync } from "node:child_process";

export default function globalSetup() {
  execFileSync("node", ["e2e/data.mjs", "seed"], { stdio: "inherit" });
}
