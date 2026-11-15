import { spawnSync } from "node:child_process";

const env = {
  ...process.env,
  API_PORT: "8001",
  FRONTEND_PORT: "5174",
  DB_PORT: "3307",
  VITE_API_URL: "http://localhost:8001",
  CORS_ORIGINS: "http://localhost:5174,http://127.0.0.1:5174",
  E2E_BASE_URL: "http://localhost:5174",
};
const docker = process.platform === "win32" ? "docker.exe" : "docker";
const compose = ["compose", "-p", "lab-e2e"];

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env,
    ...options,
  });
  if (result.error) console.error(result.error.message);
  return result.status ?? 1;
}

let status;
try {
  status = run(docker, [...compose, "up", "-d", "--build", "--wait"]);
  if (status === 0)
    status = run(docker, [
      ...compose,
      "exec",
      "-T",
      "web",
      "alembic",
      "upgrade",
      "head",
    ]);
  if (status === 0)
    status = run(
      process.execPath,
      ["node_modules/@playwright/test/cli.js", "test"],
      { cwd: "frontend" },
    );
} finally {
  const cleanup = run(docker, [...compose, "down", "-v"]);
  if (status === 0) status = cleanup;
}
process.exitCode = status;
