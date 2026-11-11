(()=>{'use strict';
 const compact=matchMedia('(max-width:1000px)'),play=document.body.classList.contains('page-play');
 if(play){const notice=document.createElement('div');notice.id='phoneNotice';notice.textContent='横向きにすると、牌と操作ボタンが大きく表示されます';document.body.append(notice);const fit=()=>{if(compact.matches)document.querySelector('#ruleSummary')?.removeAttribute('open')};fit();compact.addEventListener?.('change',fit)}
 // The kuikae restriction remains in game logic; hide only its redundant explanation.
 if(play){
  const help=document.querySelector('#rightPane .rules .help-scroll');
  if(help){
   for(const section of help.querySelectorAll('.help-block')){
    if(section.querySelector('h3')?.textContent.includes('喰い替えなし'))section.remove();
   }
   for(const title of help.querySelectorAll('.help-block h3')){
    if(title.textContent.startsWith('⑥ チンチロ'))title.textContent=title.textContent.replace('⑥','⑤');
    if(title.textContent.startsWith('⑦ 操作の補足'))title.textContent=title.textContent.replace('⑦','⑥');
   }
  }
  const ruleText=document.querySelector('#ruleText');
  if(ruleText){
   const hideLine=()=>{
    for(const line of ruleText.querySelectorAll('.rule-line')){
     if(line.querySelector('span')?.textContent.trim()==='喰い替え')line.remove();
    }
   };
   hideLine();new MutationObserver(hideLine).observe(ruleText,{childList:true});
  }
 }

/* A safe dice-only visual preview on the room setup page. No scores or game engine involved. */
if(!play&&document.querySelector('#cc')&&!document.querySelector('#previewChinBtn')){
 const setting=document.querySelector('#cc');
 const trigger=document.createElement('button');
 trigger.id='previewChinBtn';trigger.type='button';trigger.textContent='サイコロ回転を試す（プレビュー）';
 setting.closest('label')?.after(trigger);
 const dialog=document.createElement('dialog');dialog.id='chinchiroPreview';
 dialog.setAttribute('aria-label','チンチロ回転プレビュー');
 dialog.innerHTML='<h2 class="chin-title">チンチロ演出プレビュー</h2><p class="chin-sub">実際の対局や点数には影響しません</p><div class="chin-bowl"><div class="dice-track" id="previewDice"></div></div><strong class="chin-result" id="previewResult" role="status"></strong><div class="preview-actions"><button type="button" id="previewAgain">もう一度回す</button><button type="button" id="previewClose">閉じる</button></div>';
 document.body.append(dialog);
 const pips={1:[5],2:[1,9],3:[1,5,9],4:[1,3,7,9],5:[1,3,5,7,9],6:[1,3,4,6,7,9]};
 const faces=[['front',1],['back',6],['right',3],['left',4],['top',2],['bottom',5]];
 const rot={1:[0,0],2:[-90,0],3:[0,-90],4:[0,90],5:[90,0],6:[0,180]};
 const die=n=>'<div class="die-position" style="--endX:'+rot[n][0]+'deg;--endY:'+rot[n][1]+'deg"><div class="die-cube">'+faces.map(([side,value])=>'<div class="die-face '+side+'">'+pips[value].map(p=>'<span class="spot" style="grid-row:'+Math.ceil(p/3)+';grid-column:'+((p-1)%3+1)+'"></span>').join('')+'</div>').join('')+'</div></div>';
 let generation=0;
 const spin=()=>{
  const id=++generation,track=dialog.querySelector('#previewDice'),values=[1,3,5];
  dialog.classList.remove('chin-rolling');
  track.innerHTML=values.map(die).join('');
  dialog.querySelector('#previewResult').textContent='サイコロ回転中…';
  void track.offsetWidth;
  dialog.classList.add('chin-rolling');
  setTimeout(()=>{if(generation!==id||!dialog.open)return;dialog.classList.remove('chin-rolling');dialog.querySelector('#previewResult').textContent='出目：1・3・5（表示テスト）';},3400);
 };
 trigger.onclick=()=>{if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');spin()};
 dialog.querySelector('#previewAgain').onclick=spin;
 dialog.querySelector('#previewClose').onclick=()=>{generation++;if(typeof dialog.close==='function')dialog.close();else dialog.removeAttribute('open')};
 dialog.addEventListener('close',()=>{generation++;dialog.classList.remove('chin-rolling')});
}
 if(!play){const bottom=document.querySelector('.lobby-bottom')||document.body;const button=document.createElement('button');button.id='pwaInstall';button.type='button';button.textContent='ホーム画面に追加';button.hidden=true;const status=document.createElement('p');status.id='pwaStatus';bottom.append(button,status);let prompt;
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();prompt=e;button.hidden=false});button.onclick=async()=>{if(!prompt)return;await prompt.prompt();await prompt.userChoice;prompt=null;button.hidden=true};
 window.addEventListener('appinstalled',()=>{button.hidden=true;status.textContent='ホーム画面から雀彩を開けます'});
 if(location.protocol==='file:')status.textContent='PCではこのまま遊べます。スマホへの追加は公開URLから行います。';
 else if(/iPhone|iPad|iPod/.test(navigator.userAgent)&&!matchMedia('(display-mode: standalone)').matches)status.textContent='Safariの共有メニュー → ホーム画面に追加で、アプリとして開けます。';
 }
 if((location.protocol==='https:'||['localhost','127.0.0.1'].includes(location.hostname))&&'serviceWorker' in navigator){
 navigator.serviceWorker.register('sw.js').then(reg=>{const status=document.querySelector('#pwaStatus');const report=()=>{if(reg.waiting&&status)status.textContent='更新版があります。対局を終えて雀彩の画面をすべて閉じ、開き直すと反映されます。'};report();reg.addEventListener('updatefound',()=>reg.installing?.addEventListener('statechange',report));navigator.serviceWorker.ready.then(()=>{if(status&&!status.textContent)status.textContent='オフライン起動の準備ができました。対局中の状態は、画面を閉じると保存されません。'})}).catch(()=>{const status=document.querySelector('#pwaStatus');if(status)status.textContent='オフライン起動を準備できませんでした。オンラインで再度開いてください。'});
 }
})();
