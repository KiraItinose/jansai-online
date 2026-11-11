/* 雀彩: dice render/animation and compact mobile match UI. No scoring or game-state mutation. */
(()=>{'use strict';
const $=(q,root=document)=>root.querySelector(q);
const PIPS={1:[5],2:[1,9],3:[1,5,9],4:[1,3,7,9],5:[1,3,5,7,9],6:[1,3,4,6,7,9]};
const ANGLES={'0,0':1,'-90,0':2,'0,-90':3,'0,90':4,'90,0':5,'0,180':6};
const states=new WeakMap();
const reduceMotion=root=>root.id!=='chinchiroPreview'&&!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
function flatMarkup(n){return PIPS[n].map(p=>`<span class="jan-flat-pip${n===1?' red':''}" style="grid-row:${Math.ceil(p/3)};grid-column:${(p-1)%3+1}"></span>`).join('');}
function readAngle(node,name){return Number.parseFloat(node.style.getPropertyValue(name))||0;}
function attachFlats(root){
  const nodes=[...root.querySelectorAll('.die-position')];
  for(const node of nodes){
    if(node.querySelector('.jan-die-flat'))continue;
    const x=readAngle(node,'--endX'),y=readAngle(node,'--endY');
    const value=ANGLES[`${x},${y}`]||1;
    const flat=document.createElement('div');flat.className='jan-die-flat';
    flat.setAttribute('aria-label',`${value}の目`);flat.innerHTML=flatMarkup(value);
    node.append(flat);
  }
  return nodes;
}
function stopAnimation(state){
  if(state?.frame)cancelAnimationFrame(state.frame);
  for(const cube of state?.cubes||[])cube.style.removeProperty('transform');
  if(state)state.frame=0;
}
function spin(root,nodes){
  const old=states.get(root);
  if(old&&(old.running||old.completed)&&old.nodes.length===nodes.length&&old.nodes.every((node,i)=>node===nodes[i]))return;
  stopAnimation(old);
  const cubes=nodes.map(n=>n.querySelector('.die-cube'));
  const state={nodes,cubes,running:true,completed:false,frame:0,begin:null};states.set(root,state);
  if(reduceMotion(root))return;
  const duration=3100;
  const tick=ts=>{
    if(!root.isConnected||!root.classList.contains('chin-rolling')){stopAnimation(state);state.running=false;return;}
    if(state.begin===null)state.begin=ts;
    const t=Math.min(1,(ts-state.begin)/duration),ease=1-(1-t)**2.6;
    for(let i=0;i<nodes.length;i++){
      const node=nodes[i],cube=cubes[i];if(!node.isConnected||!cube)continue;
      const x=readAngle(node,'--endX'),y=readAngle(node,'--endY');
      const direction=i===1?-1:1;
      const ax=x+direction*1080*(1-ease),ay=y-900*(1-ease),az=540*(1-ease);
      const lift=Math.sin(t*Math.PI*6+i*.45)*11*(1-t);
      cube.style.setProperty('transform',`translate3d(0,${lift.toFixed(2)}px,0) rotateX(${ax.toFixed(1)}deg) rotateY(${ay.toFixed(1)}deg) rotateZ(${az.toFixed(1)}deg)`,'important');
    }
    if(t<1)state.frame=requestAnimationFrame(tick);
    else {state.frame=0;state.running=false;state.completed=true;}
  };
  state.frame=requestAnimationFrame(tick);
}
function syncDice(root){
 if(!root||!root.isConnected)return;
 const nodes=attachFlats(root);
 const state=states.get(root);
 if(root.classList.contains('chin-rolling')&&!reduceMotion(root))spin(root,nodes);
 else if(state?.running||state?.frame){stopAnimation(state);state.running=false;}
}
function monitorDice(root){
 if(!root||root.dataset.janDiceObserved)return;
 root.dataset.janDiceObserved='1';
 const observer=new MutationObserver(()=>syncDice(root));
 observer.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden']});
 syncDice(root);
}
function setupDice(){
 monitorDice($('#chinchiroOverlay'));
 monitorDice($('#chinchiroPreview'));
 if(!$('#chinchiroPreview')){
  const onNew=new MutationObserver(()=>{const p=$('#chinchiroPreview');if(p){monitorDice(p);onNew.disconnect();}});
  onNew.observe(document.body,{childList:true});
 }
}
function setupMobileMatch(){
 if(!document.body.classList.contains('page-play')||$('#mobileGameToggle'))return;
 const dock=$('#toolDock'),display=$('#displayDock');if(!dock)return;
 const button=document.createElement('button');button.type='button';button.id='mobileGameToggle';button.textContent='⚙ 設定';button.setAttribute('aria-label','対局中の設定を開く');button.setAttribute('aria-expanded','false');
 const drawer=document.createElement('section');drawer.id='mobileGameDrawer';drawer.setAttribute('aria-label','対局中の設定');
 drawer.innerHTML='<div id="mobileGameHeading"><strong>対局中の設定</strong><button id="mobileGameClose" type="button" aria-label="設定を閉じる">閉じる ×</button></div><div id="mobileGameControls"></div>';
 document.body.append(button,drawer);
 const controls=$('#mobileGameControls');
 const zoomBox=document.createElement('label');zoomBox.className='mobile-zoom-control';
 zoomBox.innerHTML='<span>卓と手牌の大きさ</span><select id="mobileTableZoom" aria-label="スマホの卓と手牌の大きさ"><option value="1.35">標準</option><option value="1.55">大きめ（推奨）</option><option value="1.75">最大</option></select>';
 controls.append(zoomBox);
 const zoomSelect=zoomBox.querySelector('select');
 try{const stored=localStorage.getItem('jansai.mobile.tableZoom');if(['1.35','1.55','1.75'].includes(stored))zoomSelect.value=stored;else zoomSelect.value='1.55'}catch{zoomSelect.value='1.55'}
 zoomSelect.addEventListener('change',()=>{try{localStorage.setItem('jansai.mobile.tableZoom',zoomSelect.value)}catch{}window.dispatchEvent(new Event('resize'))});
 controls.append(dock);if(display)controls.append(display);
 const panel=$('#toolPanel'),toggle=$('#toolToggle'),close=$('#mobileGameClose');
 function shut(){document.body.classList.remove('mobile-sheet-open');button.setAttribute('aria-expanded','false');if(panel)panel.hidden=true;if(toggle)toggle.setAttribute('aria-expanded','false');if(display)display.open=false;}
 function open(){if(!document.body.classList.contains('scene-live')&&!window.matchMedia('(max-width:1000px)').matches)return;document.body.classList.add('mobile-sheet-open');button.setAttribute('aria-expanded','true');if(panel)panel.hidden=false;if(toggle)toggle.setAttribute('aria-expanded','true');}
 button.addEventListener('click',()=>document.body.classList.contains('mobile-sheet-open')?shut():open());
 close.addEventListener('click',shut);
 drawer.addEventListener('click',event=>{if(event.target===drawer)shut();});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&document.body.classList.contains('mobile-sheet-open'))shut();});
 window.matchMedia('(min-width:1001px)').addEventListener?.('change',event=>{if(event.matches)shut();});
}
function boot(){setupDice();setupMobileMatch();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
