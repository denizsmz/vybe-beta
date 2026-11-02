/* VYBE – Schwerkraft-Modus
   Fünfmal auf „Deniz“ tippen: Die App dreht sich, alles fällt nach unten und
   lässt sich anfassen und werfen. Fünfmal erneut tippen stellt alles wieder her. */
(function(){
  const STORAGE_KEY="vybe_gravity_mode_v1";
  const SELECTOR="h1,h2,p,button,.row,.page-title,.wordmark,.made-by,.section-label,.pass-name,.flip-area,.would-card-area,.ball-card-area,.play-card,.stat-tile,.stats-hero,.category-card,.ball-option,.player-row,.result-row,.settings74-note-card,.quiz-percent-ring,.team73-stage,.team73-live-card,.progress,.player-summary,.quiz-live-score,.ball-counter,.game-card.current>*";
  const MAX_BODIES=48,GRAVITY=2000,BOUNCE=.22,DRAG_THRESHOLD=8;

  const root=document.documentElement;
  const app=document.querySelector(".app");
  let bodies=[],active=false,flipping=false,frame=0,last=0,scanTimer=0,screenId="",grab=null,suppressClick=false;

  const size=()=>{
    const padding=parseFloat(getComputedStyle(root).getPropertyValue("--pad-b"))||14;
    return {width:app.clientWidth,height:app.clientHeight-padding};
  };
  const remember=value=>{
    try{value?localStorage.setItem(STORAGE_KEY,"1"):localStorage.removeItem(STORAGE_KEY)}catch(error){}
  };

  function isVisible(element){
    const box=element.getBoundingClientRect(),style=getComputedStyle(element);
    return box.width>0&&box.height>0&&style.visibility!=="hidden"&&!element.closest("[hidden]");
  }
  function collect(screen){
    const picked=[];
    screen.querySelectorAll(SELECTOR).forEach(element=>{
      if(element.matches(".game-card:not(.current),.dock-lens")||!isVisible(element))return;
      if(element.matches("button.game-card"))return;
      if(picked.some(parent=>parent.contains(element)))return;
      picked.push(element);
    });
    return picked.sort((a,b)=>Number(b.matches(".made-by"))-Number(a.matches(".made-by")));
  }
  function createBody(element,flipped){
    const box=element.getBoundingClientRect(),frameBox=app.getBoundingClientRect(),area=size();
    const originX=box.left-frameBox.left+box.width/2,originY=box.top-frameBox.top+box.height/2;
    element.style.transition="none";
    element.style.willChange="transform";
    return {
      element,originX,originY,
      x:flipped?area.width-originX:originX,
      y:flipped?frameBox.height-originY:originY,
      vx:(Math.random()-.5)*60,vy:0,
      angle:flipped?Math.PI:0,spin:(Math.random()-.5)*1.4,
      radius:Math.max(20,Math.min(64,Math.max(box.width,box.height)*.42))
    };
  }
  function releaseElement(body){
    body.element.style.transform="";
    body.element.style.transition="";
    body.element.style.willChange="";
    body.element.style.zIndex="";
  }
  function scan(){
    const screen=document.querySelector(".screen.active");
    if(!screen)return;
    const changed=screen.id!==screenId;
    if(changed){
      bodies.forEach(releaseElement);
      bodies=[];
      document.querySelectorAll(".gravity-hidden").forEach(element=>element.classList.remove("gravity-hidden"));
      screenId=screen.id;
    }
    bodies=bodies.filter(body=>body.element.isConnected);
    collect(screen).forEach(element=>{
      if(bodies.some(body=>body.element===element))return;
      if(bodies.length>=MAX_BODIES){element.classList.add("gravity-hidden");return}
      bodies.push(createBody(element,changed));
    });
  }

  function settle(){
    for(let i=0;i<bodies.length;i++){
      for(let j=i+1;j<bodies.length;j++){
        const a=bodies[i],b=bodies[j];
        const dx=b.x-a.x,dy=b.y-a.y,reach=a.radius+b.radius,distance=Math.hypot(dx,dy)||.01;
        if(distance>=reach)continue;
        const nx=dx/distance,ny=dy/distance,overlap=(reach-distance)*.5;
        const aHeld=grab?.body===a,bHeld=grab?.body===b;
        if(!aHeld){a.x-=nx*overlap;a.y-=ny*overlap}
        if(!bHeld){b.x+=nx*overlap;b.y+=ny*overlap}
        const closing=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;
        if(closing<0){
          const impulse=-(1+BOUNCE)*closing*.5;
          if(!aHeld){a.vx-=impulse*nx;a.vy-=impulse*ny}
          if(!bHeld){b.vx+=impulse*nx;b.vy+=impulse*ny}
          a.spin+=closing*.002;
          b.spin-=closing*.002;
        }
      }
    }
  }
  function step(dt){
    const area=size();
    bodies.forEach(body=>{
      if(grab?.body===body)return;
      body.vy+=GRAVITY*dt;
      body.vx*=.999;
      body.x+=body.vx*dt;
      body.y+=body.vy*dt;
      body.angle+=body.spin*dt;
      body.spin*=.994;
      if(body.x<body.radius){body.x=body.radius;body.vx=Math.abs(body.vx)*.4}
      if(body.x>area.width-body.radius){body.x=area.width-body.radius;body.vx=-Math.abs(body.vx)*.4}
      if(body.y>area.height-body.radius){
        body.y=area.height-body.radius;
        body.vy=-Math.abs(body.vy)*BOUNCE;
        body.vx*=.9;
        body.spin=body.vx/body.radius*.6;
      }
    });
    for(let i=0;i<3;i++)settle();
  }
  function paint(){
    bodies.forEach(body=>{
      body.element.style.transform=`translate3d(${body.x-body.originX}px,${body.y-body.originY}px,0) rotate(${body.angle}rad)`;
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
  function start(flipped){
    root.classList.add("gravity");
    active=true;
    screenId="";
    scan();
    clearInterval(scanTimer);
    scanTimer=setInterval(scan,400);
    last=performance.now();
    frame=requestAnimationFrame(loop);
  }
  function enable(){
    if(active||flipping)return;
    flipping=true;
    remember(true);
    triggerHaptic("heavy");
    if(window.matchMedia("(prefers-reduced-motion: reduce)").matches){flipping=false;start(true);return}
    app.animate(
      [{transform:"rotate(0deg)"},{transform:"rotate(180deg)"}],
      {duration:760,easing:"cubic-bezier(.65,0,.2,1)"}
    ).finished.then(()=>{flipping=false;start(true)});
  }
  function disable(){
    if(!active)return;
    remember(false);
    active=false;
    grab=null;
    cancelAnimationFrame(frame);
    clearInterval(scanTimer);
    triggerHaptic("success");
    const finished=bodies;
    bodies=[];
    finished.forEach(body=>{
      body.element.style.transition="transform .64s cubic-bezier(.22,1,.36,1)";
      body.element.style.transform="";
    });
    setTimeout(()=>{
      finished.forEach(releaseElement);
      document.querySelectorAll(".gravity-hidden").forEach(element=>element.classList.remove("gravity-hidden"));
      root.classList.remove("gravity");
      window.vybeDock?.restore();
    },680);
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
    body.vx=Math.max(-2600,Math.min(2600,body.vx));
    body.vy=Math.max(-2600,Math.min(2600,body.vy));
    body.spin=body.vx/120;
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
  try{
    if(localStorage.getItem(STORAGE_KEY))setTimeout(()=>start(false),900);
  }catch(error){}
})();
