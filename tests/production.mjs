import {spawn,execFileSync} from 'node:child_process';import {randomBytes} from 'node:crypto';import {mkdirSync,writeFileSync} from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {freePort} from '../scripts/ports.mjs';
const data=path.resolve('.runtime/production-data');mkdirSync(data,{recursive:true});
execFileSync('.venv/bin/python',['-c',`from pathlib import Path\nimport sqlite3,os\nsource=Path.home()/'Library/Application Support/MyLibApp'\ntarget=Path(${JSON.stringify(data)})\na=sqlite3.connect(source/'library.sqlite');b=sqlite3.connect(target/'library.sqlite');a.backup(b);a.close();b.close()\nfor name in ('media','analysis'):\n p=target/name\n if not p.exists(): p.symlink_to(source/name,target_is_directory=True)`]);
const apiPort=await freePort(0),port=await freePort(0),url=`http://127.0.0.1:${port}`;
const env={...process.env,MYLIB_DATA:data,MYLIB_TOKEN:randomBytes(32).toString('hex'),MYLIB_BACKEND:`http://127.0.0.1:${apiPort}`};
const children=[];async function waitFor(url,headers={}){for(let i=0;i<100;i++){try{const r=await fetch(url,{headers});if(r.ok)return r;}catch{}await new Promise(r=>setTimeout(r,100));}throw Error('Server unavailable: '+url);}
let session,tab;
try{
 children.push(spawn('.venv/bin/python',['-m','uvicorn','backend.main:app','--host','127.0.0.1','--port',String(apiPort)],{env,stdio:'ignore'}));
 await waitFor(env.MYLIB_BACKEND+'/health',{'x-mylib-token':env.MYLIB_TOKEN});
 children.push(spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{env,stdio:'ignore'}));
 await waitFor(url+'/api/health');
 const library=await (await fetch(url+'/api/library')).json();assert.equal(library.tracks.filter(t=>t.status==='ready').length,2);
 const tid=library.tracks[0].id;
 const media=await fetch(url+`/api/tracks/${tid}/media`,{headers:{range:'bytes=0-63'}});assert.equal(media.status,206);
 const prepared=await (await fetch(url+`/api/tracks/${tid}/export`,{method:'POST'})).json();assert.ok(prepared.filename.endsWith('.mp3'));
 const exported=await fetch(url+`/api/tracks/${tid}/export`);assert.equal(exported.headers.get('content-type'),'audio/mpeg');assert.ok(exported.headers.get('content-disposition').includes('.mp3'));await exported.arrayBuffer();
 session=execFileSync('agent-browser',['session','id','--scope','worktree','--prefix','next-dev-loop'],{encoding:'utf8'}).trim();
 function browser(...args){const r=JSON.parse(execFileSync('agent-browser',['--session',session,'--restore','--json',...args],{encoding:'utf8'}));if(!r.success)throw Error(JSON.stringify(r.error));return r.data;}
 const opened=browser('tab','new',url);tab=opened.tabId;
 browser('wait','.track-title');const result=browser('eval',`({rows:document.querySelectorAll('.track-row').length,audio:document.querySelectorAll('audio').length,title:document.title})`).result;assert.equal(result.rows,2);assert.equal(result.audio,1);
 writeFileSync('.runtime/production-result.json',JSON.stringify({mode:'production',...result,range:206,exportFormat:'audio/mpeg',filename:prepared.filename},null,2));
 console.log('PASS production build runtime, browser, library, HTTP Range and MP3 export',result);
 if(tab)browser('tab','close',tab);
}catch(error){throw error;}finally{for(const child of children)child.kill('SIGTERM');}
