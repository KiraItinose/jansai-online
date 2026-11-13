import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const file=n=>readFileSync(new URL('../public/'+n,import.meta.url),'utf8');
test('agari transfer and match show complete cards without inner scrolling',()=>{
 const css=file('jansai-mobile-v5.css'),ui=file('jansai-ui-next.js');
 assert.match(css,/height:auto!important;min-height:0!important;max-height:none!important/);
 assert.match(css,/overflow:visible!important;overscroll-behavior:auto!important/);
 assert.match(css,/transform:scale\(var\(--jr-fit-scale,1\)\)!important/);
 assert.match(ui,/new MutationObserver\(schedule\)\.observe\(overlay/);
 assert.match(ui,/\['agari','transfer','match'\]\.includes\(overlay\.dataset\.stage\)/);
 assert.match(ui,/setupResultFit\(\)/);
});
test('result fit helper calculates full-card scale for landscape and portrait',()=>{
 const ui=file('jansai-ui-next.js');
 const m=ui.match(/function resultFitScale\([^)]*\)\{[\s\S]*?\n \}/);
 assert.ok(m,'missing pure result fit helper');
 const fit=vm.runInNewContext(m[0]+'\nresultFitScale',{Math});
 assert.equal(fit(700,300,800,360),1);
 assert.ok(fit(800,520,780,345)<.67);
 assert.ok(fit(700,300,400,800)<.58);
});
test('mobile chinchiro keeps three real 3D dice and a resized bowl',()=>{
 const css=file('jansai-mobile-v5.css'),motion=file('chinchiro-motion.js');
 assert.match(css,/isolation:auto!important;transform-style:preserve-3d!important/);
 assert.match(css,/width:min\(365px,70vw,calc\(162dvh - 243px\)\)!important/);
 assert.match(css,/gap:clamp\(7px,2vw,20px\)!important/);
 assert.match(motion,/window\.ChinMotion=\{duration:DURATION,play\}/);
});