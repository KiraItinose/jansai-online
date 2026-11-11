import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';

const asset=name=>readFileSync(new URL('../public/'+name,import.meta.url),'utf8');
test('new mobile and dice assets are valid JavaScript and wired to the game shell',()=>{
 const js=asset('jansai-ui-next.js'),shell=asset('app-shell.js'),sw=asset('sw.js');
 assert.doesNotThrow(()=>new Script(js));
 assert.match(shell,/nextScript\.src='jansai-ui-next\.js'/);
 assert.match(shell,/nextCss\.href='jansai-ui-next\.css'/);
 assert.match(sw,/cloudflare-ws9-mobile-dice/);
 assert.match(sw,/jansai-ui-next\.js/);
 assert.match(sw,/jansai-ui-next\.css/);
});
test('rolling dice have independent angle changes and flat result faces',()=>{
 const js=asset('jansai-ui-next.js'),css=asset('jansai-ui-next.css');
 assert.match(js,/requestAnimationFrame\(tick\)/);
 assert.match(js,/cube\.style\.setProperty\('transform'/);
 assert.match(js,/rotateX/);
 for(const angle of ['-90,0','0,-90','0,90','90,0','0,180'])assert.ok(js.includes("'"+angle+"'"));
 assert.match(js,/jan-die-flat/);
 assert.match(css,/#chinchiroOverlay:not\(\.chin-rolling\) \.die-position \.die-cube\{visibility:hidden!important/);
 assert.match(css,/#chinchiroOverlay\.chin-rolling \.jan-die-flat/);
});
test('mobile settings use real existing controls and preserve desktop layout',()=>{
 const js=asset('jansai-ui-next.js'),css=asset('jansai-ui-next.css');
 assert.match(js,/controls\.append\(dock\)/);
 assert.match(js,/controls\.append\(display\)/);
 assert.match(js,/mobile-sheet-open/);
 assert.match(css,/#mobileGameDrawer\{display:contents\}/);
 assert.match(css,/@media\(max-width:1000px\)/);
 assert.match(css,/body\.page-play\.scene-live #sceneHost/);
 assert.match(asset('webgl-table.js'),/compact&&preset\.value==='table'\?40/);
});
