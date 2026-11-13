import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('../public/'+name,import.meta.url),'utf8');

test('mobile rivers are bigger, remain six tiles per row and preserve fourth-row overflow',()=>{
 const src=read('webgl-table.js');
 assert.match(src,/const scale=landscapePhone\?1\.10:\.86/);
 assert.match(src,/const base=landscapePhone\?96:103/);
 assert.match(src,/const rowStep=landscapePhone\?29\.5:29/);
 assert.match(src,/row=Math\.min\(3,Math\.floor\(i\/6\)\),col=i<24\?i%6:i-18/);
 assert.match(src,/river\.length>24&&row===3/);
 const lastRiverEdge=96+3*29.5*1.10+14*1.10;
 const frontHandEdge=260-28*1.70/2;
 assert.ok(frontHandEdge-lastRiverEdge>20,'discard rows must not touch the foreground hand');
});
test('mobile hand reserves corridor for open melds and fits from 14 to two tiles',()=>{
 const src=read('webgl-table.js');
 const f=src.match(/function mobileHandCorridor\([^)]*\)\{[\s\S]*?\n\}/);
 assert.ok(f,'fit helper missing');
 const corridor=vm.runInNewContext(f[0]+'\nmobileHandCorridor',{Math});
 const unmelded=corridor(14,52,283,false,false,false);
 assert.equal(unmelded.pitch,52,'keep the prior readable hand size when no meld is present');
 assert.ok(unmelded.scale>2,'keep the prior readable face size');
 for(const [count,preferred,ownLeft,own,left,right] of [
  [14,52,283,false,false,false],[14,52,283,false,true,false],
  [11,48,210,true,false,false],[8,47,134,true,true,true],
  [5,52,58,true,true,false],[2,55,-22,true,true,true]
 ]){
  const layout=corridor(count,preferred,ownLeft,own,left,right);
  assert.ok(layout.pitch>=17&&layout.scale>=1.05);
  assert.ok(layout.start>=layout.left-.01,'hand clips left meld corridor');
  assert.ok(layout.start+count*layout.pitch+9<=layout.right+.01,'hand clips right meld corridor');
  if(left)assert.equal(layout.left,-230);
  if(own)assert.ok(layout.right<=ownLeft-25);
 }
 assert.match(src,/const handCorridor=landscapePhone\?mobileHandCorridor/);
 assert.match(src,/landscapePhone\?260:240/);
 assert.match(src,/handAnchor=project\(new THREE\.Vector3\(0,15,260\)\)/);
});
test('river contrast material is only used for mobile discard faces',()=>{
 const src=read('webgl-table.js');
 assert.match(src,/function mobileRiverFace\(name\)/);
 assert.match(src,/const mobileRiver=river&&matchMedia/);
 assert.match(src,/rec\.face\.material=mobileRiver\?mobileRiverFace\(name\):faceMats\.get\(name\)/);
});
test('name and score plaques use four separate unobstructed mobile anchors',()=>{
 const css=read('jansai-mobile-v5.css');
 const dedicated=css.slice(css.lastIndexOf('Mobile refinement v5.1'));
 assert.ok(dedicated.length>900);
 for(let k=0;k<4;k++)assert.ok(dedicated.includes('.scene-seat[data-seat="'+k+'"]'));
 assert.match(dedicated,/\.scene-seat>div/);
 assert.match(dedicated,/\.scene-seat strong/);
 assert.match(dedicated,/\.scene-score/);
});
test('PWA advertises the new mobile display adjustments',()=>{
 assert.match(read('sw.js'),/cloudflare-ws15-river-meld/);
});
