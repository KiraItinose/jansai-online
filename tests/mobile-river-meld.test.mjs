import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=name=>readFileSync(new URL('../public/'+name,import.meta.url),'utf8');
test('rivers retain six per row, fourth-row overflow and phone contrast',()=>{
 const src=file('webgl-table.js');
 assert.match(src,/const scale=landscapePhone\?1\.10:\.86/);
 assert.match(src,/const base=landscapePhone\?96:103/);
 assert.match(src,/const rowStep=landscapePhone\?29\.5:29/);
 assert.match(src,/row=Math\.min\(3,Math\.floor\(i\/6\)\),col=i<24\?i%6:i-18/);
 assert.match(src,/river\.length>24&&row===3/);
 assert.match(src,/rec\.face\.material=mobileRiver\?mobileRiverFace\(name\):faceMats\.get\(name\)/);
});
test('hand and opened melds occupy different 3D depths in mobile reference layout',()=>{
 const js=file('webgl-table.js');
 assert.match(js,/mobileHandOverlay=landscapePhone\?mobileForegroundHand/);
 assert.match(js,/planeDistance:650/);
 assert.match(js,/if\(rec\.own\)\{/);
 assert.match(js,/pos\.copy\(mobileOverlayWorld\(px,py,layout\.planeDistance\)\)/);
 assert.match(js,/function syncMelds\(seat\)/);
 assert.match(js,/syncMelds\(0\)/);
});
test('four names remain at reference anchors and never intercept tile taps',()=>{
 const css=file('jansai-mobile-v5.css');
 const part=css.slice(css.lastIndexOf('v6 mobile reference composition'));
 for(let i=0;i<4;i++)assert.ok(part.includes('.scene-seat[data-seat="'+i+'"]'));
 assert.match(css,/pointer-events:none!important/);
});
test('updated assets invalidate the old PWA',()=>{
 assert.match(file('sw.js'),/cloudflare-ws18-3d-hydration/);
});
