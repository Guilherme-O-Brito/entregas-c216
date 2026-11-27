import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { once } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const directory = mkdtempSync(join(tmpdir(), "c216-e2e-"));
const options = {
  cwd: fileURLToPath(new URL("../../backend/", import.meta.url)),
  env: {
    ...process.env,
    APP_KEY: randomBytes(32).toString("hex"),
    DATABASE_URL: `sqlite:///${join(directory, "e2e.db")}`,
  },
  stdio: "inherit",
};

try {
  const migration = spawnSync(
    "poetry",
    ["run", "alembic", "upgrade", "head"],
    options,
  );
  if (migration.error) throw migration.error;
  if (migration.status !== 0) {
    process.exitCode = migration.status ?? 1;
  } else {
    const server = spawn(
      "poetry",
      [
        "run",
        "uvicorn",
        "app.main:app",
        "--host",
        "127.0.0.1",
        "--port",
        "8001",
      ],
      options,
    );
    process.once("SIGTERM", () => server.kill("SIGTERM"));
    const [code] = await once(server, "exit");
    process.exitCode = code ?? 0;
  }
} finally {
  rmSync(directory, { recursive: true, force: true });
}
