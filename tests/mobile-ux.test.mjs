import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const file=name=>readFileSync(new URL('../public/'+name,import.meta.url),'utf8');

test('five Dora slots render without exposing concealed indicators',()=>{
 const webgl=file('webgl-table.js'),css=file('jansai-ui-next.css');
 assert.match(webgl,/for\(let i=0;i<5;i\+\+\)/);
 assert.match(webgl,/doraNodes\[i\]/);
 assert.match(webgl,/if\(face\)/);
 assert.match(webgl,/scene-dora-empty/);
 assert.match(webgl,/aria-label','未公開のドラ表示牌'/);
 assert.match(css,/grid-template-columns:26px repeat\(5,minmax\(0,1fr\)\)/);
 assert.match(css,/#sceneDora \.scene-dora-empty/);
});

test('match controls remain visible as live proxies while the table stays exposed',()=>{
 const ui=file('jansai-ui-next.js'),css=file('jansai-ui-next.css');
 assert.match(ui,/setupMobileTopAndQuick/);
 for(const key of ['autoWin','calls','waits'])assert.ok(ui.includes("'"+key+"'"));
 assert.match(ui,/source\.click\(\)/);
 assert.match(ui,/new MutationObserver\(refresh\)/);
 assert.match(css,/#mobileQuickControls \.mobile-quick-toggle/);
 assert.match(css,/#mobileGameDrawer/);
 assert.match(css,/max-height:min\(59dvh,260px\)/);
});

test('rule, help, exit are together top-right and panels are small popovers',()=>{
 const js=file('jansai-ui-next.js'),css=file('jansai-ui-next.css');
 for(const id of ['mobileRuleButton','mobileHelpButton','mobileExitButton'])assert.ok(js.includes(id));
 assert.match(js,/rule\.open=desired/);
 assert.match(js,/help\.open=desired/);
 assert.match(js,/exit\.click\(\)/);
 assert.match(css,/#mobileTopControls/);
 assert.match(css,/#ruleSummary\[open\]/);
 assert.match(css,/#rightPane \.rules\[open\]/);
 assert.match(css,/width:min\(250px,48vw\)/);
 assert.match(css,/#rightPane \.right-actions\{display:contents!important\}/);
 assert.match(css,/#jrOpenHistory/);
 assert.match(css,/#returnSetup\{display:none!important\}/);
});

test('compact 3D center keeps PC size and mobile content readable',()=>{
 const js=file('webgl-table.js');
 assert.match(js,/centerGroup\.add\(bezel,inset,panel\)/);
 assert.match(js,/centerGroup\.scale\.set\(mobileLandscape\?\.81:1,1,mobileLandscape\?\.81:1\)/);
 assert.match(js,/centerCanvas=canvas\(2048,2048\)/);
 assert.match(js,/mobileLandscape\?57:40/);
});

test('mobile camera uses newer bounded presets and maps older selections',()=>{
 const source=file('webgl-table.js');
 const match=source.match(/function mobileTableZoom\(\)\{[\s\S]*?\n\}/);
 assert.ok(match);
 const context={localStorage:{getItem:()=>null}};
 const fn=vm.runInNewContext(match[0]+'\nmobileTableZoom',context);
 assert.equal(fn(),1.30);
 context.localStorage.getItem=()=> '1.16';assert.equal(fn(),1.16);
 context.localStorage.getItem=()=> '1.44';assert.equal(fn(),1.44);
 context.localStorage.getItem=()=> '1.55';assert.equal(fn(),1.30);
 context.localStorage.getItem=()=> '1.75';assert.equal(fn(),1.44);
 context.localStorage.getItem=()=> '100';assert.equal(fn(),1.30);
});
