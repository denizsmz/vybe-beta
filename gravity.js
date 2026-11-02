/* VYBE – Schwerkraft-Modus
   Fünfmal auf „Deniz“ tippen: Pop-up in der Mitte, danach plumpst alles aufrecht
   nach unten und lässt sich anfassen und werfen. Fünfmal erneut tippen stellt alles
   wieder her. Der Modus wird nicht gespeichert: Neustart bedeutet Normalzustand. */
(function(){
  const SELECTOR="h1,h2,button,.row,.page-title,.wordmark,.made-by,.pass-name,.flip-area,.would-card-area,.ball-card-area,.play-card,.stat-tile,.category-card,.ball-option,.player-row,.result-row,.settings74-note-card,.quiz-percent-ring,.team73-stage,.team73-live-card,.player-summary,.quiz-live-score,.ball-counter,.game-card.current>*";
  const MAX_BODIES=34,GRAVITY=2400,BOUNCE=.48,DRAG_THRESHOLD=8,POPUP_TIME=1500,SLOTS=2;

  const app=document.querySelector(".app");
  const root=document.documentElement;
  let bodies=[],active=false,starting=false,frame=0,last=0,scanTimer=0,screenId="",grab=null,suppressClick=false,lastThud=0,slotHeights=new Array(SLOTS).fill(0);

  try{localStorage.removeItem("vybe_gravity_mode_v1")}catch(error){}

  const area=()=>{
    const padding=parseFloat(getComputedStyle(root).getPropertyValue("--pad-b"))||14;
    return {width:app.clientWidth,height:app.clientHeight-padding};
  };
  function isVisible(element){
    const box=element.getBoundingClientRect(),style=getComputedStyle(element);
    return box.width>0&&box.height>0&&style.visibility!=="hidden"&&!element.closest("[hidden]");
  }
  function collect(screen){
    const picked=[];
    screen.querySelectorAll(SELECTOR).forEach(element=>{
      if(element.matches("button.game-card,.game-card:not(.current)")||!isVisible(element))return;
      if(picked.some(parent=>parent.contains(element)))return;
      picked.push(element);
    });
    const rank=element=>element.matches(".made-by")?0:element.matches(".back,.top *,.home-bar *")?1:2;
    return picked.sort((a,b)=>rank(a)-rank(b));
  }
  function createBody(element,fromAbove,index){
    const box=element.getBoundingClientRect(),frameBox=app.getBoundingClientRect();
    const originX=box.left-frameBox.left,originY=box.top-frameBox.top;
    element.style.transition="none";
    element.style.willChange="transform";
    element.style.transformOrigin="50% 100%";
    return {
      element,originX,originY,w:box.width,h:box.height,
      x:originX,
      y:fromAbove?-box.height-index*46:originY,
      vx:0,vy:0,targetX:null,
      delay:fromAbove?0:Math.random()*.34,
      squash:0
    };
  }
  function releaseElement(body){
    const style=body.element.style;
    style.transform=style.transition=style.willChange=style.zIndex=style.transformOrigin="";
  }
  function scan(){
    const screen=document.querySelector(".screen.active");
    if(!screen)return;
    const changed=screen.id!==screenId;
    const first=screenId==="";
    if(changed){
      bodies.forEach(releaseElement);
      bodies=[];
      slotHeights=new Array(SLOTS).fill(0);
      document.querySelectorAll(".gravity-hidden").forEach(element=>element.classList.remove("gravity-hidden"));
      screenId=screen.id;
    }
    bodies=bodies.filter(body=>body.element.isConnected);
    collect(screen).forEach((element,index)=>{
      if(bodies.some(body=>body.element===element))return;
      if(bodies.length>=MAX_BODIES){element.classList.add("gravity-hidden");return}
      const body=createBody(element,changed&&!first,index);
      aimAtLowestSpot(body);
      bodies.push(body);
    });
  }
  /* Verteilt die Teile über die Breite, damit kein einzelner Turm entsteht */
  function aimAtLowestSpot(body){
    const width=area().width,slotWidth=width/SLOTS;
    const span=Math.min(SLOTS,Math.ceil(body.w/slotWidth));
    let best=0,bestHeight=Infinity;
    for(let start=0;start<=SLOTS-span;start++){
      const height=Math.max(...slotHeights.slice(start,start+span));
      if(height<bestHeight-1||(Math.abs(height-bestHeight)<=1&&Math.random()<.5)){best=start;bestHeight=height}
    }
    for(let slot=best;slot<best+span;slot++)slotHeights[slot]=bestHeight+body.h+6;
    const room=Math.max(0,span*slotWidth-body.w);
    body.targetX=Math.max(0,Math.min(width-body.w,best*slotWidth+Math.random()*room));
  }
  function thud(speed){
    const now=performance.now();
    if(speed<520||now-lastThud<70)return;
    lastThud=now;
    triggerHaptic("light");
  }
  function land(body,speed){
    if(speed>180){
      body.squash=Math.min(.24,speed/6000);
      body.vx+=(Math.random()-.5)*Math.min(320,speed*.22);
      thud(speed);
    }
  }
  function separate(){
    /* Von unten nach oben auflösen, damit Stapel stabil liegen bleiben */
    const held=grab?.body;
    bodies.sort((a,b)=>(b.y+b.h)-(a.y+a.h));
    for(let i=0;i<bodies.length;i++){
      const lower=bodies[i];
      for(let j=i+1;j<bodies.length;j++){
        const upper=bodies[j];
        if(upper===held||upper.delay>0)continue;
        if(upper.targetX!==null&&Math.abs(upper.x-upper.targetX)>6)continue;
        const overlapX=Math.min(lower.x+lower.w,upper.x+upper.w)-Math.max(lower.x,upper.x);
        const overlapY=Math.min(lower.y+lower.h,upper.y+upper.h)-Math.max(lower.y,upper.y);
        if(overlapX<=0||overlapY<=0)continue;
        if(overlapY<=overlapX||overlapY<10){
          upper.y-=overlapY;
          if(upper.vy>0){
            land(upper,upper.vy);
            upper.targetX=null;
            const hit=upper.vy;
            upper.vy=hit*-BOUNCE;
            if(Math.abs(upper.vy)<70)upper.vy=0;
            if(hit>420&&lower!==held){lower.vy-=hit*.14;lower.squash=Math.min(.14,hit/9000)}
          }
          upper.vx*=.86;
        }else{
          const push=overlapX/2,direction=upper.x+upper.w/2<lower.x+lower.w/2?-1:1;
          upper.x+=direction*push;
          if(lower!==held)lower.x-=direction*push;
          upper.vx*=.5;
        }
      }
    }
  }
  function step(dt){
    const size=area();
    bodies.forEach(body=>{
      if(grab?.body===body)return;
      if(body.delay>0){body.delay-=dt;return}
      body.vy+=GRAVITY*dt;
      if(body.targetX!==null)body.x+=(body.targetX-body.x)*Math.min(1,dt*7);
      body.vx*=.998;
      if(Math.abs(body.vx)<6)body.vx=0;
      body.x+=body.vx*dt;
      body.y+=body.vy*dt;
      if(body.x<0){body.x=0;body.vx=Math.abs(body.vx)*.3}
      if(body.x+body.w>size.width){body.x=Math.max(0,size.width-body.w);body.vx=-Math.abs(body.vx)*.3}
      if(body.y+body.h>size.height){
        body.y=size.height-body.h;
        if(body.vy>0)land(body,body.vy);
        body.targetX=null;
        body.vy=body.vy>150?-body.vy*BOUNCE:0;
        body.vx*=.82;
      }
    });
    for(let i=0;i<4;i++)separate();
    bodies.forEach(body=>{body.squash*=.88});
  }
  function paint(){
    bodies.forEach(body=>{
      const squash=body.squash>.003?` scale(${1+body.squash},${1-body.squash})`:"";
      body.element.style.transform=`translate3d(${body.x-body.originX}px,${body.y-body.originY}px,0)${squash}`;
    });
  }
  function loop(now){
    if(!active)return;
    const dt=Math.min(1/30,(now-last)/1000||1/60);
    last=now;
    step(dt/2);
    step(dt/2);
    paint();
    frame=requestAnimationFrame(loop);
  }
  function start(){
    root.classList.add("gravity");
    active=true;
    screenId="";
    scan();
    clearInterval(scanTimer);
    scanTimer=setInterval(scan,400);
    last=performance.now();
    frame=requestAnimationFrame(loop);
  }
  function showUnlock(){
    const popup=document.createElement("div");
    popup.className="egg-popup";
    popup.setAttribute("role","status");
    popup.innerHTML='<span class="egg-emoji">🥚</span><strong>Easter Egg freigeschaltet</strong>';
    document.body.append(popup);
    requestAnimationFrame(()=>popup.classList.add("show"));
    setTimeout(()=>popup.classList.remove("show"),POPUP_TIME-240);
    setTimeout(()=>popup.remove(),POPUP_TIME+260);
  }
  function enable(){
    if(active||starting)return;
    starting=true;
    showUnlock();
    triggerHaptic("success");
    setTimeout(()=>{starting=false;start()},POPUP_TIME);
  }
  function disable(){
    if(!active)return;
    active=false;
    grab=null;
    cancelAnimationFrame(frame);
    clearInterval(scanTimer);
    triggerHaptic("success");
    const finished=bodies;
    bodies=[];
    finished.forEach(body=>{
      body.element.style.transition="transform .6s cubic-bezier(.22,1,.36,1)";
      body.element.style.transform="";
    });
    setTimeout(()=>{
      finished.forEach(releaseElement);
      document.querySelectorAll(".gravity-hidden").forEach(element=>element.classList.remove("gravity-hidden"));
      root.classList.remove("gravity");
      window.vybeDock?.restore();
    },640);
  }

  document.addEventListener("pointerdown",event=>{
    if(!active)return;
    const body=bodies.find(item=>item.element.contains(event.target));
    if(!body)return;
    const frameBox=app.getBoundingClientRect();
    grab={
      body,pointerId:event.pointerId,moved:false,
      startX:event.clientX,startY:event.clientY,
      offsetX:event.clientX-frameBox.left-body.x,offsetY:event.clientY-frameBox.top-body.y,
      lastTime:event.timeStamp
    };
    body.delay=0;
    body.targetX=null;
    body.element.style.zIndex="50";
  },true);
  window.addEventListener("pointermove",event=>{
    if(!grab||event.pointerId!==grab.pointerId)return;
    if(!grab.moved&&Math.hypot(event.clientX-grab.startX,event.clientY-grab.startY)<DRAG_THRESHOLD)return;
    if(!grab.moved)triggerHaptic("light");
    grab.moved=true;
    const frameBox=app.getBoundingClientRect(),body=grab.body;
    const x=event.clientX-frameBox.left-grab.offsetX,y=event.clientY-frameBox.top-grab.offsetY;
    const elapsed=Math.max(1,event.timeStamp-grab.lastTime)/1000;
    body.vx=(x-body.x)/elapsed;
    body.vy=(y-body.y)/elapsed;
    body.x=x;
    body.y=y;
    grab.lastTime=event.timeStamp;
  });
  function drop(event){
    if(!grab||event.pointerId!==grab.pointerId)return;
    const {body,moved}=grab;
    body.vx=Math.max(-2200,Math.min(2200,body.vx));
    body.vy=Math.max(-2200,Math.min(2200,body.vy));
    body.element.style.zIndex="";
    suppressClick=moved;
    grab=null;
  }
  window.addEventListener("pointerup",drop);
  window.addEventListener("pointercancel",drop);
  window.addEventListener("click",event=>{
    if(!suppressClick)return;
    suppressClick=false;
    event.preventDefault();
    event.stopImmediatePropagation();
  },true);

  window.vybeGravity={toggle(){active?disable():enable()},get active(){return active}};
})();
