import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sw=readFileSync(new URL('../public/sw.js',import.meta.url),'utf8');
const js=readFileSync(new URL('../public/webgl-table.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../public/webgl-table.css',import.meta.url),'utf8');
test('PWA update activates after precache and refreshes 3D scripts and styles',()=>{
 assert.match(sw,/then\(\(\)=>self\.skipWaiting\(\)\)/);
 for(const name of ['webgl-table.js','webgl-table.css','online.js','app-shell.js'])assert.ok(sw.includes("'"+name+"'"));
 assert.match(sw,/e\.request\.mode==='navigate'\|\|FRESH_PATHS\.has/);
});
test('3D toolbar grip is forcibly visible with explicit drag label',()=>{
 assert.match(js,/toolGrip\.textContent='↕ 移動'/);
 assert.match(js,/toolGrip\.style\.setProperty\('display','inline-flex','important'\)/);
 assert.match(css,/body\.page-play #toolMove\{display:inline-flex!important/);
 assert.match(css,/body\.page-play\.scene-live #toolDock\{width:clamp\(256px,20vw,304px\)!important/);
});
