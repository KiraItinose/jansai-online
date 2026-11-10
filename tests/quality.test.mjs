import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../public/webgl-table.js',import.meta.url),'utf8');

test('3D quality modes adjust pixel density and shadow allocation without changing game logic',()=>{
 const match=source.match(/const qualityModes=.*\nfunction applyQuality\(\)\{[\s\S]*?\n\}/);
 assert.ok(match,'3D quality helper exists');
 const config={value:'standard'};let dpr=0,resized=0,redrawn=0,disposals=0;
 const shadow={mapSize:{x:2048,set(x,y){this.x=x;this.y=y}},map:{dispose(){disposals++}}};
 const sunlight={castShadow:true,shadow};
 const renderer={setPixelRatio(x){dpr=x},shadowMap:{enabled:true,needsUpdate:false}};
 const sandbox={quality:config,renderer,sunlight,window:{devicePixelRatio:2},enabled:true,resize(){resized++},invalidate(){redrawn++}};
 const apply=vm.runInNewContext(match[0]+'\napplyQuality',sandbox);
 apply();
 assert.equal(dpr,1.25);assert.equal(shadow.mapSize.x,1024);assert.equal(renderer.shadowMap.enabled,true);
 config.value='light';apply();
 assert.equal(dpr,1);assert.equal(sunlight.castShadow,false);assert.equal(renderer.shadowMap.enabled,false);
 config.value='high';apply();
 assert.equal(dpr,1.5);assert.equal(shadow.mapSize.x,2048);assert.equal(sunlight.castShadow,true);
 assert.equal(resized,3);assert.equal(redrawn,3);assert.ok(disposals>=1);
 assert.match(source,/localStorage\.setItem\('jansuno\.scene\.quality'/);
});
