import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
const session = execFileSync(
  "agent-browser",
  ["session", "id", "--scope", "worktree", "--prefix", "next-dev-loop"],
  { encoding: "utf8" },
).trim();
const url = execFileSync(
  "agent-browser",
  ["--session", session, "--restore", "get", "cdp-url"],
  { encoding: "utf8" },
).trim();
const ws = new WebSocket(url);
await new Promise((resolve, reject) => {
  ws.onopen = resolve;
  ws.onerror = reject;
});
let sequence = 0;
const awaiting = new Map();
const downloads = [];
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++sequence;
    awaiting.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
let completed;
const done = new Promise((resolve) => {
  completed = resolve;
});
ws.onmessage = (e) => {
  const data = JSON.parse(e.data);
  if (data.id) {
    const pending = awaiting.get(data.id);
    awaiting.delete(data.id);
    if (data.error) pending.reject(data.error);
    else pending.resolve(data.result);
  }
  if (data.method === "Browser.downloadWillBegin") {
    downloads.push(data.params);
    console.log("DOWNLOAD", data.params.suggestedFilename);
  }
  if (
    data.method === "Browser.downloadProgress" &&
    data.params.state === "completed"
  )
    completed(data.params);
};
const dir = path.resolve(".runtime/native-downloads");
mkdirSync(dir, { recursive: true });
try {
  await send("Browser.setDownloadBehavior", {
    behavior: "allow",
    downloadPath: dir,
    eventsEnabled: true,
  });
  execFileSync(
    "agent-browser",
    [
      "--session",
      session,
      "--restore",
      "click",
      ".detail-buttons button:last-child",
    ],
    { encoding: "utf8" },
  );
  await Promise.race([
    done,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Download timeout")), 20000),
    ),
  ]);
  writeFileSync(
    ".runtime/download-name.json",
    JSON.stringify(downloads, null, 2),
  );
} finally {
  await send("Browser.setDownloadBehavior", {
    behavior: "default",
    eventsEnabled: false,
  });
  ws.close();
}
process.exit(
  downloads.every((d) => d.suggestedFilename.endsWith(".mp3")) ? 0 : 1,
);
