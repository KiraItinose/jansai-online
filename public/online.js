(()=>{'use strict';
// 雀彩 Cloudflare WebSocket client / protocol 2
const $=s=>document.querySelector(s), P=2, ALPH='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const secureRandom=n=>Array.from(crypto.getRandomValues(new Uint8Array(n)),v=>ALPH[v%ALPH.length]).join('');
const readPayload=()=>{try{return JSON.parse(decodeURIComponent(location.hash.slice(1)))}catch{return null}};
let payload=readPayload();
if(!payload||typeof payload.host!=='boolean'){
 const code=new URLSearchParams(location.search).get('room');
 if(!code){location.replace('index.html');return}
 const name=prompt('雀彩で表示するプレイヤー名（8文字まで）','プレイヤー');
 if(name===null){location.replace('index.html');return}
 payload={host:false,code:code.toUpperCase(),name:String(name).slice(0,8)};
}
const host=!!payload.host,name=String(payload.name||'プレイヤー').trim().slice(0,8)||'プレイヤー';
const code=host?secureRandom(8):String(payload.code||'').toUpperCase();
function status(s){$('#status').textContent=s;$('#connection').textContent=s}
if(!/^[A-HJ-NP-Z2-9]{8}$/.test(code)){status('卓コードが正しくありません');return}
let token;try{token=sessionStorage.getItem('jansai.cf.token.'+code);if(!token){token=secureRandom(32);sessionStorage.setItem('jansai.cf.token.'+code,token)}}catch{token=secureRandom(32)}
let config=payload.config||{},ws=null,closed=false,joined=false,connected=false,started=false,frameReady=false;
let roster=null,matchId=null,seat=-1,lastViews=null,lastGuestState=null,lastSeq=-1,retryCount=0,retryTimer=null,sendQueueViews=null;
let wasConnected=false,canRetry=true;
const wsUrl=()=>`${location.protocol==='https:'?'wss':'ws'}://${location.host}/api/room/${code}`;
const inviteUrl=()=>{const url=new URL('online.html',location.href);url.search='';url.hash='';url.searchParams.set('room',code);return url.href};
function selectInviteUrl(){const field=$('#inviteUrl');field.focus({preventScroll:true});field.select();field.setSelectionRange?.(0,field.value.length)}
function send(obj){if(ws?.readyState===WebSocket.OPEN){try{ws.send(JSON.stringify({v:P,...obj}));return true}catch{}}return false}
function lobby(players){
 $('#codeRow').hidden=false;$('#code').textContent=code;$('#inviteUrl').value=inviteUrl();
 $('#players').replaceChildren();
 for(let i=0;i<4;i++){
  const m=players[i],el=document.createElement('div');el.className='player'+(m&&!m.connected?' offline':'');
  const title=document.createElement('strong');title.textContent=m?m.name:'CPU';
  const detail=document.createElement('small');detail.textContent=m?(m.id==='host'?'ホスト'+(m.connected?'':'（切断）'):m.connected?'参加中':'再接続待ち'):'開始時に参加';
  el.append(title,detail);$('#players').append(el);
 }
 $('#rules').textContent=`${config.rounds===8?'半荘戦':config.rounds===1?'一局勝負':'東風戦'} ／ ${config.thinkBase??15}秒＋${config.thinkBank??20}秒 ／ チンチロ${config.chin?'あり':'なし'}`;
 $('#start').hidden=!host;
 $('#start').disabled=players.filter(m=>m.connected).length<2 || !connected;
 status(host?'卓コード・招待リンクを仲間に伝えてください':'入室しました。ホストの開始を待っています');
}
function post(m){$('#table').contentWindow?.postMessage({jansai:true,...m},location.origin)}
function launch(players,mySeat,id){
 if(started&&matchId===id)return;
 started=true;matchId=id;roster=players;seat=mySeat;frameReady=false;lastSeq=-1;lastGuestState=null;
 $('#lobby').hidden=true;$('#bar').hidden=false;$('#table').hidden=false;
 $('#table').src='jansuno-play-v0.5.7.html#'+encodeURIComponent(JSON.stringify({role:'online',host,name,config,seat,players}));
 $('#table').inert=!host;
 status('卓 '+code+' ／ 対局準備中');
}
function scheduleRetry(){
 if(closed||!canRetry)return;
 if(retryCount>=5){$('#retry').hidden=false;status('再接続できません。ネット接続を確認して「再接続」を押してください');return}
 retryCount++;status('通信が切れました。再接続中（'+retryCount+'/5）…');
 clearTimeout(retryTimer);retryTimer=setTimeout(connect,Math.min(10000,1500*retryCount));
}
function connect(){
 if(closed)return;
 if(location.protocol!=='https:'&&location.hostname!=='localhost'&&location.hostname!=='127.0.0.1'){
  status('オンライン対戦はHTTPS公開URL、またはlocalhostから利用してください');return;
 }
 clearTimeout(retryTimer);
 if(ws && (ws.readyState===WebSocket.CONNECTING||ws.readyState===WebSocket.OPEN))return;
 status('Cloudflareの卓へ接続しています…');
 let socket;try{socket=new WebSocket(wsUrl())}catch{scheduleRetry();return}
 ws=socket;joined=false;connected=false;
 const loginTimeout=setTimeout(()=>{if(ws===socket&&!joined)socket.close()},16000);
 socket.onopen=()=>{if(ws!==socket)return;send({type:'hello',mode:host?'host':'guest',name,token,config:host?config:undefined,resumeMatchId:host&&started?matchId:null})};
 socket.onmessage=e=>{
  if(ws!==socket)return;
  if(e.data==='pong')return;
  let m;try{m=JSON.parse(e.data)}catch{return}
  if(m.v!==P)return;
  if(m.type==='error'){
   canRetry=false;clearTimeout(loginTimeout);status(m.text||'入室できませんでした');$('#retry').hidden=true;
   try{socket.close()}catch{};return;
  }
  if(m.type==='lobby'||m.type==='start'){
   clearTimeout(loginTimeout);joined=true;connected=true;wasConnected=true;retryCount=0;$('#retry').hidden=true;
   if(m.config)config=m.config;
  }
  if(m.type==='lobby')lobby(m.players);
  else if(m.type==='start'){
   const unchanged=started&&matchId===m.matchId;
   launch(m.players,m.seat,m.matchId);
   if(unchanged&&host&&lastViews)send({type:'views',views:lastViews});
  }
  else if(m.type==='presence'){
   if(!started&&m.players)lobby(m.players);
   if(started&&!m.hostOnline)status('ホストが切断中です。復帰を待っています');
   else if(started&&m.hostOnline)status('卓 '+code+' ／ 接続中');
  }
  else if(m.type==='state'&&started&&m.matchId===matchId&&Number.isSafeInteger(m.seq)&&m.seq>=lastSeq){
   lastSeq=m.seq;lastGuestState=m.state;
   if(frameReady)post({type:'state',state:m.state});
   $('#table').inert=false;status('卓 '+code+' ／ 接続中');
  }
  else if(m.type==='action'&&host&&started&&Number.isInteger(m.seat)){
   post({type:'action',seat:m.seat,id:m.id,v:m.value});
  }
  else if(m.type==='option'&&host&&started){post({type:'option',seat:m.seat,key:m.key,value:m.value})}
  else if(m.type==='notice')status(m.text);
 };
 socket.onerror=()=>{if(ws===socket&&!joined)status('通信接続でエラーが発生しました')};
 socket.onclose=()=>{
  clearTimeout(loginTimeout);
  if(ws!==socket||closed)return;
  connected=false;joined=false;
  if(!host)$('#table').inert=true;
  if(!started&&wasConnected)status('接続が切れました');
  scheduleRetry();
 };
}
window.addEventListener('message',e=>{
 if(e.origin!==location.origin||e.source!==$('#table').contentWindow||!e.data?.jansai)return;
 const m=e.data;
 if(m.type==='ready'){
  frameReady=true;
  if(!host&&lastGuestState)post({type:'state',state:lastGuestState});
 }else if(host&&m.type==='views'&&Array.isArray(m.views)){
  lastViews=m.views;
  // Short burst coalescing: keeps most recent snapshots, including pending decisions.
  if(!sendQueueViews)sendQueueViews=setTimeout(()=>{sendQueueViews=null;if(connected)send({type:'views',views:lastViews})},80);
 }else if(!host&&m.type==='action')send({type:'action',id:m.id,value:m.v});
 else if(!host&&m.type==='option')send({type:'option',key:m.key,value:m.value});
 else if(m.type==='leave')leave();
 else if(m.type==='failure')status('麻雀の進行を続けられません。退室して新しい卓を作ってください');
});
function leave(){
 if(started&&!confirm(host?'退室するとホストの対局が終了します。退室しますか？':'退室しますか？ 切断中は時間切れの自動操作で進みます'))return;
 closed=true;clearTimeout(retryTimer);clearTimeout(sendQueueViews);try{ws?.close()}catch{}location.href='index.html';
}
$('#start').onclick=()=>{if(host&&!started&&connected)send({type:'start'})};
$('#back').onclick=leave;$('#exit').onclick=leave;
$('#retry').onclick=()=>{if(ws?.readyState===WebSocket.OPEN)try{ws.close()}catch{};canRetry=true;retryCount=0;connect()};
$('#inviteUrl').addEventListener('click',selectInviteUrl);
$('#inviteUrl').addEventListener('focus',e=>e.currentTarget.select());
$('#copy').onclick=async()=>{
 const field=$('#inviteUrl');field.value=inviteUrl();
 // Synchronous fallback first: keeps the user gesture in browsers that block the modern API.
 let copied=false;
 try{selectInviteUrl();copied=document.execCommand?.('copy')===true}catch{}
 if(!copied&&navigator.clipboard?.writeText){
  try{await navigator.clipboard.writeText(field.value);copied=true}catch{}
 }
 if(copied){
  $('#copy').textContent='コピーしました';
  $('#copyStatus').textContent='招待URLをコピーしました。友人に送ってください。';
 }else{
  $('#copyStatus').textContent='自動コピーが許可されませんでした。選択中のURLをCtrl+Cでコピーしてください（スマホは長押し→コピー）。';
  selectInviteUrl();
 }
};
$('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();try{await screen.orientation.lock('landscape')}catch{}}catch{status('全画面非対応です。画面を横向きにしてください')}};
window.addEventListener('beforeunload',e=>{if(started&&!closed){e.preventDefault();e.returnValue=''}});
// Cloudflare's WebSocket auto-response handles ping without waking the object.
setInterval(()=>{if(ws?.readyState===WebSocket.OPEN)try{ws.send('ping')}catch{}},25000);
if(location.protocol==='file:'){status('オンライン対戦はCloudflareの公開URLから利用してください');return}
connect();
})();
