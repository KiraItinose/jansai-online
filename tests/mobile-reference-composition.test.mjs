import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../public/webgl-table.js',import.meta.url),'utf8');
function extract(name){
 const m=source.match(new RegExp('function '+name+'\\([^)]*\\)\\{[\\s\\S]*?\\n\\}'));
 assert.ok(m,'missing '+name);return m[0];
}
const scope=vm.runInNewContext([
 extract('mobileReferenceComposition'),
 extract('mobileForegroundHand'),
 '({mobileReferenceComposition,mobileForegroundHand})'
].join('\n'),{Math,Number});

test('reference framing fills the mobile screen and shows the far edge',()=>{
 for(const [w,h] of [[1640,720],[800,350],[912,412]]){
  const c=scope.mobileReferenceComposition(w,h,1.12);
  assert.equal(c.pitch,45);
  assert.ok(c.nearWidthRatio>.9&&c.nearWidthRatio<.96);
  const theta=c.pitch*Math.PI/180,dist=1100,focal=h/(2*Math.tan(38*Math.PI/360));
  const p=(x,y,z,zoom)=>{
   const worldZ=z-25;
   const depth=dist-y*Math.sin(theta)-worldZ*Math.cos(theta);
   return {x:w/2+focal*zoom*x/depth,y:h/2-focal*zoom*(y*Math.cos(theta)-worldZ*Math.sin(theta))/depth};
  };
  const span=p(324,3,305,1).x-p(-324,3,305,1).x;
  const zoom=(w*c.nearWidthRatio)/span;
  const shift=h*c.centerYRatio-p(0,10,0,zoom).y;
  const farY=p(0,-23,-305,zoom).y+shift;
  const nearY=p(0,-23,305,zoom).y+shift;
  assert.ok(farY>=-h*.1&&farY<h*.12,'far edge should remain visible at top');
  assert.ok(nearY>h*.97,'near border should reach off-screen');
 }
});

test('front row follows the reference at the bottom of the viewport',()=>{
 for(const [w,h,expectedWidth] of [[1640,720,1017],[800,350,496],[912,412,565]]){
  const c=scope.mobileForegroundHand(w,h,13,1);
  const rowWidth=c.tileWidth*14+c.drawGap;
  assert.ok(Math.abs(rowWidth-expectedWidth)<35,'hand width changed from reference geometry');
  assert.ok(c.start>w*.1&&c.start<w*.3,'hand should be centered, not clipped');
  assert.ok(c.start+rowWidth<w*.9,'rightmost draw must remain visible');
  assert.ok(c.tileHeight>h*.105&&c.tileHeight<h*.155,'tile faces occupy usable bottom band');
 }
});

test('the mobile hand is positioned as tappable Three.js objects in front of the board',()=>{
 assert.match(source,/const mobileReference=compact&&matchMedia/);
 assert.match(source,/mobileReference\?mobileReferenceComposition/);
 assert.match(source,/const center=project\(new THREE\.Vector3\(0,10,0\)\)/);
 assert.match(source,/mobileHandOverlay=landscapePhone\?mobileForegroundHand/);
 assert.match(source,/pos\.copy\(mobileOverlayWorld\(px,py,layout\.planeDistance\)\)/);
 assert.match(source,/rec\.group\.scale\.setScalar\(scale\)/);
 assert.match(source,/raycaster\.intersectObjects\(candidates,true\)/);
 assert.match(source,/r\.node\.click\(\)/);
 assert.match(source,/const backs=\[\.\.\.\$\('#wallTiles'\+seat\)/);
});

test('mobile-only camera and seats do not replace desktop composition',()=>{
 const css=readFileSync(new URL('../public/jansai-mobile-v5.css',import.meta.url),'utf8');
 const tail=css.slice(css.lastIndexOf('v6 mobile reference composition'));
 assert.match(tail,/@media \(max-width:1000px\) and \(orientation:landscape\)/);
 for(const seat of [0,1,2,3])assert.ok(tail.includes('.scene-seat[data-seat="'+seat+'"]'));
 assert.match(source,/const corners=\[\[-324,-31,-305\]/);
 assert.match(source,/if\(mobileReference\)\{/);
});
