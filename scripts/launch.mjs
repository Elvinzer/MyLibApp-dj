import { spawn, spawnSync } from "node:child_process";
import { freePort } from "./ports.mjs";
import { randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);
const runtime = path.join(root, ".runtime");
mkdirSync(runtime, { recursive: true });
const dev = process.argv.includes("--dev");
const open = () => spawn("open", [url], { stdio: "ignore" });
let url;
try {
  const previous = JSON.parse(
    readFileSync(path.join(runtime, "instance.json"), "utf8"),
  );
  const response = await fetch(previous.url + "/api/health", {
    signal: AbortSignal.timeout(1500),
  });
  if (response.ok && (await response.json()).installation === root) {
    url = previous.url;
    console.log("MyLibApp : " + url);
    if (!process.argv.includes("--no-open")) open();
    process.exit(0);
  }
} catch {}
for (const cmd of ["node", "ffmpeg", "ffprobe"]) {
  if (spawnSync("which", [cmd]).status !== 0) {
    console.error(
      `Dépendance absente : ${cmd}. Consultez README.md pour l’installation.`,
    );
    process.exit(1);
  }
}
const python = path.join(root, ".venv/bin/python");
if (!existsSync(python) || !existsSync(path.join(root, "node_modules/next"))) {
  console.error(
    "Installation initiale nécessaire. Exécutez Installer.command.",
  );
  process.exit(1);
}
if (
  spawnSync(python, ["-c", "import fastapi,uvicorn,librosa,yt_dlp"]).status !==
  0
) {
  console.error("Environnement Python incomplet. Relancez Installer.command.");
  process.exit(1);
}
const apiPort = await freePort(8765),
  port = await freePort(Number(process.env.PORT) || 3000);
url = `http://127.0.0.1:${port}`;
const token = randomBytes(32).toString("hex");
const env = {
  ...process.env,
  MYLIB_TOKEN: token,
  MYLIB_BACKEND: `http://127.0.0.1:${apiPort}`,
  MYLIB_ORIGIN: url,
};
const children = [];
const stop = () => {
  for (const child of children) child.kill("SIGTERM");
};
process.on("SIGINT", () => {
  stop();
  process.exit(0);
});
process.on("SIGTERM", () => {
  stop();
  process.exit(0);
});
process.on("exit", stop);
children.push(
  spawn(
    python,
    [
      "-m",
      "uvicorn",
      "backend.main:app",
      "--host",
      "127.0.0.1",
      "--port",
      String(apiPort),
    ],
    { env, stdio: "inherit" },
  ),
);
for (let i = 0; i < 120; i++) {
  try {
    const r = await fetch(env.MYLIB_BACKEND + "/health", {
      headers: { "x-mylib-token": token },
    });
    if (r.ok) break;
  } catch {}
  await new Promise((r) => setTimeout(r, 250));
  if (i === 119) throw new Error("Le service audio ne démarre pas.");
}
const useDev = dev || !existsSync(path.join(root, ".next-build/BUILD_ID"));
children.push(
  spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      useDev ? "dev" : "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    { env, stdio: "inherit" },
  ),
);
for (const child of children)
  child.on("exit", (code) => {
    if (code !== null) {
      stop();
      process.exit(code || 0);
    }
  });
for (let i = 0; i < 120; i++) {
  try {
    const r = await fetch(url + "/api/health");
    if (r.ok) break;
  } catch {}
  await new Promise((r) => setTimeout(r, 500));
  if (i === 119) throw new Error("L’interface ne démarre pas.");
}
writeFileSync(
  path.join(runtime, "instance.json"),
  JSON.stringify({ url, pid: process.pid, root }),
);
console.log(`\nMyLibApp est prête : ${url}\n`);
if (!process.argv.includes("--no-open")) open();
