import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const file=n=>readFileSync(new URL('../public/'+n,import.meta.url),'utf8');
for(const name of ['index.html','jansuno-room-v0.5.7.html'])test('start flow is ordered and handlers remain wired: '+name,()=>{
 const s=file(name);
 for(const id of ['solo','mk','cd','jn'])assert.equal(s.split('id="'+id+'"').length-1,1);
 assert.ok(s.indexOf('id="solo"')<s.indexOf('id="mk"'));
 assert.ok(s.indexOf('id="mk"')<s.indexOf('id="cd"'));
 assert.ok(s.indexOf('id="cd"')<s.indexOf('id="jn"'));
 assert.ok(s.includes('<b>02</b> 対局設定'));
 assert.ok(s.includes('<b>03</b> 対局開始'));
 assert.ok(!s.includes('class="play-modes"'));
 assert.ok(!s.includes('⑤ 喰い替えなし'));
 for(const id of ['solo','mk','jn'])assert.ok(s.includes("$('#"+id+"').onclick"));
});
test('play UI hides only the redundant kuikae explanation',()=>{
 const s=file('app-shell.js');
 assert.match(s,/MutationObserver\(hideLine\)/);
 assert.match(s,/喰い替えなし/);
 assert.match(s,/section\.remove\(\)/);
});
test('three 3D dice spin, then finish on the game-provided end angles',async()=>{
 const w={matchMedia:()=>({matches:false})};
 vm.runInNewContext(file('chinchiro-motion.js'),{window:w});
 const dice=Array.from({length:3},(_,i)=>{
  const animations=[];
  const cube={getAnimations:()=>[],animate:(frames,opts)=>{
   animations.push({frames,opts});return {finished:Promise.resolve()};
  }};
  const node={getAnimations:()=>[],querySelector:()=>cube,classList:{remove(){},add(){}},dataset:{},style:{getPropertyValue:k=>k==='--endX'?String(i*90)+'deg':String(i*180)+'deg'},animate:()=>({finished:Promise.resolve()})};
  return {node,animations};
 });
 await w.ChinMotion.play({querySelectorAll:()=>dice.map(x=>x.node)},true);
 dice.forEach(({node,animations},i)=>{
  assert.equal(node.dataset.motion,'3d-spin');
  assert.equal(animations.length,1);
  assert.equal(animations[0].frames.at(-1).transform,'rotateX('+i*90+'deg) rotateY('+i*180+'deg) rotateZ(0deg)');
  assert.equal(animations[0].opts.duration,3000);
 });
});
