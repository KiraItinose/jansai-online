import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import vm from 'node:vm';

const source=readFileSync(new URL('../public/online.js',import.meta.url),'utf8');
function createPage(mode){
  const elements=new Map();let copied='';
  function element(selector){
    if(!elements.has(selector))elements.set(selector,{
      hidden:true,value:'',textContent:'',disabled:false,
      addEventListener(type,fn){(this.listeners??={})[type]=fn},
      focus(){this.focused=true;this.listeners?.focus?.({currentTarget:this})},
      select(){this.selected=true},setSelectionRange(a,b){this.selection=[a,b]},
      replaceChildren(){this.children=[]},append(...items){(this.children??=[]).push(...items)},
      contentWindow:{postMessage(){}},
    });
    return elements.get(selector);
  }
  const document={
    querySelector:element,
    createElement:()=>({className:'',append(){},textContent:''}),
    execCommand:command=>{
      if(mode!=='legacy')return false;
      assert.equal(command,'copy');copied=element('#inviteUrl').value;return true;
    },
  };
  const clipboard={writeText:async url=>{
    if(mode==='denied')throw new Error('Clipboard access denied');
    copied=url;
  }};
  const hash='#'+encodeURIComponent(JSON.stringify({host:true,name:'テスト'}));
  const location={href:'https://jansai.example/online.html'+hash,protocol:'https:',hostname:'jansai.example',host:'jansai.example',hash,search:''};
  let socket;
  class WebSocket {
    static OPEN=1;
    constructor(){socket=this;this.readyState=1}
    send(raw){
      if(JSON.parse(raw).type==='hello')queueMicrotask(()=>this.onmessage?.({data:JSON.stringify({
        v:2,type:'lobby',players:[{id:'host',name:'テスト',connected:true}],config:{rounds:4},
      })}));
    }
    close(){this.readyState=3;this.onclose?.()}
  }
  const sandbox={window:{addEventListener(){}},document,location,WebSocket,URL,URLSearchParams,
    crypto:webcrypto,sessionStorage:{getItem(){return null},setItem(){}},navigator:{clipboard},
    prompt(){return 'テスト'},console,confirm(){return true},setTimeout(){return 1},
    clearTimeout(){},setInterval(){return 1},queueMicrotask,
    screen:{orientation:{lock:async()=>{}}},
  };
  vm.runInNewContext(source,sandbox);
  socket.onopen();
  return {element,getCopied:()=>copied};
}

for(const mode of ['legacy','modern','denied'])test('Invite copy: '+mode+' clipboard scenario',async()=>{
  const page=createPage(mode);
  await Promise.resolve();await Promise.resolve();
  const field=page.element('#inviteUrl');
  assert.match(field.value,/^https:\/\/jansai\.example\/online\.html\?room=[A-HJ-NP-Z2-9]{8}$/);
  assert.equal(page.element('#codeRow').hidden,false);
  await page.element('#copy').onclick();
  const message=page.element('#copyStatus').textContent;
  if(mode==='denied'){
    assert.match(message,/Ctrl\+C/);
    assert.equal(page.getCopied(),'');
    assert.equal(field.selected,true);
  }else{
    assert.match(message,/コピーしました/);
    assert.equal(page.getCopied(),field.value);
  }
});
