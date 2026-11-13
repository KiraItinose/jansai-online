import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=n=>readFileSync(new URL('../public/'+n,import.meta.url),'utf8');

test('the game must not start until 3D is actually rendered',()=>{
 const html=file('jansuno-play-v0.5.7.html');
 const scene=file('webgl-table.js');
 assert.match(html,/window\.Jansai3DReady=new Promise/);
 assert.match(html,/await window\.Jansai3DReady;/);
 assert.ok(html.indexOf('await window.Jansai3DReady;')<html.indexOf('engine.startMatch('));
 assert.match(html,/body\.page-play:not\(\.scene-ready\) #tb/);
 assert.match(scene,/renderer\.render\(scene,camera\);if\(!firstFrameReady\)ready3D\(\)/);
 assert.match(scene,/document\.body\.classList\.add\('scene-ready'\)/);
 assert.match(scene,/window\.__jansaiResolve3D\?\.\(\)/);
 assert.match(scene,/window\.__jansaiReject3D\?\.\(new Error\(message\)\)/);
});
test('only the 3D renderer remains available',()=>{
 const webgl=file('webgl-table.js');
 assert.match(webgl,/input id="rendererChoice" type="hidden" value="webgl"/);
 assert.doesNotMatch(webgl,/<option value="classic">/);
 assert.match(webgl,/\$\('#toolPanel'\)\.append\(settings\)/);
 assert.match(webgl,/mode\.value='webgl'/);
 assert.doesNotMatch(webgl,/fallback\('従来表示'\)/);
});
test('gear has two settings, lives below the compact quick switches',()=>{
 const ui=file('jansai-ui-next.js'),css=file('jansai-mobile-v5.css');
 assert.match(ui,/addMirror\('cameraPreset','3Dの視点'/);
 assert.match(ui,/addMirror\('sceneQuality','3D画質'/);
 assert.doesNotMatch(ui,/mobileFullscreenToggle/);
 assert.doesNotMatch(ui,/mobileTableZoom/);
 assert.match(css,/#mobileQuickControls/);
 assert.match(css,/#mobileGameToggle/);
 assert.match(css,/#toolDock\{display:none!important\}/);
});
test('PWA is fullscreen landscape where supported; regular browser keeps OS controls',()=>{
 const manifest=JSON.parse(file('manifest.webmanifest'));
 assert.equal(manifest.display,'fullscreen');
 assert.equal(manifest.orientation,'landscape');
 assert.ok(manifest.display_override.includes('fullscreen'));
});
test('all modal types are constrained to the mobile viewport',()=>{
 const css=file('jansai-mobile-v5.css');
 for(const part of ['.jr-card','.jr-agari-layout','.jr-transfer-row','.jr-result-row','#chinchiroOverlay .chin-panel']){
  assert.ok(css.includes(part),'missing layout '+part);
 }
 assert.match(css,/height:calc\(100dvh - 10px\)!important/);
 assert.match(css,/max-height:calc\(100dvh - 10px\)!important/);
 assert.match(css,/overflow-y:auto!important/);
 assert.match(css,/#chinchiroOverlay \.chin-bowl/);
});
test('PWA cache version includes startup gate and result screen changes',()=>{
 assert.match(file('sw.js'),/cloudflare-ws17-3d-start-results/);
});
