(()=>{'use strict';
 const compact=matchMedia('(max-width:1000px)'),play=document.body.classList.contains('page-play');
 if(play){const notice=document.createElement('div');notice.id='phoneNotice';notice.textContent='横向きにすると、牌と操作ボタンが大きく表示されます';document.body.append(notice);const fit=()=>{if(compact.matches)document.querySelector('#ruleSummary')?.removeAttribute('open')};fit();compact.addEventListener?.('change',fit)}
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
