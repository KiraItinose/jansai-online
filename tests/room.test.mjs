import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import vm from 'node:vm';

let nextSocket=0;
class FakeSocket {
  constructor(){this.readyState=1;this.sent=[];this.id=++nextSocket;this.attachment=undefined;}
  send(message){this.sent.push(JSON.parse(message));}
  serializeAttachment(v){this.attachment=v;}
  deserializeAttachment(){return this.attachment;}
  close(){this.readyState=3;}
}
class TestResponse {constructor(body,{status=200,headers={},webSocket=null}={}){this.body=body;this.status=status;this.headers=headers;this.webSocket=webSocket;}}
class TestDurableObject {constructor(ctx,env){this.ctx=ctx;this.env=env;}}
class MockStorage {
  constructor(){this.map=new Map();}
  async get(key){return structuredClone(this.map.get(key));}
  async put(key,value){this.map.set(key,structuredClone(value));}
  async delete(key){this.map.delete(key);}
  async deleteAll(){this.map.clear();}
  async setAlarm(ts){this.alarmAt=ts;}
}
class MockContext {
  constructor(){this.sockets=[];this.storage=new MockStorage();}
  acceptWebSocket(ws){this.sockets.push(ws);}
  getWebSockets(){return this.sockets.filter(s=>s.readyState===1);}
  setWebSocketAutoResponse(){}
}
const source=readFileSync(new URL('../src/index.js',import.meta.url),'utf8').replace(/^import.*\n/,'').replace('export default {','const workerDefault = {').replace('export class JansaiRoom','class JansaiRoom');
const runtime=vm.runInNewContext(source+'\n({workerDefault,JansaiRoom});',{
  DurableObject:TestDurableObject,
  Response:TestResponse,
  WebSocketPair:class {constructor(){this[0]=new FakeSocket();this[1]=new FakeSocket();}},
  WebSocketRequestResponsePair:class {constructor(){}},
  crypto:webcrypto,TextEncoder,URL,Date,console,structuredClone,
});
const {workerDefault,JansaiRoom}=runtime;
const A='A'.repeat(32),B='B'.repeat(32),C='C'.repeat(32),D='D'.repeat(32), CODE='ABCDEFGH';
const receive=(sock,type)=>sock.sent.filter(v=>v.type===type).at(-1);
const msg=async(room,sock,type,data={})=>room.webSocketMessage(sock,JSON.stringify({v:2,type,...data}));
async function connect(room){await room.fetch({});return room.ctx.sockets.at(-1);}
async function setup(){const ctx=new MockContext();const room=new JansaiRoom(ctx,{});const host=await connect(room);await msg(room,host,'hello',{mode:'host',token:A,name:'ホスト',config:{rounds:8,hand:7,thinkBase:300,thinkBank:0}});return {ctx,room,host};}
async function addGuest(room,token=B){const sock=await connect(room);await msg(room,sock,'hello',{mode:'guest',token,name:'ゲスト'});return sock;}
const view=seat=>({H:Array.from({length:4},(_,i)=>i===seat?[{s:'m',n:seat+1,id:seat+1}]:[null]),pr:{seat,id:123,kind:'pick'},sc:[25000,25000,25000,25000]});

// Intent: require testable privacy and admission invariants independent of cloud deployment.
test('Worker routes assets, health, and verifies WS origin, format, and method',async()=>{
 const env={ASSETS:{fetch:async()=>({static:true})},ROOMS:{idFromName:x=>x,get:x=>({fetch:async()=>({room:x})})}};
 const health=await workerDefault.fetch(new Request('https://example.com/api/health'),env);
 assert.equal(health.status,200);
 assert.equal(JSON.parse(health.body).protocol,2);
 assert.deepEqual(await workerDefault.fetch(new Request('https://example.com/online.html'),env),{static:true});
 assert.equal((await workerDefault.fetch(new Request('https://example.com/api/room/BAD'),env)).status,400);
 assert.equal((await workerDefault.fetch(new Request('https://example.com/api/room/'+CODE),env)).status,426);
 const req=new Request('https://example.com/api/room/'+CODE,{headers:{Upgrade:'websocket',Origin:'https://evil.example'}});
 assert.equal((await workerDefault.fetch(req,env)).status,403);
 const valid=new Request('https://example.com/api/room/'+CODE,{headers:{Upgrade:'websocket',Origin:'https://example.com'}});
 assert.equal((await workerDefault.fetch(valid,env)).room,CODE);
});
test('No implicit room creation for guests; host must create; lobby preserves rule choices',async()=>{
 const ctx=new MockContext(),room=new JansaiRoom(ctx,{}), stranger=await connect(room);
 await msg(room,stranger,'hello',{mode:'guest',token:B,name:'知らない人'});
 assert.match(receive(stranger,'error').text,/卓が見つかりません/);
 const host=await connect(room);
 await msg(room,host,'hello',{mode:'host',token:A,name:'ホスト',config:{hand:7,rounds:8,thinkBase:300,thinkBank:0,free:0,start:20000,target:25000}});
 const guest=await addGuest(room);
 assert.equal(receive(guest,'lobby').players.length,2);
 assert.equal(receive(guest,'lobby').config.hand,7);
 assert.equal(receive(guest,'lobby').config.thinkBase,300);
 assert.equal(receive(guest,'lobby').config.start,20000);
});
test('2-player start, random seat assignment, server stores view while preserving private hands',async()=>{
 const {room,host,ctx}=await setup();const guest=await addGuest(room);
 await msg(room,host,'start');
 const startHost=receive(host,'start'),startGuest=receive(guest,'start');
 assert.equal(startHost.players.length,4);
 assert.equal(startGuest.matchId,startHost.matchId);
 assert.notEqual(startGuest.seat,startHost.seat);
 assert.equal(startHost.players.filter(p=>p.id===null).length,2);
 const views=Array.from({length:4},(_,i)=>view(i));
 // Make the guest's prompt available and ensure a private tile goes only to them.
 views.forEach((v,i)=>{v.pr={seat:i,id:123,kind:'pick'};});
 await msg(room,host,'views',{views});
 const received=receive(guest,'state');
 assert.equal(received.state.H[startGuest.seat][0].id,startGuest.seat+1);
 assert.deepEqual(received.state.H[startHost.seat],[null]);
 assert.equal(received.state.H.filter(h=>h[0]!==null).length,1);
 assert.equal((await ctx.storage.get('views')).views.length,4);
 // Disallow a host from accidentally or intentionally exposing another seat's hand.
 const seq=(await ctx.storage.get('views')).seq;
 const unsafe=views.map(x=>structuredClone(x));unsafe[0].H[1]=[{s:'p',n:4,id:9}];
 await msg(room,host,'views',{views:unsafe});
 assert.equal((await ctx.storage.get('views')).seq,seq);
});
test('Guest action is validated against seat and pending action then sent only to host',async()=>{
 const {room,host}=await setup(),guest=await addGuest(room);
 await msg(room,host,'start');
 const seat=receive(guest,'start').seat,views=[0,1,2,3].map(view);
 views[seat].pr={seat,id:123,kind:'ask',opts:['はい','いいえ']};
 await msg(room,host,'views',{views});
 await msg(room,guest,'action',{id:123,value:1});
 assert.equal(receive(host,'action').seat,seat);
 assert.equal(receive(host,'action').value,1);
 const before=host.sent.filter(x=>x.type==='action').length;
 await msg(room,guest,'action',{id:999,value:1});
 await msg(room,guest,'action',{id:123,value:9});
 assert.equal(host.sent.filter(x=>x.type==='action').length,before);
 await msg(room,guest,'option',{key:'autoWin',value:false});
 assert.equal(receive(host,'option').seat,seat);
});
test('Guests can resume seat and receive stored private state after a Durable Object restart',async()=>{
 const {room,host,ctx}=await setup(),oldGuest=await addGuest(room);
 await msg(room,host,'start');
 const initial=receive(oldGuest,'start');
 await msg(room,host,'views',{views:Array.from({length:4},(_,i)=>view(i))});
 oldGuest.close();await room.webSocketClose(oldGuest);
 const rehydrated=new JansaiRoom(ctx,{});
 const guest=await addGuest(rehydrated);
 assert.equal(receive(guest,'start').seat,initial.seat);
 assert.equal(receive(guest,'state').state.H[initial.seat][0].id,initial.seat+1);
});
test('Blocks new joins after start and rejects host page reload without a resumable engine',async()=>{
 const {room,host}=await setup();const guest=await addGuest(room);
 await msg(room,host,'start');const matchId=receive(host,'start').matchId;
 const stranger=await addGuest(room,C);
 assert.match(receive(stranger,'error').text,/開始後/);
 host.close();await room.webSocketClose(host);
 const hostAfterReload=await connect(room);
 await msg(room,hostAfterReload,'hello',{mode:'host',token:A,name:'ホスト'});
 assert.match(receive(hostAfterReload,'error').text,/再読み込み/);
 const hostAfterTransientNetwork=await connect(room);
 await msg(room,hostAfterTransientNetwork,'hello',{mode:'host',token:A,name:'ホスト',resumeMatchId:matchId});
 assert.equal(receive(hostAfterTransientNetwork,'start').matchId,matchId);
});
test('Host role cannot be forged with a different token, even after room exists',async()=>{
 const {room}=await setup();const imposter=await connect(room);
 await msg(room,imposter,'hello',{mode:'host',token:D,name:'偽物'});
 assert.match(receive(imposter,'error').text,/認証/);
 assert.equal(imposter.readyState,3);
});

test('Abandoned rooms and latest private snapshots are removed by the cleanup alarm',async()=>{
 const {room,host,ctx}=await setup();const guest=await addGuest(room);
 await msg(room,host,'start');await msg(room,host,'views',{views:[0,1,2,3].map(view)});
 assert.ok(ctx.storage.alarmAt);
 host.close();guest.close();
 await room.alarm();
 assert.equal(await ctx.storage.get('room'),undefined);
 assert.equal(await ctx.storage.get('views'),undefined);
});
