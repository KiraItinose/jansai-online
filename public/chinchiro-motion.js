/* 雀彩・チンチロの表示専用3D回転。倍率／出目はゲーム側の確定値を使用。 */
(()=>{'use strict';
const DURATION=3000;
function spinFrames(x,y,i){
 const direction=i===1?-1:1;
 return [
  {offset:0,transform:`rotateX(${x+1080*direction}deg) rotateY(${y-1080}deg) rotateZ(720deg)`},
  {offset:.24,transform:`rotateX(${x+790*direction}deg) rotateY(${y-790}deg) rotateZ(520deg)`},
  {offset:.48,transform:`rotateX(${x+540*direction}deg) rotateY(${y-525}deg) rotateZ(350deg)`},
  {offset:.72,transform:`rotateX(${x+250*direction}deg) rotateY(${y-240}deg) rotateZ(160deg)`},
  {offset:.88,transform:`rotateX(${x+42*direction}deg) rotateY(${y-36}deg) rotateZ(12deg)`},
  {offset:1,transform:`rotateX(${x}deg) rotateY(${y}deg) rotateZ(0deg)`}
 ];
}
function bounceFrames(i){const s=i%2===0?1:-1;return [
 {offset:0,transform:`translate(${-4*s}px,-28px)`,opacity:.98},
 {offset:.26,transform:`translate(${5*s}px,-2px)`,opacity:1},
 {offset:.46,transform:`translate(${-3*s}px,-17px)`},
 {offset:.72,transform:`translate(${2*s}px,-4px)`},
 {offset:1,transform:'translate(0,0)'}
 ];}
window.ChinMotion={duration:DURATION,spinFrames,play(track,rolling){
 const nodes=[...track.querySelectorAll('.die-position')];
 const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches??false;
 const animations=[];
 nodes.forEach((node,i)=>{
  const cube=node.querySelector('.die-cube');if(!cube)return;
  for(const el of [node,cube])el.getAnimations?.().forEach(a=>a.cancel());
  // A CSS fallback remains available if Web Animations API is unavailable.
  node.classList.remove('rolling');
  if(!rolling)return;
  if(reduced)return;
  const endX=parseFloat(node.style.getPropertyValue('--endX'))||0;
  const endY=parseFloat(node.style.getPropertyValue('--endY'))||0;
  if(typeof cube.animate==='function'){
   animations.push(cube.animate(spinFrames(endX,endY,i),{duration:DURATION,fill:'forwards',easing:'ease-out'}));
   if(typeof node.animate==='function')animations.push(node.animate(bounceFrames(i),{duration:DURATION,fill:'none',easing:'ease-out'}));
   node.dataset.motion='3d-spin';
  }else{
   node.classList.add('rolling');node.dataset.motion='3d-spin-css';
  }
 });
 this.finished=Promise.all(animations.map(a=>a.finished.catch(()=>{})));
 return this.finished;
}};
})();
