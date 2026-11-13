import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=n=>readFileSync(new URL('../public/'+n,import.meta.url),'utf8');
test('dora remains five concealed-aware slots at top-left',()=>{
 const w=file('webgl-table.js'),css=file('jansai-mobile-v5.css');
 assert.match(w,/for\(let i=0;i<5;i\+\+\)/);
 assert.match(w,/scene-dora-empty/);
 assert.match(css,/grid-template-columns:21px repeat\(5,minmax\(0,1fr\)\)/);
});
test('right-top rule, help and exit remain accessible',()=>{
 const ui=file('jansai-ui-next.js'),css=file('jansai-mobile-v5.css');
 for(const id of ['mobileRuleButton','mobileHelpButton','mobileExitButton'])assert.ok(ui.includes(id));
 assert.match(ui,/document\.body\.append\(rule\)/);
 assert.match(css,/#rightPane \.rules\[open\]/);
});
test('three-dimensional center is compact on the reference camera, not desktop',()=>{
 const w=file('webgl-table.js');
 assert.match(w,/centerGroup\.scale\.set\(mobileReference\?\.81:1/);
 assert.match(w,/centerCanvas=canvas\(2048,2048\)/);
 assert.match(w,/raycaster\.intersectObjects\(candidates,true\)/);
});
test('fullscreen button requires a direct user gesture',()=>{
 const ui=file('jansai-ui-next.js');
 assert.match(ui,/fullscreen\.addEventListener\('click',async/);
 assert.match(ui,/document\.documentElement\.requestFullscreen\(\)/);
});