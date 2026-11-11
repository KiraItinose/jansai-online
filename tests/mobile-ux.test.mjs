import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=n=>readFileSync(new URL('../public/'+n,import.meta.url),'utf8');
test('five dora slots, with unrevealed placeholders, remain intact',()=>{
 const src=file('webgl-table.js'),css=file('jansai-mobile-v5.css');
 assert.match(src,/for\(let i=0;i<5;i\+\+\)/);
 assert.match(src,/scene-dora-empty/);
 assert.match(css,/grid-template-columns:21px repeat\(5,minmax\(0,1fr\)\)/);
});
test('top-right rules and help remain accessible after logo sidebar is hidden',()=>{
 const ui=file('jansai-ui-next.js'),css=file('jansai-mobile-v5.css');
 for(const name of ['mobileRuleButton','mobileHelpButton','mobileExitButton'])assert.ok(ui.includes(name));
 assert.match(ui,/document\.body\.append\(rule\)/);
 assert.match(ui,/originalParent\.insertBefore\(rule,originalSibling\)/);
 assert.match(css,/#rightPane \.rules\[open\]/);
 assert.match(css,/#leftPane/);
});
test('mobile HUD is smaller, but 3D game and player controls retain hit testing',()=>{
 const w=file('webgl-table.js'),css=file('jansai-mobile-v5.css');
 assert.match(w,/centerGroup\.scale\.set\(mobileLandscape\?\.81:1/);
 assert.match(w,/centerCanvas=canvas\(2048,2048\)/);
 assert.match(w,/raycaster\.intersectObjects\(candidates,true\)/);
 assert.match(css,/#sceneHUD \.scene-seat/);
});
test('fullscreen is opt-in and not triggered outside user gesture',()=>{
 const ui=file('jansai-ui-next.js');
 assert.match(ui,/mobileFullscreenToggle/);
 assert.match(ui,/fullscreen\.addEventListener\('click',async/);
 assert.match(ui,/document\.documentElement\.requestFullscreen\(\)/);
});