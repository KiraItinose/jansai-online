import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const file=name=>readFileSync(new URL('../public/'+name,import.meta.url),'utf8');
test('reference mobile camera is independent of desktop camera and retains raycast',()=>{
 const s=file('webgl-table.js');
 assert.match(s,/const mobileReference=compact&&matchMedia/);
 assert.match(s,/if\(mobileReference\)\{/);
 assert.match(s,/const corners=\[\[-324,-31,-305\]/);
 assert.match(s,/pos\.copy\(mobileOverlayWorld/);
 assert.match(s,/raycaster\.intersectObjects\(candidates,true\)/);
});
test('reference hand is fixed in a camera-facing bottom row',()=>{
 const s=file('webgl-table.js');
 assert.match(s,/const px=layout\.start\+\(index\+\.5\)\*layout\.tileWidth\+gap/);
 assert.match(s,/const py=h-Math\.max\(3,h\*\.009\)-layout\.tileHeight\/2-lift/);
 assert.match(s,/rot\.copy\(camera\.quaternion\)/);
 assert.match(s,/mobileHandOverlay=landscapePhone\?mobileForegroundHand/);
});
test('mobile whole-table view is fixed from startup',()=>{
 const s=file('webgl-table.js');
 assert.match(s,/function mobileTableZoom\(\)\{return 1\.04;\}/);
 assert.doesNotMatch(s,/localStorage\.getItem\('jansai\.mobile\.tableZoom'\)/);
});
