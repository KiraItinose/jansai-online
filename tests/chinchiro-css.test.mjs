import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=name=>readFileSync(new URL('../public/'+name,import.meta.url),'utf8');

test('dice spin starts from the actual rolling game state, independently of Web Animations',()=>{
 const game=file('jansuno-play-v0.5.7.html'),css=file('refinements.css');
 assert.match(game,/overlay\.className=ch\.phase==='rolling'\?'chin-rolling'/);
 assert.match(css,/#chinchiroOverlay\.chin-rolling \.die-position \.die-cube/);
 assert.match(css,/@keyframes jansaiSpinDice/);
 assert.match(css,/animation:jansaiSpinDice 3\.1s/);
 assert.match(css,/100%\{transform:rotateX\(var\(--endX\)\) rotateY\(var\(--endY\)\)/);
 assert.match(css,/#chinchiroOverlay:not\(\.chin-rolling\)/);
});

test('solo preview is available from the TOP without accessing the score engine',()=>{
 const script=file('app-shell.js'),css=file('lobby.css');
 assert.match(script,/previewChinBtn/);
 assert.match(script,/if\(!play&&document\.querySelector\('#cc'\)/);
 assert.match(script,/サイコロ回転中/);
 assert.match(script,/出目：1・3・5（表示テスト）/);
 assert.match(script,/\(\(p-1\)%3\+1\)/);
 assert.match(css,/#chinchiroPreview\.chin-rolling \.die-position \.die-cube/);
 assert.match(css,/#chinchiroPreview::backdrop/);
});

test('the PWA update advertises the new preview and spin assets',()=>{
 const sw=file('sw.js');
 assert.match(sw,/0\.5\.7-cloudflare-ws10-mobile-stage/);
 for(const name of ['/app-shell.js','/lobby.css','/refinements.css'])
  assert.ok(sw.includes("'"+name+"'"));
});
