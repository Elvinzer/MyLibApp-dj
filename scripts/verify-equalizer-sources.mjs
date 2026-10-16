import { execFileSync, spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
const session = execFileSync(
  "agent-browser",
  ["session", "id", "--scope", "worktree", "--prefix", "next-dev-loop"],
  { encoding: "utf8" },
).trim();
const args = ["--session", session, "--restore", "--json"];
function b(...cmd) {
  if (["click", "fill", "check", "uncheck"].includes(cmd[0]))
    e(
      `document.querySelector(${JSON.stringify(cmd[1])})?.scrollIntoView({block:'center',inline:'nearest'})`,
    );
  const r = JSON.parse(
    execFileSync("agent-browser", [...args, ...cmd], {
      encoding: "utf8",
      timeout: 60000,
    }),
  );
  assert.ok(r.success, JSON.stringify(r));
  return r.data;
}
function e(js) {
  return JSON.parse(
    execFileSync("agent-browser", [...args, "eval", "--stdin"], {
      input: js,
      encoding: "utf8",
      timeout: 60000,
    }),
  ).data.result;
}
const saved = e("localStorage.getItem('mylib-equalizer-v1')");
const server = spawn(
  process.execPath,
  [
    "-e",
    `
const {createServer}=require('node:http');const rate=24000,n=rate*5,buffer=Buffer.alloc(44+n*2);
buffer.write('RIFF',0);buffer.writeUInt32LE(buffer.length-8,4);buffer.write('WAVEfmt ',8);buffer.writeUInt32LE(16,16);buffer.writeUInt16LE(1,20);buffer.writeUInt16LE(1,22);buffer.writeUInt32LE(rate,24);buffer.writeUInt32LE(rate*2,28);buffer.writeUInt16LE(2,32);buffer.writeUInt16LE(16,34);buffer.write('data',36);buffer.writeUInt32LE(n*2,40);for(let i=0;i<n;i++)buffer.writeInt16LE(Math.round(Math.sin(i*440*2*Math.PI/rate)*10000),44+i*2);
const server=createServer((req,res)=>{res.setHeader('Content-Type','audio/wav');if(req.url==='/cors.wav')res.setHeader('Access-Control-Allow-Origin','*');res.end(buffer);});server.listen(0,'127.0.0.1',()=>console.log(server.address().port));
`,
  ],
  { stdio: ["ignore", "pipe", "inherit"] },
);
const port = await new Promise((resolve) =>
  server.stdout.once("data", (chunk) => resolve(Number(String(chunk).trim()))),
);
const checks = [];
const check = (n, v) => {
  assert.ok(v, n);
  checks.push(n);
};
try {
  e(
    "document.querySelector('audio').pause();localStorage.setItem('mylib-equalizer-v1',JSON.stringify({version:1,enabled:true,gains:[2,3,2,0,-1,-1,0,1,1.5,0.5],presetId:'techno',personal:[]}));",
  );
  const source = e(
    "(async()=>{const library=await(await fetch('/api/library')).json();return library.tracks[0].id})()",
  );
  const item = (id, path) => ({
    key: "fixture:" + id,
    title: id,
    author: "Validation",
    source: "iTunes",
    url: "https://music.apple.com/",
    cover: null,
    preview: "http://127.0.0.1:" + port + path,
    duration: 5,
    style: null,
    bpm: null,
    trackId: null,
    available: false,
    status: "external",
  });
  b(
    "network",
    "route",
    "**/api/tracks/*/discovery",
    "--body",
    JSON.stringify({
      items: [
        item("CORS autorisé", "/cors.wav"),
        item("CORS refusé", "/direct.wav"),
      ],
      total: 2,
      referenceBpm: null,
    }),
  );
  b("open", "http://127.0.0.1:3000/#discover/" + source);
  b("reload");
  b("wait", "--load", "networkidle");
  b("click", "#discovery-tab-external");
  b("wait", 'button[aria-label="Écouter l’extrait de CORS autorisé"]');
  b("click", 'button[aria-label="Écouter l’extrait de CORS autorisé"]');
  b(
    "wait",
    "--fn",
    "!document.querySelector('audio').paused && document.querySelector('audio').currentTime>0.2",
  );
  check(
    "CORS-compatible preview receives equalization",
    e(
      "document.querySelector('audio').crossOrigin==='anonymous' && document.querySelector('.eq-trigger').getAttribute('aria-label')==='Égaliseur : activé'",
    ),
  );
  b("click", 'button[aria-label="Écouter l’extrait de CORS refusé"]');
  b(
    "wait",
    "--fn",
    "document.querySelector('audio').crossOrigin===null && !document.querySelector('audio').paused && document.querySelector('audio').currentTime>0.2",
  );
  check(
    "CORS-denied preview falls back to direct playback",
    e(
      "document.querySelector('.eq-trigger').getAttribute('aria-label').includes('indisponible')",
    ),
  );
  b("click", ".eq-trigger");
  check(
    "fallback is explained",
    e(
      "document.querySelector('.eq-status').textContent.includes('indisponible pour cet extrait')",
    ),
  );
  b("press", "Escape");
  b("click", ".discovery-reference-actions button:first-child");
  b(
    "wait",
    "--fn",
    "document.querySelector('audio').src.includes('/api/tracks/') && !document.querySelector('audio').paused",
  );
  check(
    "returning local restores equalization and settings",
    e(
      "document.querySelector('.eq-trigger').getAttribute('aria-label')==='Égaliseur : activé' && JSON.parse(localStorage.getItem('mylib-equalizer-v1')).presetId==='techno'",
    ),
  );
  b("network", "unroute", "**/api/tracks/*/discovery");
  b("network", "route", "**/equalizer-processor.js", "--abort");
  b("open", "http://127.0.0.1:3000/#library");
  b("reload");
  b("wait", "--load", "networkidle");
  e(
    "window.AudioContext=class{constructor(){throw Error('Audio processing unavailable for validation')}}",
  );
  b("click", ".cover-button");
  b(
    "wait",
    "--fn",
    "!document.querySelector('audio').paused && document.querySelector('audio').currentTime>0.2",
  );
  b("click", ".eq-trigger");
  b(
    "wait",
    "--fn",
    "document.querySelector('.eq-status').textContent.includes('indisponible dans cet environnement')",
  );
  check(
    "processing setup failure preserves direct local playback",
    e(
      "!document.querySelector('audio').paused && document.querySelector('audio').currentTime>0.2",
    ),
  );
  console.log(JSON.stringify({ status: "passed", checks }));
  writeFileSync(
    ".runtime/equalizer/sources.json",
    JSON.stringify({ status: "passed", checks }, null, 2),
  );
} catch (error) {
  writeFileSync(
    ".runtime/equalizer/sources-failure.json",
    JSON.stringify(
      {
        checks,
        error: String(error),
        status: e("document.querySelector('.eq-status').textContent"),
      },
      null,
      2,
    ),
  );
  throw error;
} finally {
  b("network", "unroute");
  server.kill();
  e(
    `document.querySelector('audio').pause();localStorage.setItem('mylib-equalizer-v1',${JSON.stringify(saved)});`,
  );
  b("open", "http://127.0.0.1:3000/#library");
  b("reload");
  b("wait", "--load", "networkidle");
}
