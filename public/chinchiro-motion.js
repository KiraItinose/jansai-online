/* 雀彩: match dice motion, called synchronously by the real game renderChinchiro().
   Animation only. Game-committed dice and score are never modified. */
(()=>{'use strict';
const DURATION=3100;
const PIPS={1:[5],2:[1,9],3:[1,5,9],4:[1,3,7,9],5:[1,3,5,7,9],6:[1,3,4,6,7,9]};
const VALUES={'0,0':1,'-90,0':2,'0,-90':3,'0,90':4,'90,0':5,'0,180':6};
const runs=new WeakMap();
function pipHTML(n){return PIPS[n].map(p=>`<span class="jan-match-pip${n===1?' red':''}" style="grid-row:${Math.ceil(p/3)};grid-column:${(p-1)%3+1}"></span>`).join('');}
function styleOnce(){
 if(!document.head||document.getElementById('jan-match-dice-style'))return;
 const style=document.createElement('style');style.id='jan-match-dice-style';
 style.textContent=`
#chinchiroOverlay .die-position{position:relative!important;transform-style:preserve-3d}
#chinchiroOverlay .jan-match-face{box-sizing:border-box;position:absolute;inset:0;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);padding:6px;border:1px solid #d7d3c9;border-radius:7px;background:linear-gradient(130deg,#fff,#e5e5e1 70%,#c8c9c3);box-shadow:inset -3px -3px 5px #b3b7b3,inset 2px 2px 4px #fff,0 2px 5px #0005;z-index:10;pointer-events:none}
#chinchiroOverlay .jan-match-pip{width:clamp(5px,1.2vw,9px);height:clamp(5px,1.2vw,9px);border-radius:50%;background:radial-gradient(circle at 35% 25%,#454b56,#111b21 70%);box-shadow:inset 1px 1px 2px #0006;align-self:center;justify-self:center}
#chinchiroOverlay .jan-match-pip.red{background:radial-gradient(circle at 40% 25%,#eb6e59,#9b1715 70%)}
#chinchiroOverlay.chin-rolling .jan-match-face{display:none!important}
#chinchiroOverlay:not(.chin-rolling) .die-position .die-cube{visibility:hidden!important;animation:none!important}
#chinchiroOverlay:not(.chin-rolling) .jan-match-face{display:grid!important}
#chinchiroOverlay.chin-rolling .die-position .die-cube{visibility:visible!important;animation:none!important}
@keyframes janMatchSpinFallback{0%{transform:rotateX(calc(var(--endX) + 1080deg)) rotateY(calc(var(--endY) - 900deg)) rotateZ(720deg)}100%{transform:rotateX(var(--endX)) rotateY(var(--endY)) rotateZ(0deg)}}
#chinchiroOverlay.chin-rolling .die-position.jan-motion-fallback .die-cube{animation:janMatchSpinFallback 3.1s ease-out both!important}
`;
 document.head.append(style);
}
function attach(track){
 const nodes=[...track.querySelectorAll('.die-position')];
 return nodes.map(node=>{
  const cube=node.querySelector('.die-cube');
  if(!cube)return {node,cube:null,x:0,y:0};
  for(const element of [node,cube])element.getAnimations?.().forEach(a=>{try{a.cancel()}catch{}});
  node.classList.remove('rolling','jan-motion-fallback');
  for(const name of ['position','left','top','margin','transform'])node.style.removeProperty(name);
  cube.style.setProperty('animation','none','important');
  const x=parseFloat(node.style.getPropertyValue('--endX'))||0,y=parseFloat(node.style.getPropertyValue('--endY'))||0;
  if(!node.querySelector('.jan-match-face')){
   const face=document.createElement('div');face.className='jan-match-face';
   const result=VALUES[`${x},${y}`]||1;
   face.setAttribute('role','img');face.setAttribute('aria-label',`${result}の目`);
   face.innerHTML=pipHTML(result);node.append(face);
  }
  return {node,cube,x,y};
 });
}
function stop(track){const run=runs.get(track);if(run){if(run.frame)cancelAnimationFrame(run.frame);run.resolve?.();runs.delete(track)}}
function play(track,rolling){
 if(!track)return Promise.resolve();styleOnce();stop(track);
 const dice=attach(track);
 if(!rolling)return Promise.resolve();
 const root=track.closest?.('#chinchiroOverlay');
 if(typeof requestAnimationFrame!=='function'){
  for(const d of dice)d.node.classList.add('jan-motion-fallback');
  return Promise.resolve();
 }
 let finish;
 const completed=new Promise(resolve=>{finish=resolve});
 const state={frame:0,resolve:finish};runs.set(track,state);
 let start=null;
 function frame(now){
  if(runs.get(track)!==state)return;
  if(root&&(!root.isConnected||!root.classList.contains('chin-rolling'))){stop(track);return}
  if(start===null)start=now;
  const t=Math.min(1,(now-start)/DURATION),ease=1-Math.pow(1-t,3);
  dice.forEach(({cube,x,y},i)=>{
   if(!cube)return;
   const dir=i===1?-1:1;
   const rx=x+dir*1080*(1-ease),ry=y-900*(1-ease),rz=720*(1-ease);
   const bounce=Math.sin(t*Math.PI*6+i*.45)*10*(1-t);
   cube.style.setProperty('transform',`translate3d(0,${bounce.toFixed(2)}px,0) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) rotateZ(${rz.toFixed(2)}deg)`,'important');
  });
  if(t<1)state.frame=requestAnimationFrame(frame);
  else {state.frame=0;runs.delete(track);finish();}
 }
 state.frame=requestAnimationFrame(frame);
 return completed;
}
window.ChinMotion={duration:DURATION,play};
})();
