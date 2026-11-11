import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
const file=n=>readFileSync(new URL('../public/'+n,import.meta.url),'utf8');
test('standalone mobile layout loads last without touching the engine',()=>{
 const ui=file('jansai-ui-next.js'),shell=file('app-shell.js'),sw=file('sw.js');
 assert.doesNotThrow(()=>new Script(ui));
 assert.match(shell,/jansai-mobile-v5\.css/);
 assert.match(shell,/jansai-ui-next\.js/);
 assert.match(sw,/cloudflare-ws14-mobile-redesign/);
 assert.match(sw,/jansai-mobile-v5\.css/);
});
test('chinchiro preview still uses its existing animation and clean settled faces',()=>{
 const ui=file('jansai-ui-next.js'),css=file('jansai-ui-next.css');
 assert.match(ui,/requestAnimationFrame\(tick\)/);
 assert.match(ui,/jan-die-flat/);
 assert.match(css,/#chinchiroOverlay\.chin-rolling \.jan-die-flat/);
 assert.match(css,/visibility:hidden!important/);
});
test('mobile quick switches use real game buttons and can be adjusted while playing',()=>{
 const ui=file('jansai-ui-next.js'),css=file('jansai-mobile-v5.css');
 assert.match(ui,/source\.click\(\)/);
 assert.match(ui,/new MutationObserver\(refresh\)/);
 assert.match(ui,/autoWin:'和了',calls:'鳴き',waits:'待ち'/);
 assert.match(css,/#mobileQuickControls \.mobile-quick-toggle/);
 assert.match(css,/pointer-events:auto!important/);
});