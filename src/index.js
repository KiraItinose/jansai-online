import { DurableObject } from 'cloudflare:workers';

// 雀彩 v0.5.7 / Cloudflare transport (schema v2).
// The original mahjong engine still runs on the host's device.
// A Durable Object owns membership, private seat-view delivery and the latest saved views.
const PROTOCOL = 2;
// html_handling='none' preserves .html names but does not map '/' to index.html.
// Resolve the root and previously canonicalized extensionless pages explicitly.
const PAGE_ALIASES = Object.freeze({
  '/': '/index.html',
  '/index': '/index.html',
  '/online': '/online.html',
  '/room.html': '/jansuno-room-v0.5.7.html',
  '/play.html': '/jansuno-play-v0.5.7.html',
  '/jansuno-room-v0.5.7': '/jansuno-room-v0.5.7.html',
  '/jansuno-play-v0.5.7': '/jansuno-play-v0.5.7.html',
});
const CODE = /^[A-HJ-NP-Z2-9]{8}$/;
const TOKEN = /^[A-HJ-NP-Z2-9]{32}$/;
const MAX_MESSAGE = 750_000;
const MAX_VIEW = 280_000;
const ROOM_TTL_MS = 6 * 60 * 60 * 1000;
const CLEANUP_AFTER_MS = 24 * 60 * 60 * 1000;
const def = { hand:13, rounds:4, yaku:true, west:false, extend:true, free:3, chin:false, near:0, start:25000, target:30000, tobi:true, thinkBase:15, thinkBank:20 };
const safeName = value => String(value ?? '').trim().slice(0, 8) || 'プレイヤー';
const plain = (obj, allowed) => Object.fromEntries(Object.entries(obj || {}).filter(([k]) => allowed.includes(k)));
function normalizeConfig(input) {
  const out = { ...def };
  if (!input || typeof input !== 'object' || Array.isArray(input)) return out;
  for (const key of ['yaku','west','extend','chin','tobi']) if (typeof input[key] === 'boolean') out[key] = input[key];
  const valid = {hand:[7,10,13],rounds:[1,4,8],free:[0,1,2,3],near:[0,1],start:[20000,25000,30000],target:[25000,30000,35000,40000],thinkBase:[8,15,30,60,300],thinkBank:[0,12,20,30,60]};
  for (const [key, values] of Object.entries(valid)) if (Number.isInteger(input[key]) && values.includes(input[key])) out[key] = input[key];
  return out;
}
const json = (data, status=200) => new Response(JSON.stringify(data), {status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
function tell(ws, body) { try { if (ws?.readyState === 1) ws.send(JSON.stringify({v:PROTOCOL,...body})); } catch {} }
async function tokenHash(token) {
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), n=>n.toString(16).padStart(2,'0')).join('');
}
function safeView(v, seat) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  if (!Array.isArray(v.H) || v.H.length !== 4 || !v.H.every((hand,i)=>Array.isArray(hand) && hand.length<=18 && (i===seat || hand.every(t=>t===null)))) return false;
  if (v.pr && typeof v.pr==='object' && v.pr.seat!==seat && v.pr.seat!==-2) return false;
  for (const forbidden of ['w','rin','ura','pend','tm','hum','DD','ip']) if (Object.hasOwn(v, forbidden)) return false;
  return JSON.stringify(v).length < MAX_VIEW;
}
function randomId(bytes=12) {return Array.from(crypto.getRandomValues(new Uint8Array(bytes)),v=>v.toString(16).padStart(2,'0')).join('');}
function shuffle(list) {for(let i=list.length-1;i>0;i--){const j=crypto.getRandomValues(new Uint32Array(1))[0]%(i+1);[list[i],list[j]]=[list[j],list[i]];}return list;}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/health') return json({ok:true,service:'jansai-online',protocol:PROTOCOL});
    const target = PAGE_ALIASES[url.pathname];
    if (target) {
      const assetUrl = new URL(url);
      assetUrl.pathname = target;
      return env.ASSETS.fetch(new Request(assetUrl, request));
    }
    const match = /^\/api\/room\/([^/]+)$/.exec(url.pathname);
    if (!match) return env.ASSETS.fetch(request);
    if (!CODE.test(match[1])) return json({error:'卓コードが正しくありません'},400);
    if (request.method !== 'GET' || request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return json({error:'WebSocket専用です'},426);
    if (request.headers.get('Origin') !== url.origin) return json({error:'接続元が許可されていません'},403);
    const id = env.ROOMS.idFromName(match[1]);
    return env.ROOMS.get(id).fetch(request);
  }
};

export class JansaiRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.queue = Promise.resolve();
    // Keep idle WebSocket sessions without charging compute duration continuously.
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping','pong'));
  }
  async fetch(request) {
    if (this.ctx.getWebSockets().length >= 8) return json({error:'接続数が多すぎます'},429);
    const sockets = new WebSocketPair();
    const [client,server] = Object.values(sockets);
    this.ctx.acceptWebSocket(server);
    return new Response(null,{status:101,webSocket:client});
  }
  live() {return this.ctx.getWebSockets().filter(ws=>ws.readyState===1 && ws.deserializeAttachment()?.id);}
  connected(memberId) {return this.live().some(ws=>ws.deserializeAttachment()?.id===memberId);}
  lobbyPlayers(room) {return room.members.map(m=>({id:m.id,name:m.name,connected:this.connected(m.id)}));}
  broadcast(body) {for(const ws of this.live()) tell(ws,body);}
  notifyLobby(room) {this.broadcast({type:'lobby',players:this.lobbyPlayers(room),config:room.config});}
  async getRoom() {
    const room = await this.ctx.storage.get('room');
    if (room && room.status==='waiting' && Date.now()-room.updated > ROOM_TTL_MS && !this.live().length) {
      await this.ctx.storage.deleteAll();return null;
    }
    return room || null;
  }
  async persist(room) {room.updated=Date.now();await this.ctx.storage.put('room',room);}
  async startMessage(ws,room) {
    const auth=ws.deserializeAttachment();
    const seat=room.roster.findIndex(m=>m.id===auth?.id);
    if (seat<0) return;
    tell(ws,{type:'start',players:room.roster,seat,config:room.config,matchId:room.matchId});
    const saved=await this.ctx.storage.get('views');
    if(saved?.matchId===room.matchId && saved.views?.[seat]) tell(ws,{type:'state',state:saved.views[seat],seq:saved.seq,matchId:room.matchId});
  }
  reject(ws,reason) {tell(ws,{type:'error',text:reason});try{ws.close(1008,'認証または卓の状態が不正です')}catch{}}
  async webSocketMessage(ws,raw) {
    this.queue=this.queue.then(()=>this.message(ws,raw)).catch(err=>{console.error('雀彩ルーム通信エラー',err);this.reject(ws,'通信処理でエラーが発生しました。再接続してください');});
    await this.queue;
  }
  async message(ws,raw) {
    if(typeof raw!=='string' || raw.length>MAX_MESSAGE){this.reject(ws,'送信内容が大きすぎます');return;}
    let msg;try{msg=JSON.parse(raw)}catch{this.reject(ws,'不正な通信形式です');return;}
    if(!msg || msg.v!==PROTOCOL){this.reject(ws,'アプリのバージョンが一致しません。再読み込みしてください');return;}
    let room=await this.getRoom();
    if(msg.type==='hello' && !ws.deserializeAttachment()) {
      if(!TOKEN.test(msg.token)||!['host','guest'].includes(msg.mode)){this.reject(ws,'参加情報が正しくありません');return;}
      const hash=await tokenHash(msg.token), name=safeName(msg.name);
      if (!room) {
        if(msg.mode!=='host'){this.reject(ws,'卓が見つかりません。ホストが卓を作成してから参加してください');return;}
        room={status:'waiting',hostHash:hash,members:[{id:'host',hash,name}],config:normalizeConfig(msg.config),created:Date.now(),updated:Date.now()};
        await this.persist(room);
        await this.ctx.storage.setAlarm(Date.now() + CLEANUP_AFTER_MS);
      }
      const isHost=room.hostHash===hash;
      if ((msg.mode==='host')!==isHost){this.reject(ws,'卓のホスト認証が一致しません。新しい卓コードで作成してください');return;}
      if (room.status==='playing' && isHost && msg.resumeMatchId!==room.matchId){this.reject(ws,'ホスト画面が再読み込みされました。現在の対局は続行できません。新しい卓を作成してください');return;}
      let member=room.members.find(m=>m.hash===hash);
      if (!member) {
        if(room.status!=='waiting'){this.reject(ws,'対局開始後の新規参加はできません');return;}
        if(room.members.length>=4){this.reject(ws,'満席です');return;}
        member={id:randomId(),hash,name};room.members.push(member);await this.persist(room);
      }
      // Same session reconnected: replace a dead/stale socket, never duplicate a seat.
      for(const old of this.live()) if(old!==ws && old.deserializeAttachment()?.id===member.id) try{old.close(4001,'新しい接続に切り替えました')}catch{}
      ws.serializeAttachment({id:member.id,role:isHost?'host':'guest'});
      if(room.status==='playing') await this.startMessage(ws,room);
      else this.notifyLobby(room);
      this.broadcast({type:'presence',hostOnline:this.connected('host'),players:this.lobbyPlayers(room)});
      return;
    }
    const auth=ws.deserializeAttachment();
    if(!auth?.id || !room){this.reject(ws,'最初に入室処理が必要です');return;}
    if(!room.members.some(m=>m.id===auth.id)){this.reject(ws,'この卓の参加者ではありません');return;}
    if(msg.type==='start') {
      if(auth.role!=='host'||room.status!=='waiting')return;
      const ready=room.members.filter(m=>this.connected(m.id));
      if(ready.length<2){tell(ws,{type:'notice',text:'2人以上集まると開始できます'});return;}
      room.roster=shuffle(ready.map(({id,name})=>({id,name})));
      while(room.roster.length<4)room.roster.push({id:null,name:'CPU-'+(room.roster.length+1)});
      room.matchId=randomId(12);room.status='playing';
      await this.ctx.storage.delete('views');await this.persist(room);
      for(const peer of this.live()) await this.startMessage(peer,room);
      return;
    }
    if(room.status!=='playing') return;
    const seat=room.roster.findIndex(p=>p.id===auth.id);
    if(seat<0)return;
    if(msg.type==='views') {
      if(auth.role!=='host'||!Array.isArray(msg.views)||msg.views.length!==4||!msg.views.every((v,i)=>safeView(v,i)))return;
      const previous=await this.ctx.storage.get('views');
      // Duplicate UI and timer renders do not need an additional storage write or broadcast.
      if(previous?.matchId===room.matchId && JSON.stringify(previous.views)===JSON.stringify(msg.views))return;
      const seq=(previous?.matchId===room.matchId?previous.seq:0)+1;
      // Persist the latest private view for each seat in one write; never distribute all four views.
      const saved={matchId:room.matchId,seq,views:msg.views};
      await this.ctx.storage.put('views',saved);
      for(const peer of this.live()){
        const pseat=room.roster.findIndex(p=>p.id===peer.deserializeAttachment()?.id);
        if(pseat>=0 && pseat<4 && pseat!==seat)tell(peer,{type:'state',state:msg.views[pseat],seq,matchId:room.matchId});
      }
      return;
    }
    if(auth.role==='host')return;
    if(msg.type==='action' && Number.isSafeInteger(msg.id)) {
      const current=await this.ctx.storage.get('views');
      const pending=current?.views?.[seat]?.pr;
      if(!pending || pending.seat!==seat || pending.id!==msg.id)return;
      if(pending.kind==='ask' && (!Number.isInteger(msg.value)||msg.value<0||msg.value>=pending.opts?.length))return;
      if(pending.kind==='pick' && (!msg.value||typeof msg.value!=='object'||!Number.isSafeInteger(msg.value.t)))return;
      const host=this.live().find(s=>s.deserializeAttachment()?.id==='host');
      tell(host,{type:'action',seat,id:msg.id,value:msg.value});return;
    }
    if(msg.type==='option' && ['autoWin','callAllowed'].includes(msg.key) && typeof msg.value==='boolean'){
      const host=this.live().find(s=>s.deserializeAttachment()?.id==='host');
      tell(host,{type:'option',seat,key:msg.key,value:msg.value});
    }
  }
  async alarm() {
    // No indefinite storage accumulation for abandoned friendship rooms.
    if(this.live().length){await this.ctx.storage.setAlarm(Date.now()+CLEANUP_AFTER_MS);return;}
    await this.ctx.storage.deleteAll();
  }
  async webSocketClose(ws) {await this.onClosed(ws);}
  async webSocketError(ws) {await this.onClosed(ws);}
  async onClosed(ws) {
    const auth=ws.deserializeAttachment();if(!auth?.id)return;
    this.queue=this.queue.then(async()=>{
      const room=await this.getRoom();if(!room)return;
      if(room.status==='waiting' && auth.role==='guest' && !this.connected(auth.id)){
        room.members=room.members.filter(m=>m.id!==auth.id);await this.persist(room);
      }
      if(room.status==='waiting')this.notifyLobby(room);
      this.broadcast({type:'presence',hostOnline:this.connected('host'),players:this.lobbyPlayers(room)});
    }).catch(err=>console.error('雀彩切断処理エラー',err));
    await this.queue;
  }
}
