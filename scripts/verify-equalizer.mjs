// Run against the real next-dev-loop browser, not a DOM mock.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import assert from "node:assert/strict";
const session = execFileSync(
  "agent-browser",
  ["session", "id", "--scope", "worktree", "--prefix", "next-dev-loop"],
  { encoding: "utf8" },
).trim();
const args = ["--session", session, "--restore", "--json"];
function browser(...command) {
  if (
    ["click", "fill", "check", "uncheck", "focus"].includes(command[0]) &&
    command[1]
  ) {
    evaluate(
      `document.querySelector(${JSON.stringify(command[1])})?.scrollIntoView({block:'center',inline:'nearest'})`,
    );
  }
  const value = JSON.parse(
    execFileSync("agent-browser", [...args, ...command], {
      encoding: "utf8",
      timeout: 60000,
    }),
  );
  if (!value.success) throw Error(JSON.stringify(value.error));
  return value.data;
}
function evaluate(source) {
  return JSON.parse(
    execFileSync("agent-browser", [...args, "eval", "--stdin"], {
      input: source,
      encoding: "utf8",
      timeout: 60000,
    }),
  ).data.result;
}
const report = { checks: [], audio: null };
const check = (name, condition) => {
  assert.ok(condition, name);
  report.checks.push(name);
};
const eqData = readFileSync("lib/equalizer.mjs", "utf8");
const dataUrl =
  "data:text/javascript;base64," + Buffer.from(eqData).toString("base64");
const engineUrl =
  "data:text/javascript;base64," +
  Buffer.from(
    readFileSync("lib/equalizer-audio.mjs", "utf8").replace(
      '"./equalizer.mjs"',
      JSON.stringify(dataUrl),
    ),
  ).toString("base64");
const saved = evaluate("localStorage.getItem('mylib-equalizer-v1')");
try {
  browser("set", "viewport", "1440", "1000");
  evaluate(
    "document.querySelector('audio').pause();localStorage.setItem('mylib-equalizer-v1',JSON.stringify({version:1,enabled:false,gains:Array(10).fill(0),presetId:'flat',personal:[]}));",
  );
  browser("open", "http://127.0.0.1:3000");
  browser("reload");
  browser("wait", "--load", "networkidle");
  evaluate(`window.eqProbe={contexts:[],sources:[],safety:[]};
    const NativeContext=window.AudioContext;window.AudioContext=class extends NativeContext{constructor(...args){super(...args);window.eqProbe.contexts.push(this);} createMediaElementSource(audio){const source=super.createMediaElementSource(audio);window.eqProbe.sources.push(source);return source;}};
    const NativeWorklet=window.AudioWorkletNode;window.AudioWorkletNode=class extends NativeWorklet{constructor(context,name,...args){super(context,name,...args);if(name==='mylib-equalizer-safety'){const analyser=context.createAnalyser();analyser.fftSize=2048;const mute=context.createGain();mute.gain.value=0;this.connect(analyser).connect(mute).connect(context.destination);window.eqProbe.safety.push(analyser);}}};`);
  browser("click", ".eq-trigger");
  check(
    "advanced bands initially collapsed",
    evaluate("document.querySelector('#eq-bands').hidden"),
  );
  browser("select", "#eq-preset", "techno");
  check(
    "selecting a preset does not enable effect",
    !evaluate("JSON.parse(localStorage.getItem('mylib-equalizer-v1')).enabled"),
  );
  browser("check", ".eq-switch input");
  browser("click", ".eq-disclosure");
  browser("focus", "#eq-band-0");
  browser("press", "ArrowUp");
  check(
    "keyboard changes band and marks preset modified",
    evaluate(
      "JSON.parse(localStorage.getItem('mylib-equalizer-v1')).gains[0]===2.5 && document.querySelector('#eq-preset').selectedOptions[0].text.includes('modifié')",
    ),
  );
  browser("click", ".eq-actions .primary");
  browser("fill", "#eq-name", "Rock");
  browser("click", ".eq-editor button[type=submit]");
  check(
    "duplicate stock name rejected without losing settings",
    evaluate(
      "!!document.querySelector('#eq-name-error') && JSON.parse(localStorage.getItem('mylib-equalizer-v1')).gains[0]===2.5",
    ),
  );
  browser("fill", "#eq-name", "Test écoute");
  browser("click", ".eq-editor button[type=submit]");
  check(
    "personal preset saved and selected",
    evaluate(
      "JSON.parse(localStorage.getItem('mylib-equalizer-v1')).personal[0].name==='Test écoute' && !document.querySelector('#eq-preset').selectedOptions[0].text.includes('modifié')",
    ),
  );
  browser("click", ".eq-personal-actions button:nth-last-child(2)");
  browser("fill", "#eq-name", "Mon casque test");
  browser("click", ".eq-editor button[type=submit]");
  check(
    "personal preset renamed",
    evaluate(
      "JSON.parse(localStorage.getItem('mylib-equalizer-v1')).personal[0].name==='Mon casque test'",
    ),
  );
  browser("focus", "#eq-band-1");
  browser("press", "ArrowDown");
  browser("click", ".eq-personal-actions button:first-child");
  check(
    "replacement requires explicit action",
    evaluate(
      "document.querySelector('.eq-editor').textContent.includes('Remplacer les réglages')",
    ),
  );
  browser("click", ".eq-editor .primary");
  check(
    "replacement stores the current curve",
    evaluate(
      "JSON.parse(localStorage.getItem('mylib-equalizer-v1')).personal[0].gains[1]===2.5",
    ),
  );
  browser("click", ".eq-actions .primary");
  browser("fill", "#eq-name", "Un brouillon");
  browser("press", "Escape");
  check(
    "Escape cancels naming before closing panel and restores focus",
    evaluate(
      "!document.querySelector('#eq-name') && document.querySelector('#equalizer-panel').open && document.activeElement.textContent.includes('Enregistrer sous')",
    ),
  );
  browser("uncheck", ".eq-switch input");
  check(
    "bypass retains curve",
    evaluate(
      "JSON.parse(localStorage.getItem('mylib-equalizer-v1')).gains[0]===2.5",
    ),
  );
  browser("check", ".eq-switch input");
  browser("press", "Escape");
  check(
    "closing restores trigger focus",
    evaluate(
      "!document.querySelector('#equalizer-panel').open && document.activeElement.classList.contains('eq-trigger')",
    ),
  );
  browser("open", "http://127.0.0.1:3000");
  browser("reload");
  browser("wait", "--load", "networkidle");
  evaluate(`window.eqProbe={contexts:[],sources:[],safety:[]};
    const NativeContext=window.AudioContext;window.AudioContext=class extends NativeContext{constructor(...args){super(...args);window.eqProbe.contexts.push(this);} createMediaElementSource(audio){const source=super.createMediaElementSource(audio);window.eqProbe.sources.push(source);return source;}};
    const NativeWorklet=window.AudioWorkletNode;window.AudioWorkletNode=class extends NativeWorklet{constructor(context,name,...args){super(context,name,...args);if(name==='mylib-equalizer-safety'){const analyser=context.createAnalyser();analyser.fftSize=2048;const mute=context.createGain();mute.gain.value=0;this.connect(analyser).connect(mute).connect(context.destination);window.eqProbe.safety.push(analyser);}}};`);
  browser("click", ".eq-trigger");
  check(
    "preferences restored across reload",
    evaluate(
      "document.querySelector('.eq-switch input').checked && document.querySelector('#eq-preset').selectedOptions[0].text==='Mon casque test'",
    ),
  );
  browser("click", ".eq-personal-actions button:last-child");
  browser("click", ".eq-editor .secondary");
  check(
    "deleting active preset keeps current sound",
    evaluate(
      "(()=>{const s=JSON.parse(localStorage.getItem('mylib-equalizer-v1'));return s.personal.length===0 && s.gains[0]===2.5 && s.enabled && s.presetId==='';})()",
    ),
  );
  browser("click", ".eq-actions .secondary");
  check(
    "flat reset preserves activation",
    evaluate(
      "(()=>{const s=JSON.parse(localStorage.getItem('mylib-equalizer-v1'));return s.gains.every(g=>g===0)&&s.enabled&&s.presetId==='flat';})()",
    ),
  );
  browser("set", "viewport", "390", "844");
  check(
    "resizing open panel preserves modal state",
    evaluate(
      "document.querySelector('#equalizer-panel').open && document.querySelector('#equalizer-panel').matches(':modal')",
    ),
  );
  browser("click", ".eq-disclosure");
  check(
    "mobile bands fit viewport and retain playback controls",
    evaluate(
      "document.documentElement.scrollWidth<=innerWidth && !!document.querySelector('.eq-listen') && getComputedStyle(document.querySelector('#eq-band-0')).writingMode==='horizontal-tb'",
    ),
  );
  const audit = browser("a11y", "--selector", "#equalizer-panel");
  check("equalizer axe audit has no violations", audit.violations.length === 0);
  report.mobileAudit = audit.counts;
  browser("press", "Escape");
  browser("set", "viewport", "320", "640");
  browser("click", ".eq-trigger");
  check(
    "320px layout fits",
    evaluate(
      "document.querySelector('#equalizer-panel').scrollWidth<=innerWidth && document.documentElement.scrollWidth<=innerWidth",
    ),
  );
  browser("press", "Escape");
  browser("set", "viewport", "1440", "1000");
  browser("click", ".cover-button");
  const live = evaluate(
    `(async()=>{await new Promise(r=>setTimeout(r,350));const a=document.querySelector('audio');return {time:a.currentTime,paused:a.paused,sources:window.eqProbe.sources.length};})()`,
  );
  check(
    "integrated equalizer plays actual media",
    !live.paused && live.time > 0 && live.sources === 1,
  );
  browser("click", ".eq-trigger");
  browser("select", "#eq-preset", "techno");
  const signal = evaluate(
    `(async()=>{await new Promise(r=>setTimeout(r,200));const out=new Float32Array(2048);window.eqProbe.safety[0].getFloatTimeDomainData(out);return {peak:Math.max(...out.map(Math.abs)),time:document.querySelector('audio').currentTime};})()`,
  );
  check(
    "processed output is audible and bounded",
    signal.peak > 0.00001 && signal.peak <= 0.991 && signal.time >= live.time,
  );
  if (evaluate("document.querySelector('#eq-bands').hidden"))
    browser("click", ".eq-disclosure");
  browser("fill", ".eq-number input", "-3.5");
  browser("press", "Enter");
  check(
    "numeric input accepts negative gain",
    evaluate(
      "JSON.parse(localStorage.getItem('mylib-equalizer-v1')).gains[0]===-3.5",
    ),
  );
  browser("press", "Escape");
  browser("click", ".track-row:nth-of-type(2) .cover-button");
  browser(
    "wait",
    "--fn",
    "!document.querySelector('audio').paused && document.querySelector('audio').readyState>=3",
  );
  check(
    "track change does not reconnect source",
    evaluate("window.eqProbe.sources.length===1"),
  );
  browser("click", ".play-button");
  browser("wait", "--fn", "document.querySelector('audio').paused");
  const pausedAt = evaluate('document.querySelector("audio").currentTime');
  browser("click", ".play-button");
  browser("wait", "--fn", "!document.querySelector('audio').paused");
  check(
    "pause resume keeps playback position",
    evaluate(
      `(async()=>{await new Promise(r=>setTimeout(r,150));return document.querySelector('audio').currentTime>=${pausedAt}-0.1 && !document.querySelector('audio').paused;})()`,
    ),
  );
  evaluate("document.querySelector('audio').currentTime=25");
  browser("click", ".eq-trigger");
  browser("uncheck", ".eq-switch input");
  browser("check", ".eq-switch input");
  check(
    "bypass keeps playback position",
    evaluate(
      "document.querySelector('audio').currentTime>=25 && document.querySelector('audio').currentTime<30",
    ),
  );
  browser("press", "Escape");
  evaluate("window.eqProbe.contexts[0].suspend().then(()=>true)");
  browser("click", ".eq-trigger");
  check(
    "integrated context resumes on user gesture",
    evaluate("window.eqProbe.contexts[0].state==='running'"),
  );
  browser("press", "Escape");
  report.live = { ...live, signal };
  // Simulate an unavailable storage backend without changing any library data.
  browser("click", ".eq-trigger");
  evaluate(
    "window.eqOriginalSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='mylib-equalizer-v1')throw new DOMException('Quota','QuotaExceededError');return window.eqOriginalSet.call(this,k,v)}",
  );
  browser("select", "#eq-preset", "pop");
  check(
    "storage failure is visible without blocking adjustments",
    evaluate(
      "document.querySelector('.eq-error').textContent.includes('enregistrement a échoué') && document.querySelector('#eq-preset').value==='pop'",
    ),
  );
  evaluate("Storage.prototype.setItem=window.eqOriginalSet");
  browser("select", "#eq-preset", "house");
  check(
    "storage recovers on next adjustment",
    evaluate("!document.querySelector('.eq-error')"),
  );
  browser("press", "Escape");
  // CSS width after actual 200% browser zoom is checked separately in headed Chrome.
  report.audio = evaluate(`(async()=>{
  const {PRESETS}=await import(${JSON.stringify(dataUrl)});
  const {configureFilters,compensationDb,createEqualizerEngine,releaseEqualizerEngine}=await import(${JSON.stringify(engineUrl)});
  const results=[];
  async function render(gains,make,rate=48000){
   const context=new OfflineAudioContext(2,rate,rate);
   await context.audioWorklet.addModule('/equalizer-processor.js');
   const buffer=context.createBuffer(2,rate,rate);for(let c=0;c<2;c++)for(let i=0;i<rate;i++)buffer.getChannelData(c)[i]=make(i,rate,c);
   const source=context.createBufferSource();source.buffer=buffer;
   const pre=context.createGain();const compensation=compensationDb(context,gains);pre.gain.value=10**(compensation/20);
   const filters=configureFilters(context,gains);source.connect(pre).connect(filters[0]);for(let i=1;i<10;i++)filters[i-1].connect(filters[i]);
   const safety=new AudioWorkletNode(context,'mylib-equalizer-safety');safety.parameters.get('enabled').value=1;filters.at(-1).connect(safety).connect(context.destination);source.start();
   const output=await context.startRendering();let peak=0,sum=0;for(let c=0;c<2;c++)for(const v of output.getChannelData(c)){if(!Number.isFinite(v))throw Error('nonfinite output');peak=Math.max(peak,Math.abs(v));sum+=v*v;}
   return {compensation,peak,rms:Math.sqrt(sum/(rate*2))};
  }
  const multitone=(i,rate)=>[40,63,125,250,500,1000,2000,4000,8000].reduce((s,f)=>s+Math.sin(2*Math.PI*f*i/rate),0)/9;
  for(const p of PRESETS)results.push({preset:p.name,...await render(p.gains,multitone)});
  for(const rate of [24000,44100,48000])for(const kind of ['sine','impulse','multitone']){
   const make=kind==='sine'?(i,s)=>Math.sin(2*Math.PI*63*i/s):kind==='impulse'?(i)=>i===100?1:0:multitone;
   const value=await render(Array(10).fill(12),make,rate);if(value.peak>0.99001)throw Error('peak overflow');results.push({rate,kind,...value});
  }
  const library=await(await fetch('/api/library')).json();
  const songs=[];const candidates=[library.tracks.find(t=>t.title.includes('Where Is My Mind')),library.tracks.find(t=>t.title.includes('BbY WOW')),library.tracks.find(t=>t.title==='Nacht Und Träume')].filter(Boolean);
  for(const track of candidates){
   const decoder=new OfflineAudioContext(2,48000,48000);const bytes=await(await fetch('/api/tracks/'+track.id+'/media')).arrayBuffer();const decoded=await decoder.decodeAudioData(bytes);
   const offset=Math.min(Math.floor(decoded.duration*0.35*decoded.sampleRate),decoded.length-48000);
   const make=(i,rate,c)=>decoded.getChannelData(Math.min(c,decoded.numberOfChannels-1))[offset+i]||0;
   const values=[];for(const p of PRESETS){const value=await render(p.gains,make);if(value.peak>0.99001)throw Error('music overflow');values.push({preset:p.name,...value});}songs.push({title:track.title,values});
  }
  const audio=document.createElement('audio');document.body.append(audio);
  const first=await createEqualizerEngine(audio,()=>{});const second=await createEqualizerEngine(audio,()=>{});
  const reused=first===second;first.apply({enabled:true,gains:PRESETS[2].gains});await first.context.suspend();await first.resume();
  first.apply({enabled:false,gains:PRESETS[2].gains});first.apply({enabled:true,gains:PRESETS[2].gains});
  await new Promise(resolve=>setTimeout(resolve,180));
  const state=first.inspect();if(state.sampleRate!==48000||!state.protected)throw Error('context rate or rapid-toggle protection');audio.remove();releaseEqualizerEngine(audio);
  return {signals:results,songs,oneSourcePerElement:reused,resumeState:state.state,sampleRate:state.sampleRate,rapidToggleProtected:state.protected};
 })()`);
  check(
    "audio engine reuses one source per media element",
    report.audio.oneSourcePerElement,
  );
  check(
    "audio context resumes after suspension",
    report.audio.resumeState === "running",
  );
  check("representative real audio checked", report.audio.songs.length === 3);
  report.status = "passed";
} finally {
  evaluate(
    `document.querySelector('audio')?.pause();if(window.eqOriginalSet)Storage.prototype.setItem=window.eqOriginalSet;localStorage.setItem('mylib-equalizer-v1',${JSON.stringify(saved || "{}")});`,
  );
  mkdirSync(".runtime/equalizer", { recursive: true });
  writeFileSync(
    ".runtime/equalizer/verification.json",
    JSON.stringify(report, null, 2),
  );
}
console.log(
  JSON.stringify({
    checks: report.checks.length,
    status: report.status,
    signals: report.audio?.signals.length,
    songs: report.audio?.songs.length,
  }),
);
