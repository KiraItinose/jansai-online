import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const js=readFileSync(new URL('../public/webgl-table.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../public/webgl-table.css',import.meta.url),'utf8');
const game=readFileSync(new URL('../public/jansuno-play-v0.5.7.html',import.meta.url),'utf8');

test('3D match switcher has an accessible drag handle and a larger floating panel',()=>{
 assert.match(css,/body\.page-play\.scene-live #toolMove\{display:flex\}/);
 assert.match(css,/body\.page-play\.scene-live #toolDock\{[^}]*width:clamp\(224px,18vw,270px\)/);
 assert.match(css,/body\.page-play #toolToggle\{[^}]*font-size:16px/);
 assert.match(css,/body\.page-play\.scene-live #toolPanel\{[^}]*max-height:min\(60dvh,390px\)/);
 assert.doesNotMatch(css,/body\.scene-live #toolMove\{display:none\}/);
});

test('3D HUD does not overwrite drag position and saved coordinates remain functional',()=>{
 assert.doesNotMatch(js,/dock\.style\.setProperty\('left'/);
 assert.doesNotMatch(js,/dock\.style\.setProperty\('top'/);
 assert.match(game,/handle\.addEventListener\('pointerdown'/);
 assert.match(game,/handle\.addEventListener\('pointermove'/);
 assert.match(game,/positions\.tool=moveDock\(r\.left,r\.top\);storageWrite\(positions\)/);
 assert.match(game,/function restorePlaces\(\)/);
 assert.match(game,/dock\.classList\.toggle\('expand-down'/);
});
