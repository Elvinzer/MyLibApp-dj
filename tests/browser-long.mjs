import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, copyFileSync } from "node:fs";
import assert from "node:assert/strict";
const root = process.cwd();
const url = JSON.parse(readFileSync(".runtime/instance.json")).url;
const session = execFileSync(
  "agent-browser",
  ["session", "id", "--scope", "worktree", "--prefix", "next-dev-loop"],
  { encoding: "utf8" },
).trim();
function cmd(...args) {
  const r = JSON.parse(
    execFileSync(
      "agent-browser",
      ["--session", session, "--restore", "--json", ...args],
      { encoding: "utf8", timeout: 35000 },
    ),
  );
  if (!r.success) throw new Error(JSON.stringify(r.error));
  return r.data;
}
const evalUI = (s) => cmd("eval", s).result;
const id = execFileSync(
  ".venv/bin/python",
  [
    "-c",
    `from backend import store\nimport json,time,uuid\nfrom pathlib import Path\nstore.init()\nr=json.loads(Path('.runtime/two-hour-analysis.json').read_text())\ntid=str(uuid.uuid4())\nt=dict(id=tid,url='https://example.invalid/fixture',source='Fixture',title='Validation temporaire — set deux heures',author='Test synthétique',duration=7200,created=time.time(),status='ready',progress=None,error=None,mediaReady=False,analysisReady=True,factor=1,bpm=r['bpm'],span=r['span'],quality='variable',hasCover=False)\nwith store.db() as c: c.execute('INSERT INTO tracks VALUES (?,?,?)',(tid,tid,json.dumps(t)))\n(store.ROOT/'analysis'/(tid+'.json')).write_text(json.dumps(r))\nprint(tid)`,
  ],
  { encoding: "utf8" },
).trim();
try {
  cmd("open", url + "/#track/" + id);
  cmd("reload");
  evalUI(
    `(async()=>{for(let i=0;i<200;i++){if(document.querySelector('.handle.start'))return true;await new Promise(r=>setTimeout(r,25));}throw Error('Analysis missing');})()`,
  );
  const metrics = evalUI(
    `(async()=>{const h=document.querySelector('.handle.start');const values=[];for(let i=0;i<100;i++){const before=performance.now();h.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));await new Promise(resolve=>{const observer=new MutationObserver(()=>{observer.disconnect();requestAnimationFrame(()=>resolve());});observer.observe(h,{attributes:true,attributeFilter:['aria-valuenow']});setTimeout(()=>{observer.disconnect();resolve();},1000);});values.push(performance.now()-before);}values.sort((a,b)=>a-b);return {p95Ms:values[95],maxMs:values.at(-1),heapMiB:performance.memory?.usedJSHeapSize/1048576,start:h.getAttribute('aria-valuenow'),selection:document.querySelector('[data-testid="selection-bpm"]').textContent};})()`,
  );
  assert.ok(metrics.p95Ms < 200, JSON.stringify(metrics));
  assert.equal(metrics.start, "100");
  cmd("fill", '[aria-label="Fin en secondes"]', "3500");
  const first = evalUI(
    `document.querySelector('[data-testid="selection-bpm"]').textContent`,
  );
  assert.ok(first.startsWith("119") || first.startsWith("120"), first);
  cmd("fill", '[aria-label="Fin en secondes"]', "7200");
  cmd("fill", '[aria-label="Début en secondes"]', "3700");
  const second = evalUI(
    `document.querySelector('[data-testid="selection-bpm"]').textContent`,
  );
  assert.ok(second.startsWith("140"), second);
  writeFileSync(
    ".runtime/browser-long.json",
    JSON.stringify({ ...metrics, first, second }, null, 2),
  );
  console.log("PASS 2h browser drag and tempo changes", metrics, first, second);
  const shot = cmd("screenshot");
  copyFileSync(shot.path, ".runtime/two-hour-detail.png");
} finally {
  await fetch(url + "/api/tracks/" + id, { method: "DELETE" });
  cmd("open", url);
}
