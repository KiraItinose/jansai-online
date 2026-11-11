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
test('actual game Chinchiro.play drives three dice with no external observer',()=>{
 const motion=file('chinchiro-motion.js');
 const game=file('jansuno-play-v0.5.7.html');
 assert.match(game,/window\.ChinMotion\?\.play\(\$\('#diceTrack'\),ch\.phase==='rolling'\)/);
 assert.match(motion,/window\.ChinMotion=\{duration:DURATION,play\}/);
 assert.match(motion,/requestAnimationFrame\(frame\)/);
 assert.match(motion,/jan-match-face/);
 assert.match(motion,/visibility:hidden!important/);
});
