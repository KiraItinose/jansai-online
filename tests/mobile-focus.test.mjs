import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=n=>readFileSync(new URL('../public/'+n,import.meta.url),'utf8');
test('mobile composition is isolated and cleans up conflicting old rules',()=>{
 const base=file('jansai-ui-next.css'),css=file('jansai-mobile-v5.css');
 assert.ok(!base.includes('mobile landscape v3'));
 assert.match(css,/@media \(max-width:1000px\) and \(orientation:landscape\)/);
 assert.match(css,/#leftPane/);
 for(let k=0;k<4;k++)assert.ok(css.includes('.scene-seat[data-seat="'+k+'"]'));
 assert.match(css,/#sceneDora/);
 assert.match(css,/#mobileTopControls/);
 assert.match(css,/#mobileQuickControls/);
 assert.match(css,/#actionArea/);
});
test('real-match chinchiro remains unchanged and cached assets are versioned',()=>{
 const sw=file('sw.js'),motion=file('chinchiro-motion.js');
 assert.match(sw,/cloudflare-ws18-3d-hydration/);
 assert.match(motion,/window\.ChinMotion=\{duration:DURATION,play\}/);
});