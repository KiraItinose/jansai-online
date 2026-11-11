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
 // The match renderer calls ChinMotion.play() directly; avoid competing animation loops.
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
 zoomBox.innerHTML='<span>卓の見える範囲</span><select id="mobileTableZoom" aria-label="スマホの卓の見える範囲"><option value="1.04">卓全体</option><option value="1.12">標準（推奨）</option><option value="1.20">近くから見る</option></select>';
 controls.append(zoomBox);
 const zoomSelect=zoomBox.querySelector('select');
 try{
   const stored=localStorage.getItem('jansai.mobile.tableZoom');
   const legacy={'1.16':'1.04','1.30':'1.12','1.44':'1.20','1.35':'1.04','1.55':'1.12','1.75':'1.20'};
   zoomSelect.value=['1.04','1.12','1.20'].includes(stored)?stored:(legacy[stored]||'1.12');
 }catch{zoomSelect.value='1.12'}
 zoomSelect.addEventListener('change',()=>{try{localStorage.setItem('jansai.mobile.tableZoom',zoomSelect.value)}catch{}window.dispatchEvent(new Event('resize'))});
 controls.append(dock);if(display)controls.append(display);
 // Fullscreen is an opt-in user gesture; never hide system UI automatically.
 if(typeof document.documentElement.requestFullscreen==='function'){
   const fullscreen=document.createElement('button');fullscreen.type='button';fullscreen.id='mobileFullscreenToggle';
   const updateFullscreen=()=>{fullscreen.textContent=document.fullscreenElement?'全画面を終了':'全画面で遊ぶ';fullscreen.setAttribute('aria-pressed',String(!!document.fullscreenElement))};
   fullscreen.addEventListener('click',async()=>{
     try{
       if(document.fullscreenElement)await document.exitFullscreen();
       else{
         await document.documentElement.requestFullscreen();
         try{await screen.orientation?.lock?.('landscape')}catch{}
       }
       updateFullscreen();
     }catch{fullscreen.textContent='このブラウザでは全画面にできません'}
   });
   document.addEventListener('fullscreenchange',updateFullscreen);
   updateFullscreen();controls.prepend(fullscreen);
 }
 const panel=$('#toolPanel'),toggle=$('#toolToggle'),close=$('#mobileGameClose');
 function shut(){document.body.classList.remove('mobile-sheet-open');button.setAttribute('aria-expanded','false');if(panel)panel.hidden=true;if(toggle)toggle.setAttribute('aria-expanded','false');if(display)display.open=false;}
 function open(){if(!document.body.classList.contains('scene-live')&&!window.matchMedia('(max-width:1000px)').matches)return;document.body.classList.add('mobile-sheet-open');button.setAttribute('aria-expanded','true');if(panel)panel.hidden=false;if(toggle)toggle.setAttribute('aria-expanded','true');}
 button.addEventListener('click',()=>document.body.classList.contains('mobile-sheet-open')?shut():open());
 close.addEventListener('click',shut);
 drawer.addEventListener('click',event=>{if(event.target===drawer)shut();});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&document.body.classList.contains('mobile-sheet-open'))shut();});
 window.matchMedia('(min-width:1001px)').addEventListener?.('change',event=>{if(event.matches)shut();});
}
function setupMobileTopAndQuick(){
 if(!document.body.classList.contains('page-play')||document.querySelector('#mobileTopControls'))return;
 const rule=$('#ruleSummary'),help=$('#rightPane .rules'),exit=$('#returnSetup');
 if(!rule||!help||!exit)return;
 const bar=document.createElement('nav');bar.id='mobileTopControls';bar.setAttribute('aria-label','対局中のメニュー');
 bar.innerHTML='<button type="button" id="mobileRuleButton" aria-expanded="false" aria-controls="ruleSummary">ルール</button><button type="button" id="mobileHelpButton" aria-expanded="false" aria-controls="mobileHelpContent" aria-label="操作方法と特殊ルール">？</button><button type="button" id="mobileExitButton" aria-label="対局終了・戻る">×</button>';
 document.body.append(bar);
 help.id='mobileHelpContent';
 const ruleBtn=bar.querySelector('#mobileRuleButton'),helpBtn=bar.querySelector('#mobileHelpButton');
 const sync=()=>{ruleBtn.setAttribute('aria-expanded',String(rule.open));helpBtn.setAttribute('aria-expanded',String(help.open));};
 function closeMenu(){rule.open=false;help.open=false;sync();}
 ruleBtn.addEventListener('click',()=>{const desired=!rule.open;closeMenu();rule.open=desired;sync();});
 helpBtn.addEventListener('click',()=>{const desired=!help.open;closeMenu();help.open=desired;sync();});
 bar.querySelector('#mobileExitButton').addEventListener('click',()=>exit.click());
 rule.addEventListener('toggle',sync);help.addEventListener('toggle',sync);
 document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu()});
 const landscape=window.matchMedia('(max-width:1000px) and (orientation:landscape)');
 const originalParent=rule.parentNode,originalSibling=rule.nextSibling;
 const arrangeRule=()=>{
   // A hidden mobile sidebar must not hide the rule popover. Restore the DOM on desktop.
   if(landscape.matches){
     if(rule.parentNode!==document.body)document.body.append(rule);
     closeMenu();
   }else if(rule.parentNode!==originalParent){
     if(originalSibling?.parentNode===originalParent)originalParent.insertBefore(rule,originalSibling);
     else originalParent.append(rule);
   }
 };
 arrangeRule();landscape.addEventListener?.('change',arrangeRule);
 const quick=document.createElement('div');quick.id='mobileQuickControls';quick.setAttribute('role','group');quick.setAttribute('aria-label','対局中の切替');
 for(const key of ['autoWin','calls','waits']){
   const source=document.querySelector('#toolPanel [data-toggle="'+key+'"]');
   if(!source)continue;
   const b=document.createElement('button');b.type='button';b.className='mobile-quick-toggle';b.dataset.toggle=key;
   const refresh=()=>{
     const label={autoWin:'和了',calls:'鳴き',waits:'待ち'}[key];
     const off=/OFF|無効/.test(source.textContent);
     b.replaceChildren();
     const name=document.createElement('span'),state=document.createElement('small');
     name.textContent=label;state.textContent=off?'OFF':'ON';
     b.append(name,state);
     b.setAttribute('aria-label',label+' '+state.textContent);
     b.dataset.state=off?'off':'on';b.setAttribute('aria-pressed',String(!off));
   };
   b.addEventListener('click',()=>{source.click();queueMicrotask(refresh)});
   new MutationObserver(refresh).observe(source,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['aria-pressed','class']});
   refresh();quick.append(b);
 }
 document.body.append(quick);
}
function boot(){setupDice();setupMobileMatch();setupMobileTopAndQuick();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
