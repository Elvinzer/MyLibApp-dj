import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import assert from "node:assert/strict";
const url = JSON.parse(readFileSync(".runtime/instance.json")).url;
const session = execFileSync(
  "agent-browser",
  ["session", "id", "--scope", "worktree", "--prefix", "next-dev-loop"],
  { encoding: "utf8" },
).trim();
mkdirSync(".runtime", { recursive: true });
const evidence = [];
function cmd(...args) {
  const out = execFileSync(
    "agent-browser",
    ["--session", session, "--restore", "--json", ...args],
    { encoding: "utf8", timeout: 35000 },
  );
  const result = JSON.parse(out);
  if (!result.success) throw new Error(result.error);
  return result.data;
}
function evaluate(code) {
  return cmd("eval", code).result;
}
function wait(code, timeout = 20000) {
  return evaluate(
    `(async()=>{const deadline=Date.now()+${timeout};while(Date.now()<deadline){if(${code})return true;await new Promise(r=>setTimeout(r,30));}throw new Error('Timeout: '+${JSON.stringify(code)});})()`,
  );
}
function click(selector) {
  cmd("click", selector);
}
function fill(selector, value) {
  cmd("fill", selector, String(value));
}
function shot(name) {
  const result = cmd("screenshot");
  copyFileSync(result.path, `.runtime/${name}.png`);
}
function record(name, detail) {
  evidence.push({ name, detail });
  console.log("PASS", name, detail || "");
  writeFileSync(
    ".runtime/browser-results.json",
    JSON.stringify(evidence, null, 2),
  );
}
const library = () => fetch(url + "/api/library").then((r) => r.json());
const sources = [
  "https://www.youtube.com/watch?v=lz1iVBswhqI",
  "https://soundcloud.com/imminentremix/bby-w0w-biscitz-afro-house",
];
if (process.argv.includes("--reimport")) {
  const data = await library();
  for (const t of data.tracks.filter((t) => sources.includes(t.url)))
    await fetch(url + "/api/tracks/" + t.id, { method: "DELETE" });
  cmd("open", url);
  wait(
    `document.querySelector('h1') && !document.querySelector('.empty-state .spin')`,
  );
  for (const source of sources) {
    fill("#source-url", source);
    click(".link-field button");
    const deadline = Date.now() + 120000;
    let track;
    while (Date.now() < deadline) {
      track = (await library()).tracks.find((t) => t.url === source);
      if (track?.status === "error") throw new Error(track.error);
      if (track?.status === "ready") break;
      await new Promise((r) => setTimeout(r, 500));
    }
    assert.equal(track?.status, "ready");
    record("Real browser import " + track.source, {
      title: track.title,
      bpm: track.bpm,
      duration: track.duration,
    });
  }
}
cmd("open", url);
wait(`document.querySelectorAll('.track-row').length>=2`);
let data = await library();
const yt = data.tracks.find((t) => t.source === "YouTube"),
  sc = data.tracks.find((t) => t.source === "SoundCloud");
assert.ok(yt && sc);
// Duplicate import through the actual form.
fill("#source-url", sources[0]);
click(".link-field button");
wait(`document.querySelector('[role="status"]')?.textContent.includes('déjà')`);
assert.equal(
  (await library()).tracks.filter((t) => t.url === sources[0]).length,
  1,
);
record("Duplicate source retained once");
click(`.track-title`);
wait(
  `document.querySelector('[data-testid="selection-bpm"]') && document.querySelectorAll('[role="slider"]').length===2`,
);
click(".detail-buttons .primary");
wait(
  `!document.querySelector('audio').paused && document.querySelector('audio').currentTime>0.2`,
);
const current = evaluate(`document.querySelector('audio').currentSrc`);
const position = evaluate(`document.querySelector('audio').currentTime`);
click(".sidebar>.nav-item");
wait(`!!document.querySelector('.track-list')`);
assert.equal(evaluate(`document.querySelector('audio').currentSrc`), current);
assert.equal(evaluate(`document.querySelector('audio').paused`), false);
assert.ok(evaluate(`document.querySelector('audio').currentTime`) >= position);
record("Playback persists during navigation");
click(".track-title");
wait(`!!document.querySelector('[data-testid="selection-bpm"]')`);
fill('[aria-label="Début en secondes"]', 20);
fill('[aria-label="Fin en secondes"]', 40);
wait(
  `document.querySelector('[role="slider"][aria-label="Début de sélection"]').getAttribute('aria-valuenow')==='20'`,
);
const text = evaluate(
  `document.querySelector('[data-testid="selection-bpm"]').textContent`,
);
assert.ok(!text.startsWith("—"));
record("Automatic selection BPM from time fields", text);
cmd("focus", '[aria-label="Début de sélection"]');
cmd("press", "ArrowRight");
wait(
  `document.querySelector('[role="slider"][aria-label="Début de sélection"]').getAttribute('aria-valuenow')==='21'`,
);
record("Selection handles keyboard accessible");
const box = evaluate(
  `(()=>{const r=document.querySelector('[aria-label="Fin de sélection"]').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`,
);
cmd("mouse", "move", String(Math.round(box.x)), String(Math.round(box.y)));
cmd("mouse", "down");
cmd("mouse", "move", String(Math.round(box.x + 40)), String(Math.round(box.y)));
cmd("mouse", "up");
assert.ok(
  evaluate(
    `Number(document.querySelector('[aria-label="Fin de sélection"]').getAttribute('aria-valuenow'))`,
  ) > 40,
);
record("Native pointer drag adjusts region dynamically");
fill('[aria-label="Début en secondes"]', 30);
fill('[aria-label="Fin en secondes"]', 38);
click(".wave-tools button:first-child");
wait(
  `!document.querySelector('audio').paused && document.querySelector('audio').currentTime>=30`,
);
click(".wave-tools button:nth-child(2)");
wait(
  `document.querySelector('.wave-tools button:nth-child(2)').getAttribute('aria-pressed')==='true'`,
);
evaluate(`document.querySelector('audio').currentTime=37.95`);
wait(
  `document.querySelector('audio').currentTime>=30 && document.querySelector('audio').currentTime<32`,
);
record("Selection loop returns to start");
click(".wave-tools button:nth-child(2)");
evaluate(`document.querySelector('audio').currentTime=38.2`);
wait(`document.querySelector('audio').currentTime>38.2`);
record("Disabled loop allows normal playback");
click(".transport .play-button");
click(".sidebar-heading button");
wait(`document.querySelector('dialog').open`);
fill("dialog input", "Validation UI");
click('dialog button[type="submit"]');
wait(
  `!document.querySelector('dialog').open && document.querySelector('h1')?.textContent.includes('Validation UI')`,
);
data = await library();
const pid = data.playlists.find((p) => p.name === "Validation UI").id;
for (const title of [yt.title, sc.title]) {
  click(".sidebar>.nav-item");
  wait(`!!document.querySelector('.track-list')`);
  click(
    `[aria-label=${JSON.stringify("Ajouter " + title + " à une playlist")}]`,
  );
  wait(`document.querySelector('dialog').open`);
  const labels = evaluate(
    `Array.from(document.querySelectorAll('dialog .playlist-choices label')).map(x=>x.textContent)`,
  );
  const index = labels.findIndex((s) => s.includes("Validation UI"));
  assert.ok(index >= 0);
  cmd("check", `dialog .playlist-choices label:nth-child(${index + 1}) input`);
  wait(
    `document.querySelector('dialog .playlist-choices label:nth-child(${index + 1}) input').checked`,
  );
  click(".dialog-done");
  wait(`!document.querySelector('dialog').open`);
}
data = await library();
assert.equal(data.playlists.find((p) => p.id === pid).tracks.length, 2);
record("Create playlist and add both tracks through UI");
click(
  `.sidebar nav .nav-item:nth-child(${data.playlists.findIndex((p) => p.id === pid) + 1})`,
);
wait(`document.querySelectorAll('.track-row').length===2`);
click(".track-row:first-of-type .order-buttons button:last-child");
// first-of-type depends on the list-columns div; use an explicit list of article elements below if needed.
wait(
  `document.querySelectorAll('.track-title')[0].textContent===${JSON.stringify(sc.title)}`,
);
record("Accessible playlist reordering persists");
click(".heading-actions .primary");
wait(`!document.querySelector('audio').paused`);
evaluate(
  `document.querySelector('audio').currentTime=document.querySelector('audio').duration-.05`,
);
wait(
  `document.querySelector('audio').currentSrc.includes(${JSON.stringify(yt.id)}) && !document.querySelector('audio').paused`,
);
record("Playlist advances to next track");
evaluate(
  `document.querySelector('audio').currentTime=document.querySelector('audio').duration-.05`,
);
wait(`document.querySelector('audio').paused`);
record("Playlist stops at end");
click('[aria-label="Renommer la playlist"]');
wait(`document.querySelector('dialog').open`);
fill("dialog input", "Validation renommée");
click('dialog button[type="submit"]');
wait(
  `document.querySelector('h1').textContent.includes('Validation renommée')`,
);
record("Rename playlist");
click('[aria-label="Supprimer la playlist"]');
wait(`document.querySelector('dialog').open`);
click('dialog button[type="submit"]');
wait(`!!document.querySelector('.list-toolbar select')`);
assert.ok((await library()).tracks.find((t) => t.id === yt.id));
record("Deleting playlist preserves tracks");
for (const [w, h] of [
  [1440, 900],
  [1024, 768],
  [768, 900],
]) {
  cmd("set", "viewport", String(w), String(h));
  assert.ok(
    evaluate(`document.documentElement.scrollWidth<=window.innerWidth+1`),
  );
  shot("library-" + w);
  record("Layout " + w + "×" + h);
}
cmd("set", "viewport", "1440", "900");
record("Browser walkthrough complete");
