/* Visual physics only; the game supplies the results before animation. */
(()=>{'use strict';
const DURATION=3200;
function simulate(w,h,size,ends){
 const dt=1/120,frames=384,bx=Math.max(size*.6,w*.46-size*.58),by=Math.max(size*.6,h*.43-size*.58);
 const bodies=ends.map((end,i)=>({x:(i-1)*size*1.35,y:-h*.16+i*size*.12,z:72+i*21,vx:180-i*82,vy:100-i*34,vz:80+i*24,ax:170+i*61,ay:80+i*107,az:i*27,wx:650-i*70,wy:540+i*75,wz:110-i*85,end,poses:[],rotations:[],shadows:[],settle:null}));
 for(let f=0;f<=frames;f++){
  const time=f*dt,t=f/frames;
  for(const b of bodies){
   b.vz-=1050*dt;b.z+=b.vz*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;
   if(b.z<0){b.z=0;const impact=Math.abs(b.vz);b.vz=impact>28?impact*.36:0;b.vx*=.78;b.vy*=.78;b.wx*=.68;b.wy*=.68;b.wz*=.6;}
   const q=Math.hypot(b.x/bx,b.y/by);if(q>1){b.x/=q;b.y/=q;let nx=b.x/(bx*bx),ny=b.y/(by*by),len=Math.hypot(nx,ny);nx/=len;ny/=len;const speed=b.vx*nx+b.vy*ny;if(speed>0){b.vx-=1.48*speed*nx;b.vy-=1.48*speed*ny;b.wz+=speed*.35;b.vz=Math.max(b.vz,Math.min(80,speed*.22));}}
   const drag=Math.exp(-(b.z<1?3:.32)*dt),angular=Math.exp(-(b.z<1?2.6:.16)*dt);b.vx*=drag;b.vy*=drag;b.wx*=angular;b.wy*=angular;b.wz*=angular;b.ax+=b.wx*dt;b.ay+=b.wy*dt;b.az+=b.wz*dt;
  }
  for(let i=0;i<3;i++)for(let j=i+1;j<3;j++){const a=bodies[i],b=bodies[j],dx=b.x-a.x,dy=b.y-a.y,dist=Math.hypot(dx,dy),min=size*1.08;if(dist<min&&Math.abs(a.z-b.z)<size*.8){const nx=dist>.001?dx/dist:1,ny=dist>.001?dy/dist:0,push=(min-dist)/2;a.x-=nx*push;a.y-=ny*push;b.x+=nx*push;b.y+=ny*push;const relative=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;if(relative<0){const impulse=-relative*.7;a.vx-=nx*impulse;a.vy-=ny*impulse;b.vx+=nx*impulse;b.vy+=ny*impulse;a.wz-=impulse*.35;b.wz+=impulse*.35;}}}
  for(const b of bodies){let ax=b.ax,ay=b.ay,az=b.az;
   if(time>=.65){if(!b.settle)b.settle={x:ax,y:ay,z:az,tx:b.end.x+360*Math.round((ax-b.end.x)/360),ty:b.end.y+360*Math.round((ay-b.end.y)/360),tz:360*Math.round(az/360)};const u=Math.min(1,(time-.65)/2.55),e=1-(1-u)**3,s=b.settle;ax=s.x+(s.tx-s.x)*e+Math.sin(u*Math.PI*3)*(1-u)*3;ay=s.y+(s.ty-s.y)*e;az=s.z+(s.tz-s.z)*e;}
   b.poses.push({offset:t,transform:`translate(${b.x-size/2}px,${b.y-size/2-b.z*.65}px) translateZ(${b.z*.25}px)`});b.rotations.push({offset:t,transform:`rotateX(${ax}deg) rotateY(${ay}deg) rotateZ(${az}deg)`});b.shadows.push({offset:t,transform:`translate(${b.x-size*.48}px,${b.y+size*.3}px) scale(${1+b.z/180})`,opacity:.34/(1+b.z/65)});
  }
 }return bodies;
}
window.ChinMotion={duration:DURATION,simulate,play(track,rolling){
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,nodes=[...track.querySelectorAll('.die-position')];track.querySelectorAll('.die-ground-shadow').forEach(n=>n.remove());const {width:w,height:h}=track.getBoundingClientRect(),size=nodes[0]?.offsetWidth||48,ends=nodes.map(n=>({x:parseFloat(n.style.getPropertyValue('--endX'))||0,y:parseFloat(n.style.getPropertyValue('--endY'))||0})),bodies=rolling&&!reduced?simulate(w,h,size,ends):null,runs=[];
 nodes.forEach((node,i)=>{const cube=node.querySelector('.die-cube'),target={x:(i-1)*Math.min(w*.23,size*1.8)-size/2,y:([.1,-.16,.13][i])*h-size/2};for(const el of [node,cube])el.getAnimations().forEach(a=>a.cancel());Object.assign(node.style,{margin:'0',position:'absolute',left:'50%',top:'50%',transform:`translate(${target.x}px,${target.y}px)`});if(!rolling)return;const options={duration:reduced?600:DURATION,fill:'forwards',easing:'linear'};if(reduced){runs.push(node.animate([{transform:`translate(${target.x-8}px,${target.y}px)`},{transform:`translate(${target.x}px,${target.y}px)`}],options));node.dataset.motion='gentle-roll';return;}const b=bodies[i],shadow=document.createElement('span');shadow.className='die-ground-shadow';shadow.setAttribute('aria-hidden','true');track.append(shadow);runs.push(node.animate(b.poses,options),cube.animate(b.rotations,options),shadow.animate(b.shadows,options));node.dataset.motion='physical-roll';});this.finished=Promise.all(runs.map(a=>a.finished.catch(()=>{})));return this.finished;
}};
})();
