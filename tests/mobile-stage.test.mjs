import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const file=name=>readFileSync(new URL('../public/'+name,import.meta.url),'utf8');
test('mobile game enlarges the hand without affecting desktop camera',()=>{
 const js=file('webgl-table.js');
 assert.match(js,/mobileLandscape\?mobileTableZoom\(\):1/);
 assert.match(js,/handAnchor=project\(new THREE\.Vector3\(0,15,240\)\)/);
 assert.match(js,/camera\.projectionMatrix\.elements\[9\]/);
 assert.match(js,/card\.dataset\.seat=String\(k\)/);
 assert.match(js,/actionArea\.style\.setProperty\('bottom','76px','important'\)/);
});
test('landscape positions HUD compactly without removing game controls',()=>{
 const css=file('jansai-ui-next.css'),ui=file('jansai-ui-next.js');
 assert.match(css,/@media \(max-width:1000px\) and \(orientation:landscape\)/);
 for(let k=0;k<4;k++)assert.ok(css.includes('.scene-seat[data-seat="'+k+'"]'));
 assert.match(css,/#actionArea:not\(\.end-actions\)/);
 assert.match(css,/#sceneDora/);
 assert.match(ui,/id="mobileTableZoom"/);
 assert.match(ui,/window\.dispatchEvent\(new Event\('resize'\)\)/);
 assert.match(ui,/controls\.append\(dock\)/);
});
test('mobile magnification has bounded presets and recommended default',()=>{
 const js=file('webgl-table.js');
 const match=js.match(/function mobileTableZoom\(\)\{[\s\S]*?\n\}/);
 assert.ok(match);
 const context={localStorage:{getItem:()=>null}};
 const fn=vm.runInNewContext(match[0]+'\nmobileTableZoom',context);
 assert.equal(fn(),1.55);
 context.localStorage.getItem=()=> '1.75';
 assert.equal(fn(),1.75);
 context.localStorage.getItem=()=> '999';
 assert.equal(fn(),1.55);
});
