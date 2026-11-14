import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {Script,runInNewContext} from 'node:vm';
const base=new URL('../public/',import.meta.url);
const text=file=>readFileSync(new URL(file,base),'utf8');

test('all six self-contained 3D dice faces are small, valid PNGs',()=>{
 for(let face=1;face<=6;face++){
  const file=new URL(`dice-textures/face-${face}.png`,base);
  const bytes=readFileSync(file);
  assert.deepEqual([...bytes.subarray(0,8)],[137,80,78,71,13,10,26,10]);
  assert.equal(bytes.readUInt32BE(16),96);
  assert.equal(bytes.readUInt32BE(20),96);
  assert.ok(statSync(file).size<2*1024*1024);
 }
});

test('smartphone only enhances visual rendering; engine result values remain authoritative',()=>{
 const app=text('app-shell.js'),skin=text('chinchiro-real-dice.css');
 const motion=text('chinchiro-motion.js'),renderer=text('chinchiro-canvas.js');
 assert.match(app,/diceCss\.href='chinchiro-real-dice\.css'/);
 assert.match(app,/canvasScript\.src='chinchiro-canvas\.js'/);
 assert.match(motion,/face\.setAttribute\('data-value',String\(result\)\)/);
 assert.match(motion,/window\.JanDiceCanvas\?\.start\?\.\(track,dice\)/);
 assert.match(renderer,/getContext\('2d'/);
 assert.match(renderer,/if\(!window\.matchMedia\?\.\('\(max-width:1000px\)'\)\?\.matches\)return null/);
 assert.match(renderer,/No back faces or detached edge-on strips/);
 assert.match(skin,/body\.page-play #chinchiroOverlay\.chin-rolling \.dice-track\.jan-canvas-rolling \.die-position \.die-cube\{visibility:hidden!important\}/);
 for(let face=1;face<=6;face++){
  assert.match(skin,new RegExp(`data-value="${face}"`));
  assert.ok(skin.includes(`dice-textures/face-${face}.png`));
 }
 assert.doesNotThrow(()=>new Script(renderer));
});

test('Canvas unavailable or wide PC screen preserves the original CSS spin',()=>{
 const window={matchMedia:()=>({matches:false})};
 runInNewContext(text('chinchiro-canvas.js'),{window,document:{}});
 assert.equal(window.JanDiceCanvas.start({}),null);
 assert.match(text('chinchiro-motion.js'),/if\(!rootCanvas\)dice\.forEach/);
});

test('service worker versions and pre-caches the mobile dice artwork',()=>{
 const sw=text('sw.js');
 assert.match(sw,/cloudflare-ws20-real-dice/);
 for(const name of ['chinchiro-canvas.js','chinchiro-real-dice.css',...Array.from({length:6},(_,i)=>`dice-textures/face-${i+1}.png`)]){
  assert.ok(sw.includes(`'${name}'`),`missing precache ${name}`);
 }
});
