/* 雀彩: lightweight software-3D dice for phones (2D canvas, no extra WebGL context).
   Read-only presentation: values and multiplier always come from the game engine.
   The established CSS cube animation remains the fallback if Canvas is unavailable. */
(()=>{'use strict';
const RAD=Math.PI/180;
const PIPS={1:[5],2:[1,9],3:[1,5,9],4:[1,3,7,9],5:[1,3,5,7,9],6:[1,3,4,6,7,9]};
const faces=[
 {n:1,c:[0,0,1],u:[1,0,0],v:[0,1,0]},
 {n:6,c:[0,0,-1],u:[-1,0,0],v:[0,1,0]},
 {n:3,c:[1,0,0],u:[0,0,-1],v:[0,1,0]},
 {n:4,c:[-1,0,0],u:[0,0,1],v:[0,1,0]},
 {n:2,c:[0,-1,0],u:[1,0,0],v:[0,0,1]},
 {n:5,c:[0,1,0],u:[1,0,0],v:[0,0,-1]}
];
const add=(p,a,b)=>[p[0]+a[0]*b,p[1]+a[1]*b,p[2]+a[2]*b];
const rotate=(p,ax,ay,az)=>{
 let [x,y,z]=p;
 let c=Math.cos(ax),s=Math.sin(ax);[y,z]=[y*c-z*s,y*s+z*c];
 c=Math.cos(ay);s=Math.sin(ay);[x,z]=[x*c+z*s,-x*s+z*c];
 c=Math.cos(az);s=Math.sin(az);[x,y]=[x*c-y*s,x*s+y*c];
 return [x,y,z];
};
function start(track,dice){
 if(!window.matchMedia?.('(max-width:1000px)')?.matches)return null;
 let canvas,ctx;
 try{canvas=document.createElement('canvas');ctx=canvas.getContext('2d',{alpha:true});}
 catch{return null}
 if(!ctx)return null;
 const bounds=track.getBoundingClientRect?.();
 if(!bounds||bounds.width<80||bounds.height<40)return null;
 const density=Math.min(2,Math.max(1,window.devicePixelRatio||1));
 canvas.width=Math.round(bounds.width*density);canvas.height=Math.round(bounds.height*density);
 canvas.className='jan-dice-canvas';canvas.setAttribute('aria-hidden','true');
 ctx.setTransform(density,0,0,density,0,0);
 const locations=dice.map(({node,x,y})=>{
  const r=node.getBoundingClientRect();
  return {x:r.left-bounds.left+r.width/2,y:r.top-bounds.top+r.height/2,size:r.width,xrot:x,yrot:y};
 });
 track.append(canvas);track.classList.add('jan-canvas-rolling');
 function projection(point,o){
  const factor=6.2/(6.2-point[2]);
  return {x:o.x+point[0]*o.size*.48*factor,y:o.y+point[1]*o.size*.48*factor};
 }
 function fillFace(outline,color){
  ctx.beginPath();ctx.moveTo(outline[0].x,outline[0].y);
  for(let j=1;j<4;j++)ctx.lineTo(outline[j].x,outline[j].y);
  ctx.closePath();ctx.fillStyle=color;ctx.fill();
 }
 function pip(center,rx,ry,red){
  // Project a circular recess in the face plane using the two transformed axes.
  ctx.save();ctx.transform(rx.x,rx.y,ry.x,ry.y,center.x,center.y);
  ctx.beginPath();ctx.arc(0,0,1.10,0,Math.PI*2);ctx.fillStyle='rgba(105,103,98,.52)';ctx.fill();
  const shade=ctx.createRadialGradient(-.23,-.3,.05,.15,.2,1.12);
  if(red){shade.addColorStop(0,'#e8664c');shade.addColorStop(.38,'#b7211b');shade.addColorStop(1,'#640d0d');}
  else{shade.addColorStop(0,'#54575a');shade.addColorStop(.38,'#25292e');shade.addColorStop(1,'#070d12');}
  ctx.beginPath();ctx.arc(0,0,.91,0,Math.PI*2);ctx.fillStyle=shade;ctx.fill();
  ctx.beginPath();ctx.ellipse(-.23,-.3,.24,.12,-.2,0,Math.PI*2);ctx.fillStyle='rgba(255,255,255,.22)';ctx.fill();
  ctx.restore();
 }
 function drawDie(o,i,t,ease){
  const dir=i===1?-1:1;
  const ax=(o.xrot+dir*1080*(1-ease))*RAD;
  const ay=(o.yrot-900*(1-ease))*RAD;
  const az=720*(1-ease)*RAD;
  const bounce=Math.sin(t*Math.PI*6+i*.45)*o.size*.19*(1-t);
  const point={...o,y:o.y+bounce};
  const shadow=ctx.createRadialGradient(o.x,o.y+o.size*.55,1,o.x,o.y+o.size*.55,o.size*.79);
  shadow.addColorStop(0,'rgba(0,0,0,.44)');shadow.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=shadow;ctx.beginPath();ctx.ellipse(o.x,o.y+o.size*.55,o.size*.79,o.size*.24,0,0,Math.PI*2);ctx.fill();
  const turns=p=>rotate(p,ax,ay,az),project=p=>projection(turns(p),point);
  const visible=[];
  for(const f of faces){
   const normal=turns(f.c);
   if(normal[2]<=.015)continue; // No back faces or detached edge-on strips.
   const corners=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([u,v])=>project(add(add(f.c,f.u,u),f.v,v)));
   visible.push({face:f,corners,z:normal[2],center:turns(f.c)[2]});
  }
  // Solid sides meet at their edges. The inset glaze/pips create rounded ceramic styling.
  visible.sort((a,b)=>a.center-b.center);
  for(const {face:f,corners,z} of visible){
   const brightness=.82+.18*z+(.06*(f.c[0]===-1||f.c[1]===-1));
   const base=Math.round(237*brightness);
   fillFace(corners,`rgb(${Math.min(255,base+10)},${Math.min(255,base+10)},${Math.min(255,base+6)})`);
   // Edge shading and an enamel glint, clipped to the actual transformed polygon.
   ctx.save();ctx.beginPath();ctx.moveTo(corners[0].x,corners[0].y);
   for(let j=1;j<4;j++)ctx.lineTo(corners[j].x,corners[j].y);ctx.closePath();ctx.clip();
   const grad=ctx.createLinearGradient(corners[0].x,corners[0].y,corners[2].x,corners[2].y);
   grad.addColorStop(0,'rgba(255,255,255,.37)');grad.addColorStop(.56,'rgba(255,255,255,.04)');grad.addColorStop(1,'rgba(53,62,60,.2)');
   ctx.fillStyle=grad;ctx.fillRect(Math.min(...corners.map(p=>p.x)),Math.min(...corners.map(p=>p.y)),
     Math.max(...corners.map(p=>p.x))-Math.min(...corners.map(p=>p.x)),
     Math.max(...corners.map(p=>p.y))-Math.min(...corners.map(p=>p.y)));
   for(const location of PIPS[f.n]){
    const col=(location-1)%3,row=Math.floor((location-1)/3);
    const pt=add(add(f.c,f.u,(col-1)*.56),f.v,(row-1)*.56);
    const a=project(pt),b=project(add(pt,f.u,.18)),c=project(add(pt,f.v,.18));
    pip(a,{x:b.x-a.x,y:b.y-a.y},{x:c.x-a.x,y:c.y-a.y},f.n===1);
   }
   ctx.restore();
  }
 }
 let active=true;
 return {
  draw(t,ease){if(!active)return;ctx.clearRect(0,0,bounds.width,bounds.height);
   locations.forEach((o,i)=>drawDie(o,i,t,ease));},
  stop(){if(!active)return;active=false;track.classList.remove('jan-canvas-rolling');canvas.remove();}
 };
}
window.JanDiceCanvas={start};
})();
