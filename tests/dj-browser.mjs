import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, copyFileSync } from "node:fs";
import assert from "node:assert/strict";
const url = JSON.parse(readFileSync(".runtime/instance.json")).url;
const session = execFileSync(
  "agent-browser",
  ["session", "id", "--scope", "worktree", "--prefix", "next-dev-loop"],
  { encoding: "utf8" },
).trim();
const evidence = [];
function cmd(...args) {
  const r = JSON.parse(
    execFileSync(
      "agent-browser",
      ["--session", session, "--restore", "--json", ...args],
      { encoding: "utf8", timeout: 35000 },
    ),
  );
  if (!r.success) throw new Error(r.error);
  return r.data;
}
const evaluate = (code) => cmd("eval", code).result;
const wait = (code) =>
  evaluate(
    `(async()=>{const deadline=Date.now()+15000;while(Date.now()<deadline){try{if(${code})return true;}catch(e){if(!(e instanceof TypeError))throw e;}await new Promise(r=>setTimeout(r,30));}throw new Error('Timeout: '+${JSON.stringify(code)});})()`,
  );
const reveal = (selector) =>
  evaluate(
    `document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center'})`,
  );
const click = (selector) => {
  reveal(selector);
  cmd("click", selector);
};
const fill = (selector, value) => {
  reveal(selector);
  cmd("fill", selector, String(value));
};
function record(name, detail) {
  evidence.push({ name, detail });
  writeFileSync(
    ".runtime/dj-browser-results.json",
    JSON.stringify(evidence, null, 2),
  );
  console.log("PASS", name, detail || "");
}
function shot(name) {
  copyFileSync(cmd("screenshot").path, `.runtime/${name}.png`);
}
const api = async (path, method = "GET", body) => {
  const r = await fetch(url + "/api" + path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  assert.ok(r.ok, await r.clone().text());
  return r.json();
};
const data = await api("/library");
assert.ok(
  data.tracks.some((t) => t.id === "dj-fixture-0"),
  "Run only against an isolated dj-fixture library",
);
const source = data.tracks.find(
  (t) => t.title === "Where Is My Mind (KX CHR Remix)",
);
assert.ok(source);
await api(`/tracks/${source.id}/style`, "PATCH", { label: null });
cmd(
  "open",
  "--headed",
  "--enable",
  "react-devtools",
  url + "/#track/" + source.id,
);
cmd("reload");
wait(
  `document.querySelectorAll('.dj-row').length===5&&!document.querySelector('.dj-panel[aria-busy=true]')`,
);
assert.deepEqual(
  evaluate(
    `[...document.querySelectorAll('.dj-segments button[aria-pressed=true]')].map(x=>x.textContent)`,
  ),
  ["Morceau complet", "±5 BPM", "Styles proches"],
);
record("Default reference, tolerance, style and five results");
click(".dj-more");
wait(`document.querySelectorAll('.dj-row').length===9`);
assert.ok(
  evaluate(
    `[...document.querySelectorAll('.dj-reason')].some(x=>x.textContent==='Style voisin')`,
  ),
);
record("Expansion and neighboring-style explanations");
click(".dj-filters fieldset:nth-child(3) button:last-child");
wait(
  `!document.querySelector('.dj-panel[aria-busy=true]')&&document.querySelectorAll('.dj-row').length===5`,
);
assert.ok(
  evaluate(
    `[...document.querySelectorAll('.dj-reason')].every(x=>x.textContent==='Même style')`,
  ),
);
record("Strict filter and reset of visible limit");
click(".dj-more");
wait(
  `document.querySelectorAll('.dj-row').length>=6&&!document.querySelector('.dj-panel[aria-busy=true]')`,
);
click(".dj-filters fieldset:nth-child(3) button:first-child");
wait(`document.querySelectorAll('.dj-row').length===5`);

click(".style-edit");
wait(
  `document.querySelector('.style-dialog').open&&document.querySelectorAll('.style-dialog option').length>300`,
);
cmd("select", ".style-dialog select", "Electronic---House");
click(".style-dialog button.primary");
wait(
  `!document.querySelector('.style-dialog').open&&document.querySelector('.style-line').textContent.includes('Style défini par vous')&&!document.querySelector('.dj-panel[aria-busy=true]')`,
);
assert.equal(evaluate(`document.activeElement.className`), "style-edit");
click(".dj-filters fieldset:nth-child(3) button:last-child");
wait(`!!document.querySelector('.dj-empty')`);
record("Correction, restored focus and strict empty state");
click(".style-edit");
wait(`document.querySelector('.style-dialog').open`);
click(".style-dialog button.secondary");
wait(
  `!document.querySelector('.style-dialog').open&&document.querySelectorAll('.dj-row').length===5`,
);
assert.ok(
  evaluate(
    `document.querySelector('.style-line').textContent.includes('Style estimé')`,
  ),
);
record("Return to automatic estimate");
click(".style-edit");
wait(`document.querySelector('.style-dialog').open`);
cmd("press", "Escape");
assert.equal(evaluate(`document.querySelector('.style-dialog').open`), false);
assert.equal(evaluate(`document.activeElement.className`), "style-edit");
record("Style dialog keyboard dismissal");

click(".dj-filters fieldset:first-child button:last-child");
wait(
  `!document.querySelector('.dj-panel[aria-busy=true]')&&document.querySelector('.dj-panel .panel-heading p').textContent.includes('Votre sélection')`,
);
fill('[aria-label="Fin en secondes"]', 4);
wait(
  `!!document.querySelector('.dj-empty')&&!document.querySelector('.dj-panel[aria-busy=true]')`,
);
assert.ok(
  evaluate(
    `document.querySelector('.dj-empty').textContent.includes('tempo stable')`,
  ),
);
record("Invalid short selection does not fall back to global BPM");
fill('[aria-label="Fin en secondes"]', 40);
fill('[aria-label="Début en secondes"]', 20);
wait(
  `document.querySelectorAll('.dj-row').length>0&&!document.querySelector('.dj-panel[aria-busy=true]')`,
);
const selectionText = evaluate(
  `document.querySelector('.dj-panel .panel-heading p').textContent`,
);
record("Stable passage reference updates", selectionText);
// Rapid successive field edits and filter changes must settle on the latest state.
fill('[aria-label="Fin en secondes"]', 4);
fill('[aria-label="Début en secondes"]', 0);
fill('[aria-label="Fin en secondes"]', 40);
wait(`!document.querySelector('.dj-panel[aria-busy=true]')`);
assert.ok(
  evaluate(
    `document.querySelector('.dj-panel .panel-heading p').textContent.includes('Votre sélection')`,
  ),
);
click(".dj-filters fieldset:first-child button:first-child");
wait(`document.querySelectorAll('.dj-row').length===5`);
click(".global-bpm .factor-controls button:first-child");
wait(
  `!!document.querySelector('.dj-empty')&&!document.querySelector('.dj-panel[aria-busy=true]')`,
);
assert.ok(
  evaluate(
    `document.querySelector('.dj-panel .panel-heading p').textContent.includes('80,1')`,
  ),
);
click(".global-bpm .factor-controls button:nth-child(2)");
wait(
  `document.querySelectorAll('.dj-row').length===5&&!document.querySelector('.dj-panel[aria-busy=true]')`,
);
record("Explicit global ÷2 and reset affect recommendations");

click(".dj-row:first-child .dj-actions button:first-child");
wait(
  `!document.querySelector('audio').paused&&document.querySelector('audio').currentTime>.1`,
);
assert.ok(
  evaluate(
    `document.querySelector('audio').currentSrc.includes('dj-fixture-0')`,
  ),
);
assert.equal(evaluate(`location.hash`), "#track/" + source.id);
record("Recommendation playback keeps source detail open");
evaluate(`document.querySelector('audio').pause()`);
click(".dj-row:first-child .dj-add");
wait(`document.querySelector('dialog[aria-labelledby="dialog-title"]').open`);
const pid = data.playlists[0].id;
cmd("check", 'dialog[aria-labelledby="dialog-title"] .playlist-choices input');
wait(
  `document.querySelector('dialog[aria-labelledby="dialog-title"] .playlist-choices input').checked`,
);
click(".dialog-done");
wait(`!document.querySelector('dialog[aria-labelledby="dialog-title"]').open`);
assert.ok(
  (await api("/library")).playlists
    .find((p) => p.id === pid)
    .tracks.includes("dj-fixture-0"),
);
record("Recommendation add-to-playlist action persists");
await api(`/playlists/${pid}/tracks/dj-fixture-0`, "DELETE");

// Service error: prevent recommendation responses, retain stale list disabled.
cmd("network", "route", "**/recommendations", "--abort");
click(".dj-filters fieldset:nth-child(2) button:first-child");
wait(`!!document.querySelector('.dj-feedback')`);
assert.ok(
  evaluate(
    `[...document.querySelectorAll('.dj-row button')].every(x=>x.disabled)`,
  ),
);
record("Unavailable service disables obsolete actions and exposes retry");
cmd("network", "unroute", "**/recommendations");
click(".dj-feedback button");
wait(
  `!document.querySelector('.dj-feedback')&&!document.querySelector('.dj-panel[aria-busy=true]')`,
);
record("Service retry restores results");

// Genuine browser response race: delay the old tolerance response, then choose new criteria.
evaluate(
  `(()=>{window.__djOriginalFetch=window.fetch;window.fetch=async(...args)=>{const options=args[1];if(String(args[0]).includes('/recommendations')&&JSON.parse(options?.body||'{}').tolerance===10){const r=await window.__djOriginalFetch(...args);await new Promise(resolve=>setTimeout(resolve,700));return r;}return window.__djOriginalFetch(...args);};return true;})()`,
);
click(".dj-filters fieldset:nth-child(2) button:last-child");
click(".dj-filters fieldset:nth-child(2) button:first-child");
wait(
  `!document.querySelector('.dj-panel[aria-busy=true]')&&document.querySelector('.dj-filters fieldset:nth-child(2) button:first-child').getAttribute('aria-pressed')==='true'`,
);
evaluate(
  `(async()=>{await new Promise(r=>setTimeout(r,850));window.fetch=window.__djOriginalFetch;return true;})()`,
);
assert.ok(
  evaluate(
    `[...document.querySelectorAll('.dj-tempo >span')].every(x=>Math.abs(Number(x.textContent.replace(' BPM','').replace(',','.')))<=2)`,
  ),
);
record("Delayed obsolete response cannot overwrite latest criteria");

await api(`/tracks/${source.id}/style`, "PATCH", {
  label: "Electronic---House",
});
cmd("reload");
wait(
  `document.querySelector('.style-line').textContent.includes('Style défini par vous')&&!document.querySelector('.dj-panel[aria-busy=true]')`,
);
assert.ok(
  evaluate(
    `document.querySelector('.style-line strong').textContent.includes('House')`,
  ),
);
record("Manual style survives browser reload");
await api(`/tracks/${source.id}/style`, "PATCH", { label: null });
cmd("reload");
wait(`document.querySelectorAll('.dj-row').length===5`);

for (const [w, h] of [
  [1440, 900],
  [768, 900],
  [390, 844],
]) {
  cmd("set", "viewport", String(w), String(h));
  assert.ok(evaluate(`document.documentElement.scrollWidth<=innerWidth+1`));
  evaluate(`document.querySelector('.dj-panel').scrollIntoView()`);
  assert.ok(
    evaluate(
      `[...document.querySelectorAll('.dj-segments button,.dj-actions button')].every(x=>x.getBoundingClientRect().height>=44)`,
    ),
  );
  const last = ".dj-row:last-child .dj-add";
  evaluate(`document.activeElement.blur()`);
  cmd("focus", last);
  const bounds = evaluate(
    `(()=>{const b=document.activeElement.getBoundingClientRect();return {bottom:b.bottom,top:b.top,player:document.querySelector('.player').getBoundingClientRect().top};})()`,
  );
  assert.ok(
    bounds.top >= 0 && bounds.bottom <= bounds.player + 1,
    JSON.stringify(bounds),
  );
  shot("dj-" + w);
  record("Responsive, touch targets and unobscured focus " + w + "×" + h);
}
cmd("set", "viewport", "1440", "900");
const tree = cmd("react", "tree").tree;
const fiber = tree
  .split("\n")
  .find((x) => /(?:Memo\(Recommendations\)|Recommendations) key=/.test(x))
  ?.trim()
  .split(" ")[1];
assert.ok(fiber);
const inspected = cmd("react", "inspect", fiber);
writeFileSync(
  ".runtime/dj-react-inspect.json",
  JSON.stringify(inspected, null, 2),
);
record("React component tree and hooks inspected", fiber);
click(".dj-row:first-child .dj-track-title");
wait(
  `location.hash.includes('dj-fixture-0')&&document.querySelector('h1').textContent==='Transition test 1'`,
);
assert.deepEqual(
  evaluate(
    `[...document.querySelectorAll('.dj-segments button[aria-pressed=true]')].map(x=>x.textContent)`,
  ),
  ["Morceau complet", "±5 BPM", "Styles proches"],
);
record("Recommendation navigation resets source criteria");
cmd("open", url + "/#track/" + source.id);
wait(`document.querySelectorAll('.dj-row').length===5`);
const errors = cmd("errors");
writeFileSync(
  ".runtime/dj-browser-errors.json",
  JSON.stringify(errors, null, 2),
);
record("Browser walkthrough complete");
