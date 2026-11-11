import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const file=n=>readFileSync(new URL('../public/'+n,import.meta.url),'utf8');
test('mobile camera is scoped; foreground hand uses adaptive spacing',()=>{
 const s=file('webgl-table.js');
 assert.match(s,/mobileLandscape\?mobileTableZoom\(\):1/);
 assert.match(s,/const handMetrics=landscapePhone\?mobileHandMetrics/);
 assert.match(s,/const ownPitch=handMetrics\?\.pitch/);
 assert.match(s,/handAnchor=project\(new THREE\.Vector3\(0,15,240\)\)/);
 assert.match(s,/card\.dataset\.seat=String\(k\)/);
});
test('screen-adaptive hand pitch increases readability without overflow',()=>{
 const s=file('webgl-table.js');
 const m=s.match(/function mobileHandMetrics\([^)]*\)\{[\s\S]*?\n\}/);assert.ok(m);
 const layout=vm.runInNewContext(m[0]+'\nmobileHandMetrics',{Math});
 for(const [w,ppu] of [[650,.75],[800,.8],[920,1.1]]){
  const r=layout(w,14,ppu);
  assert.ok(r.pitch>=27&&r.pitch<=55);
  assert.ok(r.scale>=1.55&&r.scale<=2.35);
  assert.ok(r.pitch*14*ppu<=w*.81);
 }
});
test('board magnification is bounded with compatibility for saved zoom',()=>{
 const s=file('webgl-table.js'),m=s.match(/function mobileTableZoom\(\)\{[\s\S]*?\n\}/);assert.ok(m);
 const localStorage={getItem:()=>null};
 const fn=vm.runInNewContext(m[0]+'\nmobileTableZoom',{localStorage});
 assert.equal(fn(),1.12);
 for(const [stored,expected] of [['1.04',1.04],['1.20',1.2],['1.30',1.12],['1.75',1.2],['999',1.12]]){
  localStorage.getItem=()=>stored;assert.equal(fn(),expected);
 }
});