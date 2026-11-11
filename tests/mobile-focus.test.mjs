import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=name=>readFileSync(new URL('../public/'+name,import.meta.url),'utf8');
test('mobile-only portrait-focused layout leaves desktop untouched',()=>{
 const css=file('jansai-ui-next.css');
 const section=css.slice(css.indexOf('mobile landscape v3'));
 assert.ok(section.length>3000,'Expected focused mobile rules');
 assert.match(section,/@media \(max-width:1000px\) and \(orientation:landscape\)/);
 assert.match(section,/\.scene-seat\s*\{/);
 assert.match(section,/flex-direction:column!important/);
 assert.match(section,/\.scene-avatar\s*\{/);
 for(let k=0;k<4;k++)assert.ok(section.includes('.scene-seat[data-seat="'+k+'"]'),'Missing seat '+k);
 assert.match(section,/#sceneWait/);
 assert.match(section,/#actionArea:not\(\.end-actions\)/);
 assert.match(section,/#mobileGameToggle/);
 assert.match(section,/pointer-events:none!important/);
});
test('mobile update keeps Cloudflare PWA and real match dice mechanism',()=>{
 const sw=file('sw.js'),motion=file('chinchiro-motion.js');
 assert.match(sw,/cloudflare-ws13-five-dora-ui/);
 assert.match(sw,/jansai-ui-next\.css/);
 assert.match(motion,/window\.ChinMotion=\{duration:DURATION,play\}/);
});
