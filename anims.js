/* Election Night viewer — celebration animations.
   Contract: ANIMS.name = ({W,H,r,hit,banner,shake,spawnConfetti}) => ({dur, struck:false, struckAt:0, frame(t)})
   Globals available: ctx (2D context, already scaled for DPR), C.ink / C.paper (theme colours; use '#fff' for highlights drawn ON coloured shapes),
   rr(a,b) random, roundRect(x,y,w,h,r) (builds a path; call ctx.fill()/ctx.stroke()), STATES[r.st].d (SVG path, viewBox 975x610) and .c (centroid),
   SFX.* sounds and tone()/noise()/cheer() to make new ones. r.st is the state code, r.label the race name, r.winner the winning candidate.
   Call hit('BANNER!','sfxName') exactly once at the climax (it shakes the screen, shows the banner, fires confetti and sets A.struck). */
/* SPR — sprite cache helper. Characters that are drawn many times with a static shape are rendered ONCE to an offscreen canvas
   (at the fx canvas's device scale, read from ctx's transform) and then drawImage'd; animated limbs/eyes are drawn on top as before.
   Sprites bake in C.ink/C.paper, so build them inside the animation factory (per run), never at module level.
   Whether a blit is actually cheaper than re-drawing the paths depends on the canvas backend: on a GPU-accelerated canvas a drawImage is
   almost free, while on a software-rasterised canvas a rotated (bilinear-resampled) blit costs ~10x a simple path fill and even an
   axis-aligned blit of a mostly-transparent box can cost more than a couple of fills. SPR.probe() times both once per page on a scratch
   canvas, and SPR.shape() then uses the sprite or re-paints the vector shape, whichever is cheaper on this device (identical pixels). */
const SPR = {
  rr(g,x,y,w,h,r){ g.beginPath(); g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r); g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath(); },
  /* make(x0,y0,x1,y1,paint[,pad,k]) — sprite covering the local box [x0,x1]×[y0,y1] around the shape's origin at device scale k (default: ctx's current scale); paint(g) draws with context g */
  make(x0,y0,x1,y1,paint,pad,k){ pad = pad==null? 2 : pad; k = k||ctx.getTransform().a||1; x0=Math.floor(x0)-pad; y0=Math.floor(y0)-pad; const pw=Math.max(1,Math.ceil((Math.ceil(x1)+pad-x0)*k)), ph=Math.max(1,Math.ceil((Math.ceil(y1)+pad-y0)*k));
    const c=document.createElement('canvas'); c.width=pw; c.height=ph; const g=c.getContext('2d'); g.setTransform(k,0,0,k,-x0*k,-y0*k); paint(g); return {c,x0,y0,w:pw/k,h:ph/k,k}; },
  /* draw(sp,x,y) — blit with the sprite's origin at (x,y) under the current transform; axis-aligned placements are snapped to device pixels (no resampling) */
  draw(sp,x,y){ const T=ctx.getTransform(); if(T.b===0&&T.c===0&&T.a===sp.k&&T.d===sp.k){ ctx.setTransform(1,0,0,1,0,0); ctx.drawImage(sp.c, Math.round(T.e+(x+sp.x0)*sp.k), Math.round(T.f+(y+sp.y0)*sp.k)); ctx.setTransform(sp.k,0,0,sp.k,T.e,T.f); } else ctx.drawImage(sp.c,x+sp.x0,y+sp.y0,sp.w,sp.h); },
  /* drawRot(sp,x,y,a[,sx,sy]) — same, rotated by a (and scaled) about the sprite origin; no save/restore */
  drawRot(sp,x,y,a,sx,sy){ if(!a && sx==null) return SPR.draw(sp,x,y); const T=ctx.getTransform(); ctx.translate(x,y); if(a) ctx.rotate(a); if(sx!=null) ctx.scale(sx, sy==null? sx : sy); ctx.drawImage(sp.c,sp.x0,sp.y0,sp.w,sp.h); ctx.setTransform(T.a,T.b,T.c,T.d,T.e,T.f); },
  /* probe() — once per page, on a scratch canvas: how much does this canvas backend charge per path op, per filled pixel, per blitted pixel
     (axis-aligned copy vs rotated/bilinear) and per blit call? ~50 ms once on a software canvas, a few ms on a GPU one. */
  probe(){ if(SPR._p) return SPR._p; let p={op:1,fill:0,b0:0,blit:0,rot:0};
    try{ const k=ctx.getTransform().a||1, N=80; const c=document.createElement('canvas'); c.width=c.height=Math.ceil(420*k); const g=c.getContext('2d'); g.setTransform(k,0,0,k,0,0);
      const sp=SPR.make(-102,-72,102,72,q=>{ q.fillStyle='#2E6FE0'; q.strokeStyle='#151412'; q.lineWidth=4; q.beginPath(); q.ellipse(0,0,98,66,0,0,7); q.fill(); q.stroke(); }); const area=sp.c.width*sp.c.height;
      const tiny=SPR.make(-6,-6,6,6,q=>{ q.fillStyle='#2E6FE0'; q.fillRect(-6,-6,12,12); });
      const flush=()=>g.getImageData(0,0,1,1); const px=i=>110+(i%7)*30, py=i=>110+(i%5)*40;
      const time=f=>{ let best=Infinity; for(let r=0;r<2;r++){ g.clearRect(0,0,420,420); flush(); const t0=performance.now(); for(let i=0;i<N;i++) f(i); flush(); best=Math.min(best,performance.now()-t0); } return best; };
      const ell=(i,rx,ry)=>{ g.fillStyle='#2E6FE0'; g.strokeStyle='#151412'; g.lineWidth=4; g.beginPath(); g.ellipse(px(i),py(i),rx,ry,(i%3)*0.3,0,7); g.fill(); g.stroke(); };
      const t0=time(()=>{}), tSmall=time(i=>ell(i,12,7))-t0, tBig=time(i=>ell(i,98,66))-t0;
      const tRot=time(i=>{ g.translate(px(i),py(i)); g.rotate((i%3)*0.3); g.drawImage(sp.c,sp.x0,sp.y0,sp.w,sp.h); g.setTransform(k,0,0,k,0,0); })-t0;
      const tBlit=time(i=>{ g.setTransform(1,0,0,1,0,0); g.drawImage(sp.c,Math.round((px(i)+sp.x0)*k),Math.round((py(i)+sp.y0)*k)); g.setTransform(k,0,0,k,0,0); })-t0;
      const tTiny=time(i=>{ g.setTransform(1,0,0,1,0,0); g.drawImage(tiny.c,Math.round((px(i)-6)*k),Math.round((py(i)-6)*k)); g.setTransform(k,0,0,k,0,0); })-t0;
      const nz=v=>Math.max(0,v); p={ op: nz(tSmall)/(N*2), fill: nz(tBig-tSmall)/(N*Math.PI*98*66*k*k), b0: nz(tTiny)/N, blit: nz(tBlit-tTiny)/(N*area), rot: nz(tRot-tTiny)/(N*area) }; }catch(e){}
    SPR._p=p; return p; },
  /* shape(x0,y0,x1,y1,paint,ops[,pad]) — a static shape drawn by paint(g), which issues about `ops` fill/stroke calls (count a fillText as 3; Infinity = always use the sprite).
     .draw(x,y) places its origin at (x,y) under the current transform, .drawRot(x,y,a[,sx,sy]) rotates/scales it about the origin. Each placement
     uses the sprite or re-paints the vector shape in place (no save/restore), whichever the probe's cost model says is cheaper on this device
     (a mostly-empty box or a big rotated blit loses on a software canvas; a GPU canvas blits nearly for free). Pixels are the same either way.
     paint(g) must set every style it uses and leave lineCap/lineJoin at their defaults. */
  shape(x0,y0,x1,y1,paint,ops,pad){ const p=SPR.probe(); const k0=ctx.getTransform().a||1; const pd=pad==null?2:pad; const box=(Math.ceil(x1)+pd-Math.floor(x0)+pd)*(Math.ceil(y1)+pd-Math.floor(y0)+pd)*k0*k0;
    const vcost=(ops||8)*p.op + box*0.5*p.fill; const useAligned = ops===Infinity || p.b0+box*p.blit < vcost, useRot = ops===Infinity || p.b0+box*p.rot < vcost; let sp=null; const get=()=>sp||(sp=SPR.make(x0,y0,x1,y1,paint,pad,k0)); // built lazily, at the scale captured here (ctx may be mid-transform when first drawn)
    const vec=(x,y,a,sx,sy)=>{ const T=ctx.getTransform(); ctx.translate(x,y); if(a) ctx.rotate(a); if(sx!=null) ctx.scale(sx, sy==null? sx : sy); paint(ctx); ctx.setTransform(T.a,T.b,T.c,T.d,T.e,T.f); };
    return { paint, useAligned, useRot,
      draw(x,y){ const T=ctx.getTransform(); if(T.b===0&&T.c===0&&T.a===k0&&T.d===k0){ if(useAligned){ const q=get(); ctx.setTransform(1,0,0,1,0,0); ctx.drawImage(q.c, Math.round(T.e+(x+q.x0)*k0), Math.round(T.f+(y+q.y0)*k0)); ctx.setTransform(k0,0,0,k0,T.e,T.f); } else vec(x,y); }
        else if(useRot){ const q=get(); ctx.drawImage(q.c,x+q.x0,y+q.y0,q.w,q.h); } else vec(x,y); },
      drawRot(x,y,a,sx,sy){ if(!a && sx==null) return this.draw(x,y); if(useRot) SPR.drawRot(get(),x,y,a,sx,sy); else vec(x,y,a,sx,sy); } }; },
  /* cached(map,key,build) — memoise a shape/sprite per pose/scale */
  cached(map,key,build){ let sp=map.get(key); if(!sp){ sp=build(); map.set(key,sp); } return sp; },
  /* the blue donkey's static parts (body, neck, head, ears) in local coords for scale s — shared by several animations */
  donkeyBase(g,s){ g.fillStyle='#2E6FE0'; g.strokeStyle=C.ink; g.lineWidth=4; SPR.rr(g,-s*0.9,-s*0.45,s*1.8,s*0.9,s*0.3); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(s*0.8,-s*0.4); g.lineTo(s*1.25,-s*0.95); g.lineTo(s*1.5,-s*0.8); g.lineTo(s*1.05,-s*0.2); g.closePath(); g.fill(); g.stroke();
    SPR.rr(g,s*1.15,-s*1.15,s*0.75,s*0.5,s*0.15); g.fill(); g.stroke();
    g.fillStyle='#FFE34D'; for(const ex of [s*1.2,s*1.45]){ g.beginPath(); g.moveTo(ex,-s*1.1); g.lineTo(ex+s*0.1,-s*1.55); g.lineTo(ex+s*0.22,-s*1.1); g.closePath(); g.fill(); g.stroke(); } },
  /* the donkey's four galloping legs (angle sin(ph+lx)*0.6*d), drawn on the main ctx with the current fill/stroke; no per-leg save/restore */
  donkeyLegs(s,ph){ for(const [lx,d] of [[-s*0.7,1],[-s*0.3,-1],[s*0.3,1],[s*0.7,-1]]){ const a=Math.sin(ph+lx)*0.6*d; ctx.translate(lx,s*0.4); ctx.rotate(a); ctx.fillRect(-s*0.09,0,s*0.18,s*0.5); ctx.strokeRect(-s*0.09,0,s*0.18,s*0.5); ctx.rotate(-a); ctx.translate(-lx,-s*0.4); } },
};
// run the probe while the page is idle so the first celebration doesn't pay for it (it runs lazily on first use otherwise)
if(typeof requestIdleCallback==='function') requestIdleCallback(()=>SPR.probe(),{timeout:8000}); else setTimeout(()=>SPR.probe(),3000);
Object.assign(ANIMS, {
  /* 9 — a T. rex stomps in and roars the state off its feet */
  trex({W,H,r,hit,shake}){
    const A = {dur:9, struck:false, struckAt:0}; const S=Math.min(H*0.5,520); let lastStep=-1; const st = STATES[r.st]||STATES.TX; const path=new Path2D(st.d); const sc=Math.min(H*0.3/300,1.4);
    const rex=(x,y,s,t,roar)=>{ ctx.save(); ctx.translate(x,y); const step=Math.sin(t*6); ctx.translate(0,Math.abs(step)*-s*0.04);
      ctx.fillStyle='#2E6FE0'; ctx.strokeStyle=C.ink; ctx.lineWidth=6;
      // tail, body
      ctx.beginPath(); ctx.moveTo(-s*0.3,-s*0.35); ctx.quadraticCurveTo(-s*0.9,-s*0.45,-s*1.1,-s*0.1); ctx.quadraticCurveTo(-s*0.8,-s*0.2,-s*0.3,-s*0.1); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0,-s*0.35,s*0.42,s*0.3,-0.2,0,7); ctx.fill(); ctx.stroke();
      // legs
      for(const [lx,ph] of [[-s*0.05,0],[s*0.18,Math.PI]]){ ctx.save(); ctx.translate(lx,-s*0.15); ctx.rotate(Math.sin(t*6+ph)*0.5); ctx.fillRect(-s*0.08,0,s*0.16,s*0.45); ctx.strokeRect(-s*0.08,0,s*0.16,s*0.45); ctx.fillRect(-s*0.08,s*0.42,s*0.3,s*0.08); ctx.strokeRect(-s*0.08,s*0.42,s*0.3,s*0.08); ctx.restore(); }
      // neck + head + jaw
      ctx.beginPath(); ctx.moveTo(s*0.3,-s*0.55); ctx.lineTo(s*0.55,-s*0.95); ctx.lineTo(s*0.75,-s*0.85); ctx.lineTo(s*0.4,-s*0.35); ctx.closePath(); ctx.fill(); ctx.stroke();
      roundRect(s*0.55,-s*1.1,s*0.55,s*0.28,s*0.08); ctx.fill(); ctx.stroke();
      ctx.save(); ctx.translate(s*0.58,-s*0.82); ctx.rotate(roar? 0.55+Math.sin(t*30)*0.05 : 0.08); roundRect(0,0,s*0.5,s*0.16,s*0.05); ctx.fill(); ctx.stroke(); ctx.fillStyle='#fff'; for(let i=0;i<5;i++){ ctx.beginPath(); ctx.moveTo(s*0.08+i*s*0.09,0); ctx.lineTo(s*0.12+i*s*0.09,s*0.07); ctx.lineTo(s*0.16+i*s*0.09,0); ctx.fill(); } ctx.restore();
      // tiny arms, googly eye
      ctx.fillStyle='#2E6FE0'; ctx.fillRect(s*0.35,-s*0.45,s*0.14,s*0.05); ctx.strokeRect(s*0.35,-s*0.45,s*0.14,s*0.05);
      ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(s*0.78,-s*1.0,s*0.07,0,7); ctx.fill(); ctx.fillStyle=C.ink; ctx.beginPath(); ctx.arc(s*0.8,-s*0.99,s*0.03,0,7); ctx.fill();
      ctx.restore(); };
    A.frame = t=>{
      const x = Math.min(W*0.42, -S + t*(W*0.42+S)/2.2); const gy=H*0.82;
      const stepN=Math.floor(t*6/Math.PI); if(stepN!==lastStep && x<W*0.42){ lastStep=stepN; SFX.stomp(); shake(); }
      // the state, cowering, then launched
      const fly = A.struck? Math.min(1,(t-A.struckAt)/1.2) : 0; const sx = W*0.7 + fly*W*0.5, sy = gy - 60 - Math.sin(fly*Math.PI)*H*0.5;
      ctx.save(); ctx.translate(sx,sy); ctx.rotate(fly*6 + (A.struck?0:Math.sin(t*25)*0.04)); ctx.scale(sc,sc); ctx.translate(-st.c[0],-st.c[1]); ctx.fillStyle='#FFE34D'; ctx.strokeStyle=C.ink; ctx.lineWidth=4/sc; ctx.fill(path); ctx.stroke(path); ctx.restore();
      ctx.fillStyle=C.ink; ctx.font=`900 ${Math.round(H*0.05)}px Archivo, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(r.st, sx, sy);
      rex(x, gy, S, t, A.struck && t<A.struckAt+1.5);
      if(!A.struck && x>=W*0.42){ A.struck=true; A.struckAt=t; hit('RAWR!','roar'); } };
    return A;
  },
  /* 10 — wrecking ball through a brick wall */
  wrecking({W,H,r,hit}){
    const A = {dur:9, struck:false, struckAt:0}; SFX.creak(); const bw=Math.min(W*0.07,120), bh=bw*0.5, cols=4, rows=Math.floor(H*0.62/bh); const wx=W*0.62, wy=H*0.9;
    const bricks=[]; for(let i=0;i<rows;i++) for(let j=0;j<cols;j++) bricks.push({x:wx+j*bw+(i%2?bw/2:0), y:wy-(i+1)*bh, vx:0,vy:0,va:0,a:0,hit:false});
    const px=W*0.2, py=-40, L=H*0.75, R=Math.min(H*0.12,120);
    const brickSp=SPR.shape(-bw/2,-bh/2,bw/2,bh/2,g=>{ g.fillStyle='#F0562A'; g.strokeStyle=C.ink; g.lineWidth=3; g.fillRect(-bw/2+2,-bh/2+2,bw-4,bh-4); g.strokeRect(-bw/2+2,-bh/2+2,bw-4,bh-4); },2); // all bricks are identical → one sprite
    A.frame = t=>{
      const ang = t<1.6? -1.2 : Math.max(0.05, 1.2-(t-1.6)*1.1) * -Math.cos((t-1.6)*2.2) ; const swing = t<1.6? -1.2 + 0 : ang; // hold back then release
      const a = t<1.6? -1.2 : -1.2*Math.cos((t-1.6)*2.0)*Math.exp(-(t-1.6)*0.25);
      const bx = px + Math.sin(-a)*L, by = py + Math.cos(a)*L;
      ctx.strokeStyle=C.ink; ctx.lineWidth=8; ctx.beginPath(); ctx.moveTo(px,py); ctx.lineTo(bx,by); ctx.stroke();
      // wall
      for(const b of bricks){ if(b.hit){ b.vy+=0.9; b.x+=b.vx; b.y+=b.vy; b.a+=b.va; } brickSp.drawRot(b.x+bw/2,b.y+bh/2,b.a); }
      // ball
      ctx.save(); ctx.translate(bx,by); const g=ctx.createRadialGradient(-R*.3,-R*.3,R*.1,0,0,R); g.addColorStop(0,'#6f6c66'); g.addColorStop(1,'#1c1b19'); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(0,0,R,0,7); ctx.fill(); ctx.strokeStyle=C.ink; ctx.lineWidth=5; ctx.stroke();
      ctx.fillStyle='#FFE34D'; ctx.font=`900 ${Math.round(R*0.7)}px Archivo, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('D',0,2); ctx.restore();
      if(!A.struck && bx+R>=wx && t>1.6){ A.struck=true; A.struckAt=t; hit('SMASH!','crash'); for(const b of bricks){ b.hit=true; b.vx=rr(4,30)*(b.y<by+100?1:0.6); b.vy=-rr(4,26); b.va=rr(-.4,.4); } } };
    return A;
  },
  /* 11 — jetpack donkey, rainbow contrail, zero chill */
  jetpack({W,H,hit}){
    const A = {dur:8.5, struck:false, struckAt:0}; SFX.jet(); const S=Math.min(H*0.1,110); const trail=[]; const cols=['#F0562A','#FFE34D','#2E6FE0','#7FAAF6','#BBD0F5'];
    const donkey=(x,y,s,t,ang)=>{ ctx.save(); ctx.translate(x,y); ctx.rotate(ang); ctx.fillStyle='#2E6FE0'; ctx.strokeStyle=C.ink; ctx.lineWidth=4;
      // jetpack + flame
      ctx.fillStyle='#8C8A84'; roundRect(-s*0.9,-s*0.35,s*0.5,s*0.8,s*0.12); ctx.fill(); ctx.stroke(); ctx.fillStyle='#FFE34D'; ctx.beginPath(); ctx.moveTo(-s*0.9,s*0.45); ctx.lineTo(-s*0.65,s*0.45); ctx.lineTo(-s*0.78,s*(0.9+Math.random()*0.5)); ctx.closePath(); ctx.fill(); ctx.fillStyle='#F0562A'; ctx.beginPath(); ctx.moveTo(-s*0.85,s*0.45); ctx.lineTo(-s*0.7,s*0.45); ctx.lineTo(-s*0.78,s*(0.7+Math.random()*0.3)); ctx.closePath(); ctx.fill();
      ctx.fillStyle='#2E6FE0'; roundRect(-s*0.5,-s*0.45,s*1.4,s*0.9,s*0.3); ctx.fill(); ctx.stroke();
      for(const lx of [-s*0.2,s*0.2,s*0.6]){ ctx.save(); ctx.translate(lx,s*0.4); ctx.rotate(Math.sin(t*20+lx)*0.4); ctx.fillRect(-s*0.08,0,s*0.16,s*0.4); ctx.strokeRect(-s*0.08,0,s*0.16,s*0.4); ctx.restore(); }
      ctx.beginPath(); ctx.moveTo(s*0.8,-s*0.4); ctx.lineTo(s*1.25,-s*0.95); ctx.lineTo(s*1.5,-s*0.8); ctx.lineTo(s*1.05,-s*0.2); ctx.closePath(); ctx.fill(); ctx.stroke();
      roundRect(s*1.15,-s*1.15,s*0.75,s*0.5,s*0.15); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#FFE34D'; for(const ex of [s*1.2,s*1.45]){ ctx.beginPath(); ctx.moveTo(ex,-s*1.1); ctx.lineTo(ex+s*0.1,-s*1.55); ctx.lineTo(ex+s*0.22,-s*1.1); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      // aviator goggles
      ctx.fillStyle=C.ink; ctx.beginPath(); ctx.arc(s*1.55,-s*1.0,s*0.14,0,7); ctx.arc(s*1.82,-s*1.0,s*0.14,0,7); ctx.fill(); ctx.fillStyle='#7FAAF6'; ctx.beginPath(); ctx.arc(s*1.55,-s*1.0,s*0.09,0,7); ctx.arc(s*1.82,-s*1.0,s*0.09,0,7); ctx.fill();
      ctx.restore(); };
    A.frame = t=>{
      const u = Math.min(1, t/4.2); const x = -S*3 + u*(W+S*6); const y = H*0.5 + Math.sin(u*Math.PI*3)*H*0.28; const ang = Math.cos(u*Math.PI*3)*0.5;
      if(x<W+S*3){ trail.push({x:x-S*0.9,y:y+S*0.1,a:1}); }
      for(let i=0;i<trail.length;i++){ const p=trail[i]; p.a-=0.012; if(p.a<=0) continue; ctx.globalAlpha=Math.max(0,p.a); for(let k=0;k<5;k++){ ctx.fillStyle=cols[k]; ctx.fillRect(p.x-6,p.y-20+k*8,12,8); } }
      ctx.globalAlpha=1; while(trail.length && trail[0].a<=0) trail.shift();
      if(x<W+S*3) donkey(x,y,S,t,ang);
      if(!A.struck && u>=0.5){ A.struck=true; A.struckAt=t; hit('ZOOM!','zoom'); } };
    return A;
  },
  /* 12 — the state gets shot out of a circus cannon */
  cannon({W,H,r,hit}){
    const A = {dur:8.5, struck:false, struckAt:0}; SFX.fuse(); const st = STATES[r.st]||STATES.TX; const path=new Path2D(st.d); const sc=Math.min(H*0.28/300,1.3);
    const cx=W*0.14, cy=H*0.82, L=Math.min(W*0.2,320), ang=-0.75; const smoke=[]; let net=0;
    A.frame = t=>{
      // fuse sparkle
      if(t<1.5){ ctx.fillStyle='#FFE34D'; for(let i=0;i<6;i++){ ctx.beginPath(); ctx.arc(cx-L*0.3+rr(-12,12), cy-L*0.35-rr(0,20), rr(2,6),0,7); ctx.fill(); } }
      // flight
      const f = A.struck? (t-A.struckAt) : 0; const vx=W*0.18, vy=-H*0.33; const sx = cx + Math.cos(ang)*L + vx*f, sy = cy + Math.sin(ang)*L + vy*f + 0.5*H*0.08*f*f;
      if(A.struck && f<0.6){ smoke.push({x:cx+Math.cos(ang)*L, y:cy+Math.sin(ang)*L, r:rr(20,60), vx:rr(-2,4), vy:rr(-4,1), a:1}); }
      for(const m of smoke){ m.x+=m.vx; m.y+=m.vy; m.r+=1.2; m.a-=0.012; ctx.globalAlpha=Math.max(0,m.a)*0.6; ctx.fillStyle='#9A978F'; ctx.beginPath(); ctx.arc(m.x,m.y,m.r,0,7); ctx.fill(); } ctx.globalAlpha=1;
      // cannon
      ctx.save(); ctx.translate(cx,cy); ctx.rotate(ang + (A.struck&&f<0.3? -0.25*(0.3-f)/0.3 : 0)); ctx.fillStyle='#F0562A'; ctx.strokeStyle=C.ink; ctx.lineWidth=6; roundRect(-L*0.1,-L*0.22,L*1.1,L*0.44,L*0.1); ctx.fill(); ctx.stroke(); ctx.fillStyle='#FFE34D'; for(let i=0;i<4;i++) ctx.fillRect(L*0.15+i*L*0.22,-L*0.22,L*0.08,L*0.44); ctx.restore();
      ctx.fillStyle=C.ink; ctx.beginPath(); ctx.arc(cx,cy+L*0.05,L*0.25,0,7); ctx.fill(); ctx.fillStyle='#FFE34D'; ctx.beginPath(); ctx.arc(cx,cy+L*0.05,L*0.1,0,7); ctx.fill();
      // the state projectile
      if(!A.struck || sy<H+200){ const inside = !A.struck; ctx.save(); ctx.translate(inside? cx+Math.cos(ang)*L*0.5 : sx, inside? cy+Math.sin(ang)*L*0.5 : sy); ctx.rotate(f*5); ctx.scale(sc*(inside?0.5:1),sc*(inside?0.5:1)); ctx.translate(-st.c[0],-st.c[1]); ctx.fillStyle='#2E6FE0'; ctx.strokeStyle=C.ink; ctx.lineWidth=4/sc; ctx.fill(path); ctx.stroke(path); ctx.restore(); if(!inside){ ctx.fillStyle=C.ink; ctx.font=`900 ${Math.round(H*0.05)}px Archivo, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(r.st, sx, sy); } }
      // landing net
      ctx.strokeStyle=C.ink; ctx.lineWidth=3; const nx=W*0.78, nw=W*0.18, ny=H*0.75; ctx.beginPath(); for(let i=0;i<=6;i++){ ctx.moveTo(nx+i*nw/6, ny); ctx.lineTo(nx+i*nw/6, ny+H*0.18 - Math.sin(i/6*Math.PI)*net*40); } for(let j=0;j<=4;j++){ ctx.moveTo(nx, ny+j*H*0.045); ctx.lineTo(nx+nw, ny+j*H*0.045); } ctx.stroke();
      if(A.struck && sx>nx && net<1) net=Math.min(1,net+0.08);
      if(!A.struck && t>=1.5){ A.struck=true; A.struckAt=t; hit('KABLAM!','cannon'); } };
    return A;
  },
  /* 13 — disco: mirror ball drops, the state dances */
  disco({W,H,r,hit}){
    const A = {dur:9, struck:false, struckAt:0}; SFX.beat(18); const st = STATES[r.st]||STATES.TX; const path=new Path2D(st.d); const sc=Math.min(H*0.4/300,1.8); const R=Math.min(H*0.12,120);
    A.frame = t=>{
      const by = Math.min(H*0.2, -R + t*H*0.25); const beat = (t*2.17)%1; const bump = Math.exp(-beat*6);
      // spotlights
      ctx.save(); ctx.globalCompositeOperation = document.documentElement.dataset.theme==='dark'? 'screen' : 'multiply'; for(let i=0;i<5;i++){ const a = Math.sin(t*1.3+i*1.3)*0.9; const col=['#F0562A','#2E6FE0','#FFE34D','#7FAAF6','#F0562A'][i]; ctx.fillStyle=col; ctx.globalAlpha=0.28; ctx.beginPath(); ctx.moveTo(W*(0.1+i*0.2), -10); ctx.lineTo(W*(0.1+i*0.2)+Math.sin(a)*W*0.6-W*0.08, H+10); ctx.lineTo(W*(0.1+i*0.2)+Math.sin(a)*W*0.6+W*0.08, H+10); ctx.closePath(); ctx.fill(); } ctx.restore();
      // mirror ball
      ctx.strokeStyle=C.ink; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(W/2,-10); ctx.lineTo(W/2,by-R); ctx.stroke();
      ctx.save(); ctx.translate(W/2,by); ctx.fillStyle='#BBD0F5'; ctx.beginPath(); ctx.arc(0,0,R,0,7); ctx.fill(); ctx.strokeStyle=C.ink; ctx.lineWidth=4; ctx.stroke();
      ctx.beginPath(); ctx.arc(0,0,R,0,7); ctx.clip(); ctx.strokeStyle='rgba(21,20,18,.35)'; ctx.lineWidth=2; for(let i=-R;i<=R;i+=R/5){ ctx.beginPath(); ctx.moveTo(-R,i); ctx.lineTo(R,i); ctx.stroke(); } for(let i=-R;i<=R;i+=R/5){ const x=i+((t*120)%(R/5)); ctx.beginPath(); ctx.moveTo(x,-R); ctx.lineTo(x,R); ctx.stroke(); }
      ctx.fillStyle='rgba(255,255,255,.8)'; for(let i=0;i<12;i++){ const a=t*2+i; ctx.fillRect(Math.cos(a)*R*0.8-4, Math.sin(a*1.7)*R*0.8-4, 8,8); } ctx.restore();
      // glints flying around the room
      ctx.fillStyle='rgba(255,255,255,.7)'; for(let i=0;i<40;i++){ const a=t*0.7+i*0.157; ctx.fillRect(W/2+Math.cos(a)*W*0.45*((i%5)/5+0.3), by+Math.sin(a*1.3+i)*H*0.5, 6,6); }
      // the state, dancing
      const sx=W/2, sy=H*0.62 - bump*H*0.08; ctx.save(); ctx.translate(sx,sy); ctx.rotate(Math.sin(t*4.34)*0.25); ctx.scale(sc*(1+bump*0.12), sc*(1-bump*0.1)); ctx.translate(-st.c[0],-st.c[1]); ctx.fillStyle='#2E6FE0'; ctx.strokeStyle=C.ink; ctx.lineWidth=4/sc; ctx.fill(path); ctx.stroke(path); ctx.restore();
      // sunglasses on the state
      ctx.fillStyle=C.ink; roundRect(sx-70,sy-22,60,34,8); ctx.fill(); roundRect(sx+10,sy-22,60,34,8); ctx.fill(); ctx.fillRect(sx-12,sy-14,24,6);
      if(!A.struck && by>=H*0.2){ A.struck=true; A.struckAt=t; hit('BOOGIE!','dance'); } };
    return A;
  },
  /* ===== FINALE: Democrats take the House (≈32 s) ===== */
  houseFinale({W,H,hit,banner,shake,spawnConfetti}){
    const A = {dur:32, struck:false, struckAt:0}; const fired={}; const once=(k,f)=>{ if(!fired[k]){ fired[k]=true; f(); } };
    const S=Math.min(H*0.08,86); const herd=[...Array(14)].map((_,i)=>({x:-S*3-i*S*2.6, y:H*0.78-((i%3)*S*0.5), s:S*(0.85+(i%3)*0.12), ph:i})); const sparks=[]; let gavelA=-1.4, bricks=[]; const seatsTotal=218; const tiles=[];
    const burst=(x,y,n,c)=>{ for(let i=0;i<n;i++){ const a=Math.random()*Math.PI*2, v=rr(2,14); sparks.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:rr(1.2,2.4),age:0,c,r:rr(3,7)}); } };
    const cache=new Map(); // static donkey (body, head, ears, party hat, kazoo, eye) per size → sprite; legs stay live on top
    const body=s=>SPR.cached(cache,s,()=>SPR.shape(-s*0.95,-s*1.8,s*2.35,s*0.5,g=>{ SPR.donkeyBase(g,s);
      g.fillStyle='#F0562A'; g.beginPath(); g.moveTo(s*1.35,-s*1.15); g.lineTo(s*1.55,-s*1.75); g.lineTo(s*1.75,-s*1.15); g.closePath(); g.fill(); g.stroke(); g.fillStyle='#FFE34D'; g.fillRect(s*1.9,-s*0.95,s*0.4,s*0.1);
      g.fillStyle='#fff'; g.beginPath(); g.arc(s*1.7,-s*0.98,s*0.11,0,7); g.fill(); g.fillStyle=C.ink; g.beginPath(); g.arc(s*1.73,-s*0.97,s*0.05,0,7); g.fill(); },15));
    const donkey=(x,y,s,t)=>{ const yy=y+Math.sin(t*14)*s*0.06; ctx.translate(x,yy); body(s).draw(0,0); ctx.fillStyle='#2E6FE0'; ctx.strokeStyle=C.ink; ctx.lineWidth=4; SPR.donkeyLegs(s,t*14); ctx.translate(-x,-yy); };
    const capitol=(x,y,w,rise)=>{ ctx.save(); ctx.translate(x,y+(1-rise)*H*0.6); ctx.fillStyle='#fff'; ctx.strokeStyle=C.ink; ctx.lineWidth=5;
      ctx.fillRect(-w/2,-w*0.18,w,w*0.18); ctx.strokeRect(-w/2,-w*0.18,w,w*0.18); for(let i=0;i<9;i++){ ctx.fillStyle=C.ink; ctx.fillRect(-w/2+w*0.06+i*w*0.1,-w*0.15,w*0.025,w*0.12); } ctx.fillStyle='#fff';
      ctx.fillRect(-w*0.2,-w*0.3,w*0.4,w*0.12); ctx.strokeRect(-w*0.2,-w*0.3,w*0.4,w*0.12); ctx.beginPath(); ctx.arc(0,-w*0.3,w*0.17,Math.PI,0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#2E6FE0'; ctx.beginPath(); ctx.arc(0,-w*0.3,w*0.17,Math.PI,0); ctx.fill(); ctx.fillStyle='#fff'; ctx.fillRect(-w*0.015,-w*0.56,w*0.03,w*0.1); ctx.fillStyle='#FFE34D'; ctx.beginPath(); ctx.arc(0,-w*0.58,w*0.03,0,7); ctx.fill(); ctx.restore(); };
    A.frame = t=>{
      // phase 1 (0-4): drumroll, Capitol rises, counter runs to 218
      const rise=Math.min(1,t/3); once('start',()=>{ SFX.fanfare(); shake(); }); capitol(W*0.5, H*0.82, Math.min(W*0.5,760), rise);
      if(t<5){ const n=Math.min(seatsTotal, Math.floor(seatsTotal*Math.min(1,t/3.5))); ctx.fillStyle=C.ink; ctx.font=`900 ${Math.round(H*0.22)}px Archivo, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(String(n), W*0.5, H*0.3); ctx.font=`700 ${Math.round(H*0.04)}px Archivo, sans-serif`; ctx.fillText('seats', W*0.5, H*0.43); if(Math.floor(t*20)%2===0 && t<3.5) SFX.countTick(); }
      if(t>=3.6) once('b1',()=>{ banner('218!', 2.2); shake(); SFX.bigHit(); spawnConfetti(500); burst(W*0.5,H*0.3,300,'#FFE34D'); });
      // phase 2 (5-14): the parade
      if(t>=5){ once('parade',()=>{ SFX.gallop(); setTimeout(()=>SFX.gallop(), 3800); }); for(const d of herd){ d.x += W/150; donkey(d.x,d.y,d.s,t+d.ph); }
        // the banner carried by the first two donkeys
        const lead=herd[0]; if(lead.x>-S*4){ ctx.save(); ctx.translate(lead.x-S*3.2, lead.y-S*2.4); ctx.fillStyle='#FFE34D'; ctx.strokeStyle=C.ink; ctx.lineWidth=4; const bw=S*6.2, bhh=S*1.1; ctx.beginPath(); ctx.moveTo(0,0); for(let i=0;i<=20;i++) ctx.lineTo(i*bw/20, Math.sin(i*0.9+t*8)*6); ctx.lineTo(bw,bhh); for(let i=20;i>=0;i--) ctx.lineTo(i*bw/20, bhh+Math.sin(i*0.9+t*8)*6); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle=C.ink; ctx.font=`900 ${Math.round(S*0.6)}px Archivo, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('WE GOT THE HOUSE', bw/2, bhh/2); ctx.restore(); } }
      if(t>=6.5) once('b2',()=>banner('DEMOCRATS', 2));
      if(t>=9) once('b3',()=>banner('TAKE THE', 2));
      if(t>=11.5) once('b4',()=>{ banner('HOUSE!', 3); shake(); SFX.bigHit(); spawnConfetti(500); });
      // phase 3 (14-22): fireworks volleys + the gavel
      if(t>=14 && t<22 && Math.random()<0.12){ burst(rr(W*0.1,W*0.9), rr(H*0.1,H*0.5), 160, ['#FFE34D','#2E6FE0','#7FAAF6','#F0562A'][Math.floor(Math.random()*4)]); SFX.boom && null; }
      if(t>=14) once('fw',()=>{ SFX.anthem(); });
      for(const s of sparks){ s.age+=1/60; s.vy+=0.12; s.vx*=0.985; s.vy*=0.985; s.x+=s.vx; s.y+=s.vy; const a=Math.max(0,1-s.age/s.life); ctx.globalAlpha=a; ctx.fillStyle=s.c; const q=s.r*a+1; ctx.fillRect(s.x-q,s.y-q,q*2,q*2); } ctx.globalAlpha=1; for(let i=sparks.length-1;i>=0;i--) if(sparks[i].age>sparks[i].life) sparks.splice(i,1);
      if(t>=17){ // giant gavel slams three times
        const k=Math.floor((t-17)/1.6); const ph=((t-17)%1.6); const a = ph<0.4? -1.3+ph/0.4*1.5 : 0.2 - Math.min(1,(ph-0.4)/1.2)*1.5; const gx=W*0.8, gy=H*0.55, L=Math.min(H*0.3,320);
        if(ph<0.42 && ph>0.38 && k<3) once('gavel'+k,()=>{ SFX.gavel(); shake(); banner(['ORDER!','ORDER!!','ORDER!!!'][k],1.2); });
        ctx.save(); ctx.translate(gx,gy); ctx.rotate(a); ctx.fillStyle='#c98a4b'; ctx.strokeStyle=C.ink; ctx.lineWidth=6; roundRect(-L*0.06,-L,L*0.12,L,L*0.05); ctx.fill(); ctx.stroke(); roundRect(-L*0.3,-L*1.25,L*0.6,L*0.3,L*0.08); ctx.fill(); ctx.stroke(); ctx.restore();
        ctx.fillStyle='#c98a4b'; roundRect(gx-L*0.35, gy+L*0.05, L*0.7, L*0.08, 8); ctx.fill(); ctx.strokeStyle=C.ink; ctx.lineWidth=4; roundRect(gx-L*0.35, gy+L*0.05, L*0.7, L*0.08, 8); ctx.stroke(); }
      // phase 4 (22-32): the 218 seat tiles fill the screen, then the closing card
      if(t>=22){ once('tiles',()=>{ SFX.beat(20); const cols=Math.ceil(Math.sqrt(seatsTotal*W/H)), rows=Math.ceil(seatsTotal/cols); const tw=W/cols, th=H*0.8/rows; for(let i=0;i<seatsTotal;i++) tiles.push({x:(i%cols)*tw+tw*0.1, y:H*0.1+Math.floor(i/cols)*th+th*0.1, w:tw*0.8, h:th*0.8, at:22+i*(8/seatsTotal)}); });
        for(const tl of tiles){ if(t<tl.at) continue; const p=Math.min(1,(t-tl.at)*4); ctx.fillStyle='#2E6FE0'; ctx.globalAlpha=0.85; ctx.fillRect(tl.x+tl.w*(1-p)/2, tl.y+tl.h*(1-p)/2, tl.w*p, tl.h*p); } ctx.globalAlpha=1;
        if(t>=30) once('final',()=>{ banner('218 STRONG', 2.5); spawnConfetti(600); SFX.fanfare(); }); }
      if(!A.struck){ A.struck=true; A.struckAt=t; } };
    return A;
  },
  /* ===== FINALE: Democrats take the Senate (≈32 s) ===== */
  senateFinale({W,H,hit,banner,shake,spawnConfetti}){
    const A = {dur:32, struck:false, struckAt:0}; const fired={}; const once=(k,f)=>{ if(!fired[k]){ fired[k]=true; f(); } };
    const sparks=[]; const ufos=[...Array(5)].map((_,i)=>({x:-300-i*260, y:H*(0.15+i*0.08), w:Math.min(W*0.14,260)*(0.7+i*0.08)})); let cork={x:0,y:0,vx:0,vy:0,go:false}; const foam=[]; const seats=[]; const chairsN=51;
    const burst=(x,y,n,c)=>{ for(let i=0;i<n;i++){ const a=Math.random()*Math.PI*2, v=rr(2,14); sparks.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:rr(1.2,2.4),age:0,c,r:rr(3,7)}); } };
    const cache=new Map(); // saucers: one sprite per size × light-blink phase; chairs: one sprite per seat number (the numeral is baked in)
    const saucer=(ux,uy,uw,t)=>{ const p=Math.floor(t*6)&1; SPR.cached(cache,'u'+uw+':'+p,()=>SPR.shape(-uw*0.55,-uw*0.3,uw*0.55,uw*0.2,g=>{ g.fillStyle='#8C8A84'; g.strokeStyle=C.ink; g.lineWidth=5; g.beginPath(); g.ellipse(0,0,uw*0.5,uw*0.12,0,0,7); g.fill(); g.stroke(); g.fillStyle='#BBD0F5'; g.beginPath(); g.ellipse(0,-uw*0.08,uw*0.2,uw*0.13,0,Math.PI,0); g.fill(); g.stroke(); for(let i=-3;i<=3;i++){ g.fillStyle=(p+i)%2?'#FFE34D':'#F0562A'; g.beginPath(); g.arc(i*uw*0.12,uw*0.04,uw*0.022,0,7); g.fill(); } g.fillStyle='#fff'; g.beginPath(); g.arc(-uw*0.06,-uw*0.1,uw*0.035,0,7); g.arc(uw*0.06,-uw*0.1,uw*0.035,0,7); g.fill(); g.fillStyle=C.ink; g.beginPath(); g.arc(-uw*0.05,-uw*0.1,uw*0.015,0,7); g.arc(uw*0.07,-uw*0.1,uw*0.015,0,7); g.fill(); },13)).draw(ux,uy); };
    const chair=n=>SPR.cached(cache,'c'+n,()=>SPR.shape(-20,-72,20,2,g=>{ g.fillStyle='#2E6FE0'; g.strokeStyle=C.ink; g.lineWidth=3; SPR.rr(g,-18,-40,36,40,6); g.fill(); g.stroke(); g.fillRect(-18,-70,8,34); g.fillStyle='#fff'; g.font='900 16px Archivo, sans-serif'; g.textAlign='center'; g.textBaseline='middle'; g.fillText(String(n), 0, -20); },6));
    A.frame = t=>{
      once('start',()=>{ SFX.fanfare(); shake(); });
      // phase 1 (0-6): the number climbs 47 → 51 with slot-machine ticks, then slams
      if(t<7){ const n = 47 + Math.min(4, Math.floor(t/1.1)); ctx.fillStyle=C.ink; ctx.font=`900 ${Math.round(H*0.34)}px Archivo, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; const jitter = (t%1.1)<0.15? rr(-8,8):0; ctx.fillText(String(n), W*0.5+jitter, H*0.42); ctx.font=`700 ${Math.round(H*0.045)}px Archivo, sans-serif`; ctx.fillText('senate seats', W*0.5, H*0.64);
        for(let k=1;k<=4;k++) if(t>=k*1.1) once('tick'+k,()=>{ SFX.stop(); shake(); }); }
      if(t>=4.6) once('b1',()=>{ banner('51!', 2.4); SFX.bigHit(); spawnConfetti(500); burst(W*0.5,H*0.42,320,'#FFE34D'); });
      // phase 2 (7-15): the mothership fleet flyover, beaming down 51 little chairs
      if(t>=7){ once('fleet',()=>{ SFX.hum(); setTimeout(()=>SFX.hum(),2400); setTimeout(()=>SFX.hum(),4800); });
        for(const u of ufos){ u.x += W/260; saucer(u.x,u.y+Math.sin(t*2+u.w)*8,u.w,t); if(u.x>0 && u.x<W && Math.random()<0.25 && seats.length<chairsN){ seats.push({x:u.x+rr(-40,40), y:u.y, ty:H*0.86-rr(0,H*0.12), vy:0, n:seats.length+1}); } }
        for(const c of seats){ if(c.y<c.ty){ c.vy+=0.5; c.y=Math.min(c.ty,c.y+c.vy); } chair(c.n).draw(c.x, c.y); } }
      if(t>=8.5) once('b2',()=>banner('MAJORITY', 2));
      if(t>=11) once('b3',()=>banner('ACQUIRED', 2));
      if(t>=13.5) once('b4',()=>{ banner('SENATE: BLUE', 3); shake(); SFX.bigHit(); spawnConfetti(500); });
      // phase 3 (16-24): champagne
      if(t>=16){ const bx=W*0.5, by=H*0.9, bw=Math.min(W*0.12,220), bh=bw*2.4; const tilt=-0.35;
        ctx.save(); ctx.translate(bx,by); ctx.rotate(tilt); ctx.fillStyle='#1E4DA8'; ctx.strokeStyle=C.ink; ctx.lineWidth=6; roundRect(-bw/2,-bh*0.6,bw,bh*0.6,bw*0.2); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-bw/2,-bh*0.6); ctx.quadraticCurveTo(-bw/2,-bh*0.85,-bw*0.15,-bh*0.9); ctx.lineTo(-bw*0.15,-bh); ctx.lineTo(bw*0.15,-bh); ctx.lineTo(bw*0.15,-bh*0.9); ctx.quadraticCurveTo(bw/2,-bh*0.85,bw/2,-bh*0.6); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle='#FFE34D'; ctx.fillRect(-bw*0.4,-bh*0.45,bw*0.8,bh*0.2); ctx.fillStyle=C.ink; ctx.font=`900 ${Math.round(bw*0.22)}px Archivo, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('BRUT 51', 0, -bh*0.35);
          if(!cork.go){ ctx.fillStyle='#c98a4b'; roundRect(-bw*0.17,-bh*1.08,bw*0.34,bh*0.12,8); ctx.fill(); ctx.stroke(); } ctx.restore();
        if(t>=17.5) once('cork',()=>{ cork={x:bx+Math.sin(-tilt)*bh, y:by-Math.cos(tilt)*bh, vx:14, vy:-26, go:true}; SFX.cork(); shake(); banner('POP!', 2); });
        if(cork.go){ cork.vy+=0.6; cork.x+=cork.vx; cork.y+=cork.vy; ctx.save(); ctx.translate(cork.x,cork.y); ctx.rotate(t*8); ctx.fillStyle='#c98a4b'; ctx.strokeStyle=C.ink; ctx.lineWidth=4; roundRect(-22,-14,44,28,8); ctx.fill(); ctx.stroke(); ctx.restore();
          for(let i=0;i<6;i++) foam.push({x:bx+Math.sin(-tilt)*bh*0.98+rr(-10,10), y:by-Math.cos(tilt)*bh*0.98, vx:rr(2,14)+Math.sin(-tilt)*10, vy:-rr(6,20), r:rr(5,14), a:1});
          for(const f of foam){ f.vy+=0.5; f.x+=f.vx; f.y+=f.vy; f.a-=0.012; ctx.globalAlpha=Math.max(0,f.a); ctx.fillStyle='#FFE34D'; ctx.beginPath(); ctx.arc(f.x,f.y,f.r,0,7); ctx.fill(); } ctx.globalAlpha=1; for(let i=foam.length-1;i>=0;i--) if(foam[i].a<=0) foam.splice(i,1); } }
      if(t>=20) once('b5',()=>banner('CHEERS!', 2));
      // phase 4 (24-32): the big finish — 51 fireworks (one per seat) + closing banner
      if(t>=24){ once('fw',()=>{ SFX.anthem(); }); if(t<30 && Math.random()<0.18) burst(rr(W*0.08,W*0.92), rr(H*0.08,H*0.55), 150, ['#FFE34D','#2E6FE0','#7FAAF6','#ffffff'][Math.floor(Math.random()*4)]); }
      for(const s of sparks){ s.age+=1/60; s.vy+=0.12; s.vx*=0.985; s.vy*=0.985; s.x+=s.vx; s.y+=s.vy; const a=Math.max(0,1-s.age/s.life); ctx.globalAlpha=a; ctx.fillStyle=s.c; const q=s.r*a+1; ctx.fillRect(s.x-q,s.y-q,q*2,q*2); } ctx.globalAlpha=1; for(let i=sparks.length-1;i>=0;i--) if(sparks[i].age>sparks[i].life) sparks.splice(i,1);
      if(t>=26) once('b6',()=>{ banner('DEMOCRATS', 2); });
      if(t>=28.5) once('b7',()=>{ banner('TAKE THE SENATE', 3.4); shake(); SFX.bigHit(); SFX.fanfare(); spawnConfetti(700); });
      if(!A.struck){ A.struck=true; A.struckAt=t; } };
    return A;
  },
  /* 6 — a stampede of blue donkeys thunders across the screen */
  stampede({W,H,r,hit}){
    const A = {dur:8.5, struck:false, struckAt:0}; SFX.gallop(); const S=Math.min(H*0.09,95);
    const herd=[...Array(9)].map((_,i)=>({x:-S*3-i*S*2.2-Math.random()*S*2, y:H*(0.52+((i*7)%4)*0.09), v:W/110*(0.9+Math.random()*0.3), ph:Math.random()*6, s:S*(0.8+((i*5)%3)*0.15)}));
    const dust=[]; const cache=new Map();
    // body+head+ears+eye are static per size → one sprite per size; legs and tail stay live (legs sit over the body, head is clear of them, as before)
    const body=s=>SPR.cached(cache,s,()=>SPR.shape(-s*0.95,-s*1.6,s*1.95,s*0.5,g=>{ SPR.donkeyBase(g,s);
      g.fillStyle='#fff'; g.beginPath(); g.arc(s*1.7,-s*0.98,s*0.11,0,7); g.fill(); g.fillStyle=C.ink; g.beginPath(); g.arc(s*1.73,-s*0.97,s*0.05,0,7); g.fill(); },12));
    const donkey=(x,y,s,t)=>{ const bob=Math.sin(t*14)*s*0.08; ctx.translate(x,y+bob); body(s).draw(0,0); ctx.fillStyle='#2E6FE0'; ctx.strokeStyle=C.ink; ctx.lineWidth=4; SPR.donkeyLegs(s,t*14);
      ctx.strokeStyle=C.ink; ctx.lineWidth=6; ctx.beginPath(); ctx.moveTo(-s*0.9,-s*0.3); ctx.quadraticCurveTo(-s*1.5,-s*0.6+Math.sin(t*10)*s*0.3,-s*1.3,s*0.1); ctx.stroke(); ctx.translate(-x,-(y+bob)); };
    A.frame = t=>{
      for(const d of herd){ d.x+=d.v; if(Math.random()<0.5) dust.push({x:d.x-d.s,y:d.y+d.s*0.9,r:rr(6,18),a:1,vx:-rr(1,3),vy:-rr(0.5,2)}); donkey(d.x,d.y,d.s,t+d.ph); }
      for(const d of dust){ d.x+=d.vx; d.y+=d.vy; d.a-=0.02; d.r+=0.4; ctx.globalAlpha=Math.max(0,d.a)*0.5; ctx.fillStyle=C.ink; ctx.beginPath(); ctx.arc(d.x,d.y,d.r,0,7); ctx.fill(); } ctx.globalAlpha=1;
      for(let i=dust.length-1;i>=0;i--) if(dust[i].a<=0) dust.splice(i,1);
      if(!A.struck && herd[0].x>W*0.45){ A.struck=true; A.struckAt=t; hit('STAMPEDE!','bray'); } };
    return A;
  },
  /* 7 — a blue wave crashes across the whole screen */
  wave({W,H,hit}){
    const A = {dur:8, struck:false, struckAt:0}; SFX.surf(); const drops=[];
    A.frame = t=>{
      const front = -W*0.3 + (W*1.6)*Math.min(1,t/2.6);
      ctx.save(); ctx.beginPath(); ctx.moveTo(-50,H+50);
      for(let x=-50;x<=front+200;x+=12){ const d=front-x; const crest = d<0? 0 : Math.min(1,d/(W*0.35)); const y = H - H*0.62*crest - Math.sin(x/70+t*4)*18*crest - (d>-60&&d<120? Math.max(0,1-Math.abs(d-40)/100)*H*0.18 : 0); ctx.lineTo(x,y); }
      ctx.lineTo(front+200,H+50); ctx.closePath(); const g=ctx.createLinearGradient(0,H*0.3,0,H); g.addColorStop(0,'#4A86F0'); g.addColorStop(1,'#1E4DA8'); ctx.fillStyle=g; ctx.fill(); ctx.strokeStyle='#fff'; ctx.lineWidth=8; ctx.stroke(); ctx.restore();
      // foam at the lip
      for(let i=0;i<4;i++) drops.push({x:front+rr(-80,60), y:H*0.38+rr(-40,40), vx:rr(2,12), vy:-rr(2,9), r:rr(4,12), a:1});
      for(const d of drops){ d.x+=d.vx; d.y+=d.vy; d.vy+=0.35; d.a-=0.018; ctx.globalAlpha=Math.max(0,d.a); ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(d.x,d.y,d.r,0,7); ctx.fill(); } ctx.globalAlpha=1;
      for(let i=drops.length-1;i>=0;i--) if(drops[i].a<=0) drops.splice(i,1);
      if(!A.struck && front>W*0.6){ A.struck=true; A.struckAt=t; hit('BLUE WAVE!','splash'); } };
    return A;
  },
  /* 8 — a UFO beams the state up into the mothership */
  ufo({W,H,r,hit}){
    const A = {dur:8.5, struck:false, struckAt:0}; SFX.hum(); const st = STATES[r.st] || STATES.TX; const path = new Path2D(st.d); const sc = Math.min(H*0.42/300, 2);
    A.frame = t=>{
      const ux = W*0.5 + Math.sin(t*1.3)*W*0.04, uy = Math.min(H*0.22, -150 + t*220) + Math.sin(t*2.5)*10; const uw=Math.min(W*0.28,520);
      const lift = Math.max(0, Math.min(1,(t-2.2)/3.2)); const sy = H*0.72 - (H*0.72-uy)*lift; const spin = lift*Math.PI*4; const scale = sc*(1-lift*0.75);
      if(t>1.2){ // beam
        ctx.save(); ctx.globalAlpha=0.35+Math.sin(t*20)*0.1; const bg=ctx.createLinearGradient(0,uy,0,H); bg.addColorStop(0,'#FFE34D'); bg.addColorStop(1,'rgba(255,227,77,0)'); ctx.fillStyle=bg; ctx.beginPath(); ctx.moveTo(ux-uw*0.12,uy); ctx.lineTo(ux+uw*0.12,uy); ctx.lineTo(ux+uw*0.5,H); ctx.lineTo(ux-uw*0.5,H); ctx.closePath(); ctx.fill(); ctx.restore(); }
      // the state
      ctx.save(); ctx.translate(ux,sy); ctx.rotate(spin); ctx.scale(scale,scale); ctx.translate(-st.c[0],-st.c[1]); ctx.fillStyle='#2E6FE0'; ctx.strokeStyle=C.ink; ctx.lineWidth=4/scale; ctx.fill(path); ctx.stroke(path); ctx.restore();
      ctx.fillStyle=C.ink; ctx.font=`900 ${Math.round(H*0.05*(1-lift*0.6))}px Archivo, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(r.st, ux, sy);
      // saucer
      ctx.save(); ctx.translate(ux,uy); ctx.fillStyle='#8C8A84'; ctx.strokeStyle=C.ink; ctx.lineWidth=5; ctx.beginPath(); ctx.ellipse(0,0,uw*0.5,uw*0.12,0,0,7); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#BBD0F5'; ctx.beginPath(); ctx.ellipse(0,-uw*0.08,uw*0.2,uw*0.13,0,Math.PI,0); ctx.fill(); ctx.stroke();
      for(let i=-3;i<=3;i++){ ctx.fillStyle = (Math.floor(t*6)+i)%2? '#FFE34D':'#F0562A'; ctx.beginPath(); ctx.arc(i*uw*0.12, uw*0.04, uw*0.022,0,7); ctx.fill(); }
      // googly eyes in the dome, obviously
      ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(-uw*0.06,-uw*0.1,uw*0.035,0,7); ctx.arc(uw*0.06,-uw*0.1,uw*0.035,0,7); ctx.fill(); ctx.fillStyle=C.ink; ctx.beginPath(); ctx.arc(-uw*0.05+Math.sin(t*3)*uw*0.012,-uw*0.1,uw*0.015,0,7); ctx.arc(uw*0.07+Math.sin(t*3)*uw*0.012,-uw*0.1,uw*0.015,0,7); ctx.fill(); ctx.restore();
      if(!A.struck && lift>=1){ A.struck=true; A.struckAt=t; hit('ABDUCTED!','beam'); } };
    return A;
  },
  /* 1 — bowling strike with a googly-eyed ball */
  strike({W,H,hit}){
    const laneY = H*0.70, R = Math.min(H*0.11,120), px = W*0.72, pinW = R*0.55, pinH = R*1.9;
    const ball = {x:-R*2, y:laneY-R, vx:W/125, rot:0, r:R};
    const pins=[]; [[0],[-.5,.5],[-1,0,1],[-1.5,-.5,.5,1.5]].forEach((row,i)=>row.forEach(k=>pins.push({x:px+i*pinW*1.35, y:laneY-pinH, off:k*pinW*1.5, vx:0,vy:0,va:0,a:0,hit:false})));
    const A = {dur:8.5, struck:false, struckAt:0}; SFX.roll();
    // the ball (gradient, finger holes, googly eyes) and the pin are static shapes → one sprite each, drawn rotated
    const ballSp=SPR.shape(-R-1,-R-1,R+1,R+1,g=>{ const b=ball; const gr=g.createRadialGradient(-b.r*.35,-b.r*.35,b.r*.1,0,0,b.r); gr.addColorStop(0,'#5f93f2'); gr.addColorStop(1,'#1b3f8f'); g.fillStyle=gr; g.beginPath(); g.arc(0,0,b.r,0,7); g.fill();
      g.fillStyle='#0e2252'; [[-b.r*.25,-b.r*.3],[b.r*.1,-b.r*.4],[b.r*.3,-b.r*.05]].forEach(([x,y])=>{g.beginPath();g.arc(x,y,b.r*.11,0,7);g.fill();});
      g.fillStyle='#fff'; g.beginPath(); g.arc(-b.r*.3,b.r*.25,b.r*.2,0,7); g.arc(b.r*.1,b.r*.3,b.r*.2,0,7); g.fill(); g.fillStyle=C.ink; g.beginPath(); g.arc(-b.r*.25,b.r*.28,b.r*.09,0,7); g.arc(b.r*.15,b.r*.33,b.r*.09,0,7); g.fill(); },8);
    const drawBall=b=>ballSp.drawRot(b.x,b.y,b.rot);
    const pinSp=SPR.shape(-pinW*.65,-pinH*.7-pinW*.3,pinW*.65,pinH*.3+3,g=>{ g.translate(0,-pinH*.7); g.fillStyle='#fff'; g.strokeStyle=C.ink; g.lineWidth=3; // origin = the pin's rotation pivot (0.7 of the way down)
      g.beginPath(); g.moveTo(-pinW*.25,0); g.quadraticCurveTo(-pinW*.6,pinH*.35,-pinW*.5,pinH*.8); g.quadraticCurveTo(-pinW*.45,pinH,0,pinH); g.quadraticCurveTo(pinW*.45,pinH,pinW*.5,pinH*.8); g.quadraticCurveTo(pinW*.6,pinH*.35,pinW*.25,0); g.arc(0,0,pinW*.25,0,Math.PI,true); g.closePath(); g.fill(); g.stroke();
      g.strokeStyle='#F0562A'; g.lineWidth=pinH*.045; g.beginPath(); g.moveTo(-pinW*.42,pinH*.3); g.lineTo(pinW*.42,pinH*.3); g.moveTo(-pinW*.45,pinH*.4); g.lineTo(pinW*.45,pinH*.4); g.stroke(); },3);
    const drawPin=p=>pinSp.drawRot(p.x+p.off,p.y+pinH*.7,p.a);
    A.frame = t=>{ ctx.fillStyle='rgba(21,20,18,.05)'; ctx.fillRect(0,laneY,W,H*0.012);
      if(ball.x < px-R*0.2){ ball.x+=ball.vx; ball.rot+=ball.vx/ball.r; }
      else if(!A.struck){ A.struck=true; A.struckAt=t; hit('STRIKE!','strike'); pins.forEach(p=>{ p.hit=true; p.vx=(Math.random()*1.6-0.45)*22; p.vy=-(16+Math.random()*26); p.va=(Math.random()-.5)*.7; }); ball.vx*=0.35; }
      else { ball.x+=ball.vx; ball.rot+=ball.vx/ball.r; ball.vx*=0.985; }
      drawBall(ball);
      for (const p of pins){ if(p.hit){ p.vy+=0.9; p.x+=p.vx; p.y+=p.vy; p.a+=p.va; if(p.y>laneY-pinH*.2 && p.vy>0){ p.y=laneY-pinH*.2; p.vy*=-0.5; p.vx*=0.85; p.va*=0.85; } if(p.x+p.off<-pinW||p.x+p.off>W+pinW){ p.vx*=-0.6; p.x=Math.max(-p.off,Math.min(W-p.off,p.x)); } } drawPin(p); } };
    return A;
  },
  /* 2 — the state itself launches like a rocket and bursts into fireworks */
  fireworks({W,H,r,hit}){
    const st = STATES[r.st] || STATES.TX; const path = new Path2D(st.d); const sc = Math.min(H*0.5/300, 2.2);
    const A = {dur:8, struck:false, struckAt:0}; const sparks=[], trail=[]; SFX.launch();
    const burst=(x,y,n,c)=>{ for(let i=0;i<n;i++){ const a=Math.random()*Math.PI*2, v=rr(2,14); sparks.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:rr(1.2,2.4),age:0,c,r:rr(3,7)}); } };
    A.frame = t=>{
      const rise = Math.min(1,t/1.6); const y = H*1.1 - (H*1.1-H*0.42)*(1-Math.pow(1-rise,2)); const x = W*0.5;
      if(!A.struck){
        trail.push({x:x+rr(-10,10), y:y+st.c[1]*sc*0.5+rr(0,40), age:0}); for(const q of trail){ q.age+=0.03; ctx.fillStyle=`rgba(255,227,77,${Math.max(0,1-q.age)})`; ctx.beginPath(); ctx.arc(q.x,q.y+q.age*120,Math.max(0.5,8*(1-q.age)+2),0,7); ctx.fill(); }
        ctx.save(); ctx.translate(x,y); ctx.rotate(Math.sin(t*9)*0.05); ctx.scale(sc,sc); ctx.translate(-st.c[0],-st.c[1]); ctx.fillStyle='#2E6FE0'; ctx.strokeStyle=C.ink; ctx.lineWidth=4/sc; ctx.fill(path); ctx.stroke(path); ctx.restore();
        ctx.fillStyle=C.ink; ctx.font=`900 ${Math.round(H*0.06)}px Archivo, sans-serif`; ctx.textAlign='center'; ctx.fillText(r.st, x, y+8);
        if(t>=1.7){ A.struck=true; A.struckAt=t; hit('KABOOM!','boom'); burst(x,y,260,'#FFE34D'); burst(x-W*0.18,y-H*0.08,180,'#2E6FE0'); burst(x+W*0.18,y-H*0.05,180,C.paper); burst(x,y-H*0.15,120,'#F0562A'); }
      } else {
        if(t<5 && Math.random()<0.07) burst(rr(W*0.15,W*0.85), rr(H*0.15,H*0.5), 120, ['#FFE34D','#2E6FE0',C.paper][Math.floor(Math.random()*3)]);
        for(const s of sparks){ s.age+=1/60; s.vy+=0.12; s.vx*=0.985; s.vy*=0.985; s.x+=s.vx; s.y+=s.vy; const a=Math.max(0,1-s.age/s.life); ctx.globalAlpha=a; ctx.fillStyle=s.c; const q=s.r*a+1; ctx.fillRect(s.x-q,s.y-q,q*2,q*2); }
        ctx.globalAlpha=1; for(let i=sparks.length-1;i>=0;i--) if(sparks[i].age>sparks[i].life) sparks.splice(i,1);
      } };
    return A;
  },
  /* 3 — donkey piñata gets whacked, candy everywhere */
  pinata({W,H,hit}){
    const A = {dur:8.5, struck:false, struckAt:0}; setTimeout(()=>SFX.swing(), 950); const px=W*0.55, ropeY=0, bodyY=H*0.42, S=Math.min(H*0.16,170); const candy=[];
    let ang=0, spin=0, fall=0, vy=0, broken=false;
    // each candy (wrapper + twists) is a static shape → one small sprite per piece, drawn rotated without save/restore
    const candySp=c=>SPR.shape(-c.w/2-9,-c.h/2-1,c.w/2+9,c.h/2+1,g=>{ g.fillStyle=c.c; g.strokeStyle=C.ink; g.lineWidth=2; SPR.rr(g,-c.w/2,-c.h/2,c.w,c.h,c.h/2); g.fill(); g.stroke(); g.beginPath(); g.moveTo(-c.w/2,0); g.lineTo(-c.w/2-8,-c.h/2); g.lineTo(-c.w/2-8,c.h/2); g.closePath(); g.moveTo(c.w/2,0); g.lineTo(c.w/2+8,-c.h/2); g.lineTo(c.w/2+8,c.h/2); g.closePath(); g.fill(); g.stroke(); },4);
    const drawDonkey=(x,y,s,a)=>{ ctx.save(); ctx.translate(x,y); ctx.rotate(a); const stripes=['#2E6FE0','#FFE34D',C.paper,'#BBD0F5'];
      // body with fringe stripes
      for(let i=0;i<6;i++){ ctx.fillStyle=stripes[i%4]; ctx.fillRect(-s*0.9, -s*0.45+i*s*0.15, s*1.8, s*0.16); }
      ctx.strokeStyle=C.ink; ctx.lineWidth=5; ctx.strokeRect(-s*0.9,-s*0.45,s*1.8,s*0.9);
      // legs
      for(const lx of [-s*0.7,-s*0.3,s*0.3,s*0.7]){ ctx.fillStyle='#2E6FE0'; ctx.fillRect(lx-s*0.09,s*0.45,s*0.18,s*0.45); ctx.strokeRect(lx-s*0.09,s*0.45,s*0.18,s*0.45); }
      // neck + head
      ctx.fillStyle='#2E6FE0'; ctx.beginPath(); ctx.moveTo(s*0.8,-s*0.4); ctx.lineTo(s*1.25,-s*0.95); ctx.lineTo(s*1.5,-s*0.8); ctx.lineTo(s*1.05,-s*0.2); ctx.closePath(); ctx.fill(); ctx.stroke();
      roundRect(s*1.15,-s*1.15,s*0.75,s*0.5,s*0.15); ctx.fill(); ctx.stroke();
      // ears
      ctx.fillStyle='#FFE34D'; for(const ex of [s*1.2,s*1.45]){ ctx.beginPath(); ctx.moveTo(ex,-s*1.1); ctx.lineTo(ex+s*0.1,-s*1.55); ctx.lineTo(ex+s*0.22,-s*1.1); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      // eye + tail
      ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(s*1.7,-s*0.98,s*0.1,0,7); ctx.fill(); ctx.fillStyle=C.ink; ctx.beginPath(); ctx.arc(s*1.73,-s*0.97,s*0.05,0,7); ctx.fill();
      ctx.strokeStyle=C.ink; ctx.lineWidth=6; ctx.beginPath(); ctx.moveTo(-s*0.9,-s*0.3); ctx.quadraticCurveTo(-s*1.4,-s*0.1,-s*1.2,s*0.3); ctx.stroke();
      ctx.restore(); };
    A.frame = t=>{
      if(!broken){ ang = Math.sin(t*2.2)*0.25; ctx.strokeStyle=C.ink; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(px,ropeY); ctx.lineTo(px+Math.sin(ang)*(bodyY-ropeY), bodyY); ctx.stroke(); drawDonkey(px+Math.sin(ang)*(bodyY-ropeY), bodyY, S, ang); }
      else { vy+=0.8; fall+=vy; spin+=0.18; drawDonkey(px+fall*0.6, bodyY+fall, S, spin); }
      // the bat
      const swing = t<1.0? -2.2 : t<1.35? -2.2 + (t-1.0)/0.35*2.6 : 0.4 + Math.sin((t-1.35)*3)*0.1;
      const bx = W*0.2, by=H*0.6; ctx.save(); ctx.translate(bx,by); ctx.rotate(swing); ctx.fillStyle='#c98a4b'; ctx.strokeStyle=C.ink; ctx.lineWidth=5; roundRect(-S*0.12,-S*2.6,S*0.24,S*2.8,S*0.1); ctx.fill(); ctx.stroke(); ctx.fillStyle=C.ink; roundRect(-S*0.16,-S*0.1,S*0.32,S*0.5,S*0.08); ctx.fill(); ctx.restore();
      if(!A.struck && t>=1.3){ A.struck=true; A.struckAt=t; broken=true; vy=-9; hit('¡PIÑATA!','whack'); for(let i=0;i<70;i++) candy.push({x:px,y:bodyY,vx:rr(-18,18),vy:rr(-26,-4),a:rr(0,6),va:rr(-.3,.3),c:['#F0562A','#FFE34D','#2E6FE0',C.paper,'#8c4bd6'][i%5],w:rr(18,30),h:rr(10,16)}); for(const c of candy) c.sp=candySp(c); }
      for(const c of candy){ c.vy+=0.7; c.x+=c.vx; c.y+=c.vy; c.a+=c.va; if(c.y>H*0.92&&c.vy>0){ c.y=H*0.92; c.vy*=-0.4; c.vx*=0.8; } c.sp.drawRot(c.x,c.y,c.a); } };
    return A;
  },
  /* 4 — slot machine lands D · D · D */
  slots({W,H,hit}){
    const A = {dur:8.5, struck:false, struckAt:0}; SFX.reel(); const sym=['D','★','R','✓','D','♥','D']; const reels=[0,1,2].map(i=>({off:Math.random()*7, speed:0.55+i*0.05, stopAt:1.1+i*0.65, stopped:false})); const coins=[];
    const cw=Math.min(W*0.14,260), ch=cw*1.25, gap=cw*0.12, x0=W/2-(3*cw+2*gap)/2, y0=H*0.36-ch/2;
    const coinSp=SPR.shape(-24,-24,24,24,g=>{ g.fillStyle='#FFE34D'; g.strokeStyle=C.ink; g.lineWidth=3; g.beginPath(); g.arc(0,0,22,0,7); g.fill(); g.stroke(); g.fillStyle=C.ink; g.font='900 24px Archivo, sans-serif'; g.textAlign='center'; g.textBaseline='middle'; g.fillText('D',0,1); },5); // one coin sprite, squashed per coin to fake the spin
    A.frame = t=>{
      ctx.fillStyle=C.ink; roundRect(x0-gap*2,y0-gap*2,3*cw+6*gap,ch+4*gap,24); ctx.fill();
      ctx.fillStyle='#FFE34D'; roundRect(x0-gap*2,y0-gap*4.2,3*cw+6*gap,gap*2,10); ctx.fill();
      reels.forEach((rl,i)=>{ if(!rl.stopped){ rl.off+=rl.speed; if(t>=rl.stopAt){ rl.stopped=true; SFX.stop(); rl.off=Math.round(rl.off); while(sym[((Math.round(rl.off))%7+7)%7]!=='D') rl.off++; } }
        const x=x0+i*(cw+gap); ctx.save(); ctx.beginPath(); ctx.rect(x,y0,cw,ch); ctx.clip(); ctx.fillStyle='#fff'; ctx.fillRect(x,y0,cw,ch);
        const frac=rl.off-Math.floor(rl.off); for(let k=-1;k<=1;k++){ const idx=((Math.floor(rl.off)+k)%7+7)%7; const s=sym[idx]; const yy=y0+ch/2+(k-frac)*ch*0.9; ctx.font=`900 ${Math.round(ch*0.62)}px Archivo, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillStyle = s==='D'?'#2E6FE0': s==='R'?'#F0562A':C.ink; ctx.fillText(s,x+cw/2,yy); }
        const g=ctx.createLinearGradient(0,y0,0,y0+ch); g.addColorStop(0,'rgba(0,0,0,.35)'); g.addColorStop(.3,'rgba(0,0,0,0)'); g.addColorStop(.7,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(0,0,0,.35)'); ctx.fillStyle=g; ctx.fillRect(x,y0,cw,ch); ctx.restore();
        ctx.strokeStyle='#FFE34D'; ctx.lineWidth=6; ctx.strokeRect(x,y0,cw,ch); });
      // lever
      ctx.strokeStyle=C.ink; ctx.lineWidth=14; ctx.beginPath(); ctx.moveTo(x0+3*cw+gap*3.5,y0+ch*0.6); const pull = t<0.4? t/0.4 : t<0.9? 1-(t-0.4)/0.5 : 0; ctx.lineTo(x0+3*cw+gap*3.5+60, y0+ch*0.6 - 160 + pull*220); ctx.stroke(); ctx.fillStyle='#F0562A'; ctx.beginPath(); ctx.arc(x0+3*cw+gap*3.5+60, y0+ch*0.6-160+pull*220, 30,0,7); ctx.fill();
      if(!A.struck && reels.every(r=>r.stopped)){ A.struck=true; A.struckAt=t; hit('JACKPOT!','jackpot'); }
      if(A.struck && t<A.struckAt+3.5) for(let i=0;i<4;i++) coins.push({x:x0+rr(0,3*cw+2*gap), y:y0+ch, vy:rr(2,7), vx:rr(-3,3), a:rr(0,6)});
      for(const c of coins){ c.vy+=0.35; c.y+=c.vy; c.x+=c.vx; c.a+=0.2; coinSp.drawRot(c.x,c.y,0,Math.abs(Math.cos(c.a)),1); }
      for(let i=coins.length-1;i>=0;i--) if(coins[i].y>H+40) coins.splice(i,1); };
    return A;
  },
  /* 5 — a giant boot kicks a football through the uprights */
  kick({W,H,hit}){
    const A = {dur:8, struck:false, struckAt:0}; setTimeout(()=>SFX.kick(), 1150); const gy=H*0.78, gx=W*0.8, ball={x:W*0.3,y:gy-26,vx:0,vy:0,rot:0}; const bx=ball.x-120, by=gy-200; let arms=0;
    A.frame = t=>{
      // turf + uprights
      ctx.fillStyle='rgba(46,111,224,.12)'; ctx.fillRect(0,gy,W,H*0.02);
      ctx.strokeStyle='#FFE34D'; ctx.lineWidth=18; ctx.lineCap='round'; ctx.beginPath(); ctx.moveTo(gx,gy); ctx.lineTo(gx,gy-H*0.28); ctx.moveTo(gx-W*0.07,gy-H*0.28); ctx.lineTo(gx+W*0.07,gy-H*0.28); ctx.moveTo(gx-W*0.07,gy-H*0.28); ctx.lineTo(gx-W*0.07,gy-H*0.62); ctx.moveTo(gx+W*0.07,gy-H*0.28); ctx.lineTo(gx+W*0.07,gy-H*0.62); ctx.stroke(); ctx.strokeStyle=C.ink; ctx.lineWidth=4; ctx.stroke();
      // boot
      const swing = t<0.9? -1.4 : t<1.2? -1.4+(t-0.9)/0.3*2.0 : 0.6 - Math.min(0.9,(t-1.2))*0.5;
      ctx.save(); ctx.translate(bx,by); ctx.rotate(swing); ctx.fillStyle='#2E6FE0'; ctx.strokeStyle=C.ink; ctx.lineWidth=5; roundRect(-40,0,80,180,20); ctx.fill(); ctx.stroke(); roundRect(-40,150,180,70,24); ctx.fill(); ctx.stroke(); ctx.fillStyle='#FFE34D'; for(let i=0;i<4;i++){ ctx.fillRect(-28,20+i*30,56,10); } ctx.restore();
      if(!A.struck && t>=1.2){ A.struck=true; A.struckAt=t; ball.vx=(gx-ball.x)/70; ball.vy=-26; hit("IT'S GOOD!",'good'); }
      if(A.struck){ ball.vy+=0.42; ball.x+=ball.vx; ball.y+=ball.vy; ball.rot+=0.25; arms=Math.min(1,arms+0.05); if(ball.y>gy-26&&ball.vy>0){ ball.y=gy-26; ball.vy*=-0.45; ball.vx*=0.7; } }
      // football
      ctx.save(); ctx.translate(ball.x,ball.y); ctx.rotate(A.struck? ball.rot : -0.9); ctx.fillStyle='#8a4b22'; ctx.strokeStyle=C.ink; ctx.lineWidth=4; ctx.beginPath(); ctx.ellipse(0,0,44,26,0,0,7); ctx.fill(); ctx.stroke(); ctx.strokeStyle=C.paper; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(-16,0); ctx.lineTo(16,0); for(const lx of [-10,-3,4,11]){ ctx.moveTo(lx,-6); ctx.lineTo(lx,6);} ctx.stroke(); ctx.restore();
      // referee arms up
      const rx=gx+W*0.12, ry=gy; ctx.fillStyle=C.ink; ctx.fillRect(rx-22,ry-150,44,150); ctx.fillStyle='#fff'; for(let i=0;i<5;i+=2) ctx.fillRect(rx-22,ry-150+i*30,44,15); ctx.beginPath(); ctx.fillStyle='#f1c9a5'; ctx.arc(rx,ry-180,28,0,7); ctx.fill(); ctx.strokeStyle=C.ink; ctx.lineWidth=16; ctx.lineCap='round'; ctx.beginPath(); ctx.moveTo(rx-22,ry-130); ctx.lineTo(rx-50, ry-130-arms*120); ctx.moveTo(rx+22,ry-130); ctx.lineTo(rx+50, ry-130-arms*120); ctx.stroke(); };
    return A;
  }
});
/* Extra celebration animations, part 1: wrestling, volcano, whackamole, reversebowl, ducks.
   Same contract as anims.js. */
SFX.bell = function(){ for(let i=0;i<3;i++){ tone(2400, i*0.22, 0.35, 'sine', 0.18, 2300); tone(3600, i*0.22, 0.2, 'triangle', 0.06); } };
SFX.slap = function(){ noise(0, 0.12, 0.9, 2200); tone(200, 0, 0.12, 'square', 0.35, 70); };
SFX.pinned = function(){ noise(0, 0.5, 1.0, 500); tone(90, 0, 0.45, 'square', 0.45, 35); for(let i=0;i<6;i++) noise(0.1+i*0.07, 0.2, 0.3, 900); cheer(0.5); };
SFX.rumble = function(){ tone(38, 0, 2.2, 'sine', 0.5, 48); noise(0, 2.2, 0.28, 180); for(let i=0;i<10;i++) noise(0.4+i*0.17, 0.12, 0.2, 400); };
SFX.erupt = function(){ noise(0, 2.0, 1.0, 600); tone(55, 0, 1.8, 'sawtooth', 0.4, 28); for(let i=0;i<12;i++){ tone(500+Math.random()*900, 0.2+i*0.14, 0.25, 'square', 0.07, 150); noise(0.3+i*0.15, 0.2, 0.3, 1400); } cheer(0.6); };
SFX.popup = function(){ tone(420, 0, 0.09, 'square', 0.12, 900); };
SFX.thwack = function(){ noise(0, 0.12, 0.9, 900); tone(170, 0, 0.16, 'square', 0.45, 55); tone(900, 0.02, 0.08, 'sine', 0.1, 300); };
SFX.whacked = function(){ SFX.thwack(); for(let i=0;i<8;i++) tone(1400+Math.random()*1800, 0.12+i*0.05, 0.2, 'sine', 0.06); cheer(0.3); };
SFX.charge = function(){ for(let i=0;i<24;i++){ tone(240+Math.random()*80, i*0.085, 0.05, 'square', 0.1, 120); } tone(300, 0, 2.0, 'sawtooth', 0.05, 700); };
SFX.revenge = function(){ noise(0, 0.6, 0.9, 2500); tone(110, 0, 0.4, 'square', 0.4, 40); for(let i=0;i<10;i++) tone(800+Math.random()*1600, 0.05+i*0.06, 0.25, 'square', 0.07, 350); cheer(0.3); };
SFX.quack = function(){ tone(1500, 0, 0.08, 'square', 0.2, 2600); tone(2600, 0.08, 0.2, 'sawtooth', 0.16, 1100); tone(1100, 0.32, 0.14, 'square', 0.14, 1900); tone(1900, 0.46, 0.25, 'sawtooth', 0.12, 900); cheer(0.4); };
SFX.bobbing = function(){ noise(0, 2.4, 0.18, 700); for(let i=0;i<8;i++) tone(900+Math.random()*600, 0.3+i*0.28, 0.07, 'square', 0.05, 1400); };

Object.assign(ANIMS, {
  /* the state climbs the turnbuckle and elbow-drops the map; a ref counts 1-2-3 */
  wrestling({W,H,r,hit,shake}){
    const A = {dur:9, struck:false, struckAt:0}; SFX.bell();
    const st = STATES[r.st]||STATES.TX; const path=new Path2D(st.d); const sc=Math.min(H*0.34/300,1.6);
    const postX=W*0.84, lpX=W*0.06, postTop=H*0.3, matY=H*0.86; const tx=W*0.33, ty=H*0.6; const perchX=postX-H*0.09, perchY=postTop-H*0.1;
    const stars=[]; const slapT=[0.9,1.7,2.5]; let slaps=0, lastSlap=-1; const ease=u=>1-Math.pow(1-u,3);
    const drawState=(x,y,rot,sx,sy)=>{ ctx.save(); ctx.translate(x,y); ctx.rotate(rot); ctx.scale(sc*sx,sc*sy); ctx.translate(-st.c[0],-st.c[1]); ctx.fillStyle='#2E6FE0'; ctx.strokeStyle=C.ink; ctx.lineWidth=4/sc; ctx.fill(path); ctx.stroke(path); ctx.restore();
      ctx.fillStyle=C.ink; ctx.font=`900 ${Math.round(H*0.05)}px Archivo, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(r.st,x,y); };
    const drawArm=(x,y,s,rot)=>{ ctx.save(); ctx.translate(x,y); ctx.rotate(rot); ctx.lineCap='round'; ctx.strokeStyle=C.ink; ctx.lineWidth=s*0.22; ctx.beginPath(); ctx.moveTo(s*0.5,-s*0.1); ctx.lineTo(s*0.95,s*0.5); ctx.lineTo(s*0.3,s*0.85); ctx.stroke(); ctx.strokeStyle='#2E6FE0'; ctx.lineWidth=s*0.13; ctx.stroke(); ctx.fillStyle='#FFE34D'; ctx.beginPath(); ctx.arc(s*0.95,s*0.5,s*0.14,0,7); ctx.fill(); ctx.strokeStyle=C.ink; ctx.lineWidth=3; ctx.stroke(); ctx.restore(); };
    const referee=(x,y,arm,s)=>{ ctx.save(); ctx.translate(x,y); ctx.strokeStyle=C.ink; ctx.lineWidth=4;
      // kneeling legs
      ctx.fillStyle='#1c1b19'; roundRect(-s*0.5,s*0.55,s*1.3,s*0.4,s*0.15); ctx.fill(); ctx.stroke();
      // striped shirt
      roundRect(-s*0.5,-s*0.4,s*1.0,s*1.1,s*0.2); ctx.fillStyle='#fff'; ctx.fill(); ctx.save(); ctx.clip(); ctx.fillStyle='#1c1b19'; for(let i=0;i<5;i++) ctx.fillRect(-s*0.5+i*s*0.2,-s*0.4,s*0.1,s*1.1); ctx.restore(); roundRect(-s*0.5,-s*0.4,s*1.0,s*1.1,s*0.2); ctx.stroke();
      // head
      ctx.fillStyle='#f1c9a5'; ctx.beginPath(); ctx.arc(0,-s*0.75,s*0.36,0,7); ctx.fill(); ctx.stroke(); ctx.fillStyle='#1c1b19'; ctx.beginPath(); ctx.arc(0,-s*0.85,s*0.36,Math.PI,0); ctx.fill();
      ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(-s*0.14,-s*0.75,s*0.1,0,7); ctx.arc(s*0.14,-s*0.75,s*0.1,0,7); ctx.fill(); ctx.fillStyle='#151412'; ctx.beginPath(); ctx.arc(-s*0.16,-s*0.75,s*0.045,0,7); ctx.arc(s*0.12,-s*0.75,s*0.045,0,7); ctx.fill();
      // slapping arm
      ctx.save(); ctx.translate(-s*0.45,-s*0.2); ctx.rotate(arm); ctx.lineCap='round'; ctx.strokeStyle=C.ink; ctx.lineWidth=s*0.3; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-s*0.9,0); ctx.stroke(); ctx.strokeStyle='#fff'; ctx.lineWidth=s*0.18; ctx.stroke(); ctx.fillStyle='#f1c9a5'; ctx.beginPath(); ctx.arc(-s*1.0,0,s*0.2,0,7); ctx.fill(); ctx.strokeStyle=C.ink; ctx.lineWidth=3; ctx.stroke(); ctx.restore();
      ctx.restore(); };
    A.frame = t=>{
      // ring: mat edge, two posts, three ropes
      ctx.fillStyle='rgba(46,111,224,.10)'; ctx.fillRect(0,matY,W,H-matY);
      ctx.strokeStyle=C.ink; ctx.lineWidth=6; ctx.beginPath(); ctx.moveTo(0,matY); ctx.lineTo(W,matY); ctx.stroke();
      const bounce = A.struck? Math.sin((t-A.struckAt)*14)*Math.exp(-(t-A.struckAt)*3)*H*0.03 : 0;
      const ropeCols=['#F0562A','#FFE34D','#2E6FE0'];
      for(let i=0;i<3;i++){ const y=matY-H*0.13*(i+1); ctx.lineCap='round'; ctx.strokeStyle=C.ink; ctx.lineWidth=16; ctx.beginPath(); ctx.moveTo(lpX,y); ctx.quadraticCurveTo((lpX+postX)/2, y+bounce*(3-i), postX, y); ctx.stroke(); ctx.strokeStyle=ropeCols[i]; ctx.lineWidth=10; ctx.stroke(); }
      for(const px of [lpX,postX]){ ctx.fillStyle='#8C8A84'; ctx.strokeStyle=C.ink; ctx.lineWidth=5; roundRect(px-H*0.02,postTop,H*0.04,matY-postTop,8); ctx.fill(); ctx.stroke(); ctx.fillStyle='#F0562A'; roundRect(px-H*0.035,postTop-H*0.03,H*0.07,H*0.06,10); ctx.fill(); ctx.stroke(); for(let i=0;i<3;i++){ ctx.fillStyle='#FFE34D'; roundRect(px-H*0.035,matY-H*0.13*(i+1)-H*0.03,H*0.07,H*0.06,10); ctx.fill(); ctx.stroke(); } }
      // the state: climb (0–1.5), crouch (1.5–1.9), leap (1.9–2.6), lie pinned
      let sx, sy, rot=0, scx=1, scy=1, armRot=0, showArm=false;
      if(t<1.5){ const u=Math.min(1,t/1.5); sx=postX-H*0.09; sy=matY-H*0.08-(matY-H*0.08-perchY)*ease(u); rot=Math.sin(t*12)*0.08; scy=1+Math.sin(t*12)*0.06; }
      else if(t<1.9){ const u=(t-1.5)/0.4; sx=perchX; sy=perchY+u*H*0.03; scy=1-u*0.25; scx=1+u*0.2; showArm=true; armRot=-2.4; }
      else if(!A.struck){ const u=Math.min(1,(t-1.9)/0.7); sx=perchX+(tx-perchX)*u; sy=perchY+(ty-perchY)*u-Math.sin(u*Math.PI)*H*0.32; rot=-u*Math.PI*2; showArm=true; armRot=0.3; if(u>=1){ A.struck=true; A.struckAt=t; hit('PINNED!','pinned'); for(let i=0;i<40;i++){ const a=Math.random()*Math.PI*2, v=rr(4,18); stars.push({x:tx,y:ty,vx:Math.cos(a)*v,vy:Math.sin(a)*v-6,age:0,c:['#FFE34D','#F0562A','#fff'][i%3],r:rr(5,12)}); } } }
      if(A.struck){ const f=t-A.struckAt; sx=tx; sy=ty+Math.min(1,f*4)*H*0.03; scx=1+Math.min(1,f*4)*0.18; scy=1-Math.min(1,f*4)*0.42; rot=0; showArm=true; armRot=0.9+Math.sin(t*3)*0.05;
        // impact rings
        if(f<0.7){ ctx.strokeStyle='#FFE34D'; ctx.lineWidth=10*(1-f/0.7); ctx.beginPath(); ctx.ellipse(tx,ty+H*0.05,(H*0.15+f*W*0.45),(H*0.05+f*H*0.15),0,0,7); ctx.stroke(); ctx.strokeStyle=C.ink; ctx.lineWidth=4*(1-f/0.7); ctx.stroke(); } }
      drawState(sx,sy,rot,scx,scy); if(showArm) drawArm(sx,sy,H*0.12,armRot);
      for(const s of stars){ s.age+=1/60; s.vy+=0.5; s.x+=s.vx; s.y+=s.vy; const a=Math.max(0,1-s.age/1.2); ctx.globalAlpha=a; ctx.fillStyle=s.c; ctx.fillRect(s.x-s.r,s.y-s.r,s.r*2,s.r*2); } ctx.globalAlpha=1;
      // referee slides in, slaps the mat, counts
      if(A.struck){ const f=t-A.struckAt; const rs=Math.min(H*0.12,120); const rx = tx+W*0.17 + (W*0.7)*(1-ease(Math.min(1,f/0.6))); const ry=ty-H*0.02;
        let arm=-1.3; for(let k=0;k<3;k++){ const s=slapT[k]; if(f>=s-0.18 && f<s+0.5){ arm = f<s? -1.3+((f-(s-0.18))/0.18)*1.7 : 0.4-Math.min(1,(f-s)/0.5)*1.7; } if(f>=s && lastSlap<k){ lastSlap=k; slaps=k+1; SFX.slap(); shake(); if(k===2) SFX.bell(); } }
        referee(rx,ry,arm,rs);
        if(slaps>0){ const since=f-slapT[slaps-1]; const pop=1+Math.max(0,0.5-since)*1.2; ctx.save(); ctx.translate(W*0.5,H*0.22); ctx.scale(pop,pop); ctx.rotate(Math.sin(t*4)*0.05); ctx.font=`900 ${Math.round(H*0.3)}px Archivo, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.lineWidth=14; ctx.strokeStyle=C.ink; ctx.lineJoin='round'; ctx.strokeText(String(slaps),0,0); ctx.fillStyle='#FFE34D'; ctx.fillText(String(slaps),0,0); ctx.restore();
          if(slaps>1){ ctx.font=`900 ${Math.round(H*0.09)}px Archivo, sans-serif`; ctx.fillStyle=C.ink; ctx.textAlign='left'; ctx.fillText([...Array(slaps-1)].map((_,i)=>i+1).join('  '), W*0.5+H*0.14, H*0.3); } } } };
    return A;
  },
  /* a volcano with the state in its crater blows its top: blue lava everywhere */
  volcano({W,H,r,hit,shake}){
    const A = {dur:9, struck:false, struckAt:0}; SFX.rumble();
    const st = STATES[r.st]||STATES.TX; const path=new Path2D(st.d); const sc=Math.min(H*0.2/300,1.1);
    const cx=W*0.5, baseY=H*0.99, topY=H*0.36, bw=Math.min(W*0.36,H*0.8), tw=bw*0.28; const blobs=[], ash=[], flows=[];
    for(const side of [-1,1]) for(let i=0;i<3;i++) flows.push({side, inset:tw*(0.1+i*0.3), speed:rr(0.9,1.5), w:rr(H*0.025,H*0.05), ph:rr(0,6)});
    A.frame = t=>{
      const rum = A.struck? Math.max(0,1-(t-A.struckAt)*2) : Math.min(1,t/2.0); const jx=rr(-1,1)*rum*rum*10, jy=rr(-1,1)*rum*rum*6;
      ctx.save(); ctx.translate(jx,jy);
      // ash plume (behind the cone)
      if(A.struck && t<A.struckAt+3.5) for(let i=0;i<2;i++) ash.push({x:cx+rr(-tw*0.6,tw*0.6), y:topY, vx:rr(-1.5,1.5), vy:-rr(3,7), r:rr(H*0.02,H*0.05), a:0.8});
      for(const m of ash){ m.x+=m.vx; m.y+=m.vy; m.vy*=0.985; m.r+=H*0.0012; m.a-=0.006; ctx.globalAlpha=Math.max(0,m.a); ctx.fillStyle='#8C8A84'; ctx.beginPath(); ctx.arc(m.x,m.y,m.r,0,7); ctx.fill(); } ctx.globalAlpha=1; for(let i=ash.length-1;i>=0;i--) if(ash[i].a<=0) ash.splice(i,1);
      // pre-eruption smoke wisps
      if(!A.struck && t>0.6){ ctx.globalAlpha=0.5; ctx.fillStyle='#8C8A84'; for(let i=0;i<4;i++){ const u=((t*0.5+i*0.25)%1); ctx.beginPath(); ctx.arc(cx+Math.sin(t*2+i)*tw*0.3, topY-u*H*0.18, H*0.015+u*H*0.03,0,7); ctx.fill(); } ctx.globalAlpha=1; }
      // cone
      ctx.fillStyle='#6b4a2b'; ctx.strokeStyle=C.ink; ctx.lineWidth=6; ctx.beginPath(); ctx.moveTo(cx-bw,baseY); ctx.quadraticCurveTo(cx-bw*0.55,baseY-(baseY-topY)*0.35,cx-tw,topY); ctx.lineTo(cx+tw,topY); ctx.quadraticCurveTo(cx+bw*0.55,baseY-(baseY-topY)*0.35,cx+bw,baseY); ctx.closePath(); ctx.fill(); ctx.stroke();
      // crater mouth
      ctx.fillStyle='#2a2420'; ctx.beginPath(); ctx.ellipse(cx,topY,tw,tw*0.2,0,0,7); ctx.fill(); ctx.stroke();
      const glow = A.struck? 1 : rum; ctx.fillStyle='#F0562A'; ctx.globalAlpha=glow*0.9; ctx.beginPath(); ctx.ellipse(cx,topY,tw*0.85,tw*0.15,0,0,7); ctx.fill(); ctx.fillStyle='#FFE34D'; ctx.globalAlpha=glow*(0.6+Math.sin(t*15)*0.3); ctx.beginPath(); ctx.ellipse(cx,topY,tw*0.55,tw*0.1,0,0,7); ctx.fill(); ctx.globalAlpha=1;
      // lava flows down the flanks
      if(A.struck){ const f=t-A.struckAt; for(const fl of flows){ const len=Math.min(1,f*fl.speed/2.2); if(len<=0.01) continue; const P0x=cx+fl.side*tw, P1x=cx+fl.side*bw*0.55, P1y=baseY-(baseY-topY)*0.35, P2x=cx+fl.side*bw; ctx.beginPath(); const N=18; for(let i=0;i<=N;i++){ const u=i/N*len; const bx=(1-u)*(1-u)*P0x+2*(1-u)*u*P1x+u*u*P2x, by=(1-u)*(1-u)*topY+2*(1-u)*u*P1y+u*u*baseY; const px=bx-fl.side*(fl.inset*(1-u*0.4)+fl.w*0.5)+Math.sin(u*7+fl.ph+t*2)*fl.w*0.15, py=by+Math.sin(u*9+fl.ph)*fl.w*0.2; if(i===0) ctx.moveTo(px,py); else ctx.lineTo(px,py); } ctx.lineCap='round'; ctx.lineJoin='round'; ctx.strokeStyle=C.ink; ctx.lineWidth=fl.w+6; ctx.stroke(); ctx.strokeStyle='#2E6FE0'; ctx.lineWidth=fl.w; ctx.stroke(); ctx.strokeStyle='#7FAAF6'; ctx.lineWidth=fl.w*0.35; ctx.stroke(); }
        // lava blobs arcing out
        if(f<2.6 && blobs.length<320) for(let i=0;i<5;i++) blobs.push({x:cx+rr(-tw*0.5,tw*0.5), y:topY, vx:rr(-16,16), vy:-rr(12,28), r:rr(H*0.008,H*0.028)});
        for(const b of blobs){ b.vy+=0.55; b.x+=b.vx; b.y+=b.vy; ctx.fillStyle='#2E6FE0'; ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,7); ctx.fill(); ctx.fillStyle='#7FAAF6'; ctx.beginPath(); ctx.arc(b.x-b.r*0.3,b.y-b.r*0.3,b.r*0.4,0,7); ctx.fill(); } for(let i=blobs.length-1;i>=0;i--) if(blobs[i].y>H+60) blobs.splice(i,1);
        // lava fountain column
        ctx.fillStyle='#2E6FE0'; ctx.globalAlpha=Math.max(0,1-f/3); ctx.beginPath(); ctx.moveTo(cx-tw*0.5,topY); ctx.quadraticCurveTo(cx-tw*0.2,topY-H*0.3*Math.min(1,f*2)-Math.sin(t*20)*20,cx,topY-H*0.42*Math.min(1,f*2)); ctx.quadraticCurveTo(cx+tw*0.2,topY-H*0.3*Math.min(1,f*2)+Math.sin(t*23)*20,cx+tw*0.5,topY); ctx.closePath(); ctx.fill(); ctx.globalAlpha=1; }
      // the state in the crater, launched by the blast then bobbing on the lava
      let sy=topY-H*0.07+Math.sin(t*28)*rum*8, rot=Math.sin(t*30)*rum*0.06; if(A.struck){ const f=t-A.struckAt; sy = f<1.8? topY-H*0.07-Math.sin(f/1.8*Math.PI)*H*0.28 : topY-H*0.07+Math.sin(t*5)*8; rot = f<1.8? Math.sin(f/1.8*Math.PI)*0.9 : Math.sin(t*5)*0.1; }
      ctx.save(); ctx.translate(cx,sy); ctx.rotate(rot); ctx.scale(sc,sc); ctx.translate(-st.c[0],-st.c[1]); ctx.fillStyle='#FFE34D'; ctx.strokeStyle=C.ink; ctx.lineWidth=4/sc; ctx.fill(path); ctx.stroke(path); ctx.restore();
      ctx.fillStyle=C.ink; ctx.font=`900 ${Math.round(H*0.045)}px Archivo, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(r.st,cx,sy);
      ctx.restore();
      if(!A.struck && t>=2.0){ A.struck=true; A.struckAt=t; hit('ERUPTION!','erupt'); } };
    return A;
  },
  /* whack-a-mole; the last mole holds up a D sign and is spared */
  whackamole({W,H,hit}){
    const A = {dur:9.5, struck:false, struckAt:0}; SFX.popup();
    const holes=[]; for(let row=0;row<2;row++) for(let c=0;c<3;c++) holes.push({x:W*(0.25+c*0.25), y:H*(0.52+row*0.23)});
    const hw=Math.min(W*0.09,H*0.16), hh=hw*0.3, ms=hw*0.8; const WH=0.55;
    const ev=[{t:0.3,h:0},{t:0.95,h:4},{t:1.6,h:2},{t:2.25,h:3},{t:2.9,h:1},{t:3.6,h:5},{t:4.3,h:0},{t:5.0,h:4,sign:true}];
    const stars=[], hearts=[]; let mx=holes[4].x, my=holes[4].y; const done={};
    // the mole's body/face is static (two variants: alive = eye whites only, pupils drawn live; dead = X eyes baked in) → sprites; the dirt mound + hole is one sprite,
    // and the "lip" that hides the mole's lower half is the same drawing cropped to the old clip box
    const moleSp={}; for(const k of ['alive','dead']) moleSp[k]=SPR.shape(-ms*0.55,-ms*0.05,ms*0.55,ms*2.25,g=>{ g.fillStyle='#8a5a32'; g.strokeStyle=C.ink; g.lineWidth=4; SPR.rr(g,-ms*0.5,0,ms,ms*2.2,ms*0.5); g.fill(); g.stroke();
      g.fillStyle='#c98a4b'; g.beginPath(); g.ellipse(0,ms*0.95,ms*0.3,ms*0.35,0,0,7); g.fill();
      g.fillStyle='#fff'; g.beginPath(); g.arc(-ms*0.2,ms*0.4,ms*0.16,0,7); g.arc(ms*0.2,ms*0.4,ms*0.16,0,7); g.fill(); g.strokeStyle=C.ink; g.lineWidth=2; g.stroke();
      if(k==='dead'){ g.strokeStyle='#151412'; g.lineWidth=3; for(const ex of [-ms*0.2,ms*0.2]){ g.beginPath(); g.moveTo(ex-ms*0.08,ms*0.32); g.lineTo(ex+ms*0.08,ms*0.48); g.moveTo(ex+ms*0.08,ms*0.32); g.lineTo(ex-ms*0.08,ms*0.48); g.stroke(); } }
      g.fillStyle='#F0562A'; g.beginPath(); g.ellipse(0,ms*0.68,ms*0.11,ms*0.08,0,0,7); g.fill(); g.fillStyle='#fff'; g.fillRect(-ms*0.1,ms*0.8,ms*0.09,ms*0.14); g.fillRect(ms*0.01,ms*0.8,ms*0.09,ms*0.14); },10);
    const moundDraw=g=>{ g.fillStyle='#8a5a32'; g.strokeStyle=C.ink; g.lineWidth=4; g.beginPath(); g.ellipse(0,hh*0.5,hw*1.3,hh*1.9,0,0,7); g.fill(); g.stroke(); g.fillStyle='#2a2420'; g.beginPath(); g.ellipse(0,0,hw,hh,0,0,7); g.fill(); g.stroke(); };
    const moundSp=SPR.shape(-hw*1.35,-hh*1.45,hw*1.35,hh*2.45,moundDraw,4), lipSp=SPR.shape(-hw*1.5,0,hw*1.5,hh*3,moundDraw,Infinity,0); // lip: ops=Infinity forces the sprite — its canvas crop IS the clip
    const mole=(x,y,up,squash,sign,t,alive)=>{ ctx.save(); ctx.beginPath(); ctx.rect(x-hw*1.6,y-ms*3.2,hw*3.2,ms*3.2+hh*0.3); ctx.clip(); ctx.translate(x,y+hh*0.3); const rise=-ms*1.7*up; ctx.translate(0,0); if(squash){ ctx.translate(0,rise+ms*1.7); ctx.scale(1.3,0.55); ctx.translate(0,-(rise+ms*1.7)); }
      (alive? moleSp.alive : moleSp.dead).draw(0, rise);
      if(alive){ ctx.fillStyle='#151412'; const dx=Math.sin(t*7+x)*ms*0.05, dy=Math.cos(t*5+y)*ms*0.05; ctx.beginPath(); ctx.arc(-ms*0.2+dx,rise+ms*0.42+dy,ms*0.07,0,7); ctx.arc(ms*0.2-dx,rise+ms*0.42+dy,ms*0.07,0,7); ctx.fill(); }
      if(sign){ ctx.save(); ctx.translate(ms*0.5,rise+ms*0.7); ctx.rotate(Math.sin(t*6)*0.12); ctx.strokeStyle=C.ink; ctx.lineWidth=6; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0,-ms*1.1); ctx.stroke(); ctx.fillStyle='#FFE34D'; ctx.lineWidth=4; roundRect(-ms*0.55,-ms*2.0,ms*1.1,ms*0.95,ms*0.1); ctx.fill(); ctx.stroke(); ctx.fillStyle='#2E6FE0'; ctx.font=`900 ${Math.round(ms*0.7)}px Archivo, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('D',0,-ms*1.5); ctx.restore(); }
      ctx.restore(); };
    A.frame = t=>{
      // dirt mounds + holes
      for(const h of holes) moundSp.draw(h.x,h.y);
      const lip=h=>lipSp.draw(h.x,h.y);
      let target=null;
      ev.forEach((e,i)=>{ const age=t-e.t; if(age<0) return; target=e; if(!done['p'+i]){ done['p'+i]=1; SFX.popup(); }
        const whackAt = e.sign? Infinity : WH; let up, squash=false, alive=true;
        if(age<0.18) up=age/0.18; else if(age<whackAt) up=1; else if(age<whackAt+0.55){ up=1; squash=true; alive=false; } else { up=Math.max(0,1-(age-whackAt-0.55)/0.3); alive=false; }
        if(e.sign && age>0.18) up=1+Math.sin(t*9)*0.03;
        if(age>=whackAt && !done['w'+i]){ done['w'+i]=1; const h=holes[e.h]; for(let k=0;k<16;k++){ const a=Math.random()*Math.PI*2, v=rr(3,12); stars.push({x:h.x,y:h.y-ms*1.2,vx:Math.cos(a)*v,vy:Math.sin(a)*v-5,age:0,r:rr(4,9)}); } if(i===3){ A.struck=true; A.struckAt=t; hit('WHACKED!','whacked'); } else SFX.thwack(); }
        if(up>0){ mole(holes[e.h].x,holes[e.h].y,up,squash,e.sign,t,alive); lip(holes[e.h]); } });
      // mallet
      if(target){ const age=t-target.t; const h=holes[target.h]; mx+=(h.x-mx)*0.25; my+=(h.y-my)*0.25; let a, lift=0;
        if(target.sign){ a = age<0.7? 1.1 : age<1.3? 1.1+(age-0.7)/0.6*0.5 : 1.6; if(age>=1.3){ lift=Math.min(1,(age-1.3)/0.8); if(!done.spare){ done.spare=1; SFX.bell(); } if(lift<1 && Math.random()<0.4) hearts.push({x:h.x+rr(-ms,ms),y:h.y-ms*1.5,vy:-rr(1,3),a:1,r:rr(8,16)}); } }
        else { a = age<WH-0.12? 1.1 : age<WH? 1.1-((age-(WH-0.12))/0.12)*1.25 : age<WH+0.22? -0.15 : -0.15+Math.min(1,(age-WH-0.22)/0.3)*1.25; }
        const L=ms*1.5; ctx.save(); ctx.translate(mx+ms*1.3, my-ms*1.1-lift*H*0.6); ctx.rotate(a); ctx.lineCap='round'; ctx.strokeStyle=C.ink; ctx.lineWidth=ms*0.22; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-L,0); ctx.stroke(); ctx.strokeStyle='#c98a4b'; ctx.lineWidth=ms*0.13; ctx.stroke();
          ctx.fillStyle='#6b4a2b'; ctx.strokeStyle=C.ink; ctx.lineWidth=4; roundRect(-L-ms*0.3,-ms*0.42,ms*0.7,ms*0.84,ms*0.12); ctx.fill(); ctx.stroke(); ctx.fillStyle='#FFE34D'; ctx.fillRect(-L-ms*0.25,-ms*0.42,ms*0.12,ms*0.84); ctx.fillRect(-L+ms*0.15,-ms*0.42,ms*0.12,ms*0.84);
          // hand
          ctx.fillStyle='#f1c9a5'; ctx.beginPath(); ctx.arc(0,0,ms*0.22,0,7); ctx.fill(); ctx.stroke(); ctx.restore(); }
      for(const s of stars){ s.age+=1/60; s.vy+=0.45; s.x+=s.vx; s.y+=s.vy; const al=Math.max(0,1-s.age/0.9); ctx.globalAlpha=al; ctx.fillStyle='#FFE34D'; ctx.fillRect(s.x-s.r,s.y-s.r,s.r*2,s.r*2); } ctx.globalAlpha=1; for(let i=stars.length-1;i>=0;i--) if(stars[i].age>0.9) stars.splice(i,1);
      for(const hh2 of hearts){ hh2.y+=hh2.vy; hh2.a-=0.012; ctx.globalAlpha=Math.max(0,hh2.a); ctx.fillStyle='#F0562A'; ctx.beginPath(); ctx.arc(hh2.x-hh2.r*0.5,hh2.y,hh2.r*0.55,0,7); ctx.arc(hh2.x+hh2.r*0.5,hh2.y,hh2.r*0.55,0,7); ctx.fill(); ctx.beginPath(); ctx.moveTo(hh2.x-hh2.r,hh2.y+hh2.r*0.15); ctx.lineTo(hh2.x,hh2.y+hh2.r*1.1); ctx.lineTo(hh2.x+hh2.r,hh2.y+hh2.r*0.15); ctx.fill(); } ctx.globalAlpha=1; for(let i=hearts.length-1;i>=0;i--) if(hearts[i].a<=0) hearts.splice(i,1); };
    return A;
  },
  /* the pins get their revenge: ten pins charge in and flatten the bowling ball */
  reversebowl({W,H,hit}){
    const A = {dur:9, struck:false, struckAt:0}; SFX.charge();
    const laneY=H*0.72, R=Math.min(H*0.12,130), pinW=R*0.55, pinH=R*1.9; const ball={x:W*0.45,y:laneY-R,vx:0,vy:0,rot:0,r:R,dazed:false,grounded:true};
    const pins=[]; [[0],[-.5,.5],[-1,0,1],[-1.5,-.5,.5,1.5]].forEach((row,i)=>row.forEach(k=>pins.push({x0:W*1.08+i*pinW*1.5, x:0, off:k*pinW*1.7, ph:Math.random()*6})));
    const stopX = ball.x+R+pinW*0.4; const speed=(W*1.08-stopX)/2.0;
    // ball (gradient, outline, holes, eye whites), the two pin faces and the dizzy star are static shapes → sprites; pupils / X-eyes drawn live
    const ballSp=SPR.shape(-R-3,-R-3,R+3,R+3,g=>{ const b=ball; const gr=g.createRadialGradient(-b.r*.35,-b.r*.35,b.r*.1,0,0,b.r); gr.addColorStop(0,'#5f93f2'); gr.addColorStop(1,'#1b3f8f'); g.fillStyle=gr; g.beginPath(); g.arc(0,0,b.r,0,7); g.fill(); g.strokeStyle=C.ink; g.lineWidth=4; g.stroke();
      g.fillStyle='#0e2252'; [[-b.r*.25,-b.r*.3],[b.r*.1,-b.r*.4],[b.r*.3,-b.r*.05]].forEach(([x,y])=>{g.beginPath();g.arc(x,y,b.r*.11,0,7);g.fill();});
      g.fillStyle='#fff'; g.beginPath(); g.arc(-b.r*.3,b.r*.25,b.r*.2,0,7); g.arc(b.r*.1,b.r*.3,b.r*.2,0,7); g.fill(); },7);
    const drawBall=b=>{ ctx.save(); ctx.translate(b.x,b.y); ctx.rotate(b.rot); ballSp.draw(0,0);
      if(b.dazed){ ctx.strokeStyle='#151412'; ctx.lineWidth=b.r*0.05; for(const [ex,ey] of [[-b.r*.3,b.r*.25],[b.r*.1,b.r*.3]]){ ctx.beginPath(); ctx.moveTo(ex-b.r*.1,ey-b.r*.1); ctx.lineTo(ex+b.r*.1,ey+b.r*.1); ctx.moveTo(ex+b.r*.1,ey-b.r*.1); ctx.lineTo(ex-b.r*.1,ey+b.r*.1); ctx.stroke(); } }
      else { ctx.fillStyle='#151412'; const look=A.struck?0:Math.min(1,Math.max(0,(pins[0].x-b.x-R)/(W*0.4))); ctx.beginPath(); ctx.arc(-b.r*.3+b.r*.09*(1-look)+b.r*0.02,b.r*.28,b.r*.09,0,7); ctx.arc(b.r*.1+b.r*.09*(1-look)+b.r*0.02,b.r*.33,b.r*.09,0,7); ctx.fill(); }
      ctx.restore(); };
    const pinSp={}; for(const angry of [true,false]) pinSp[angry]=SPR.shape(-pinW*.65,-pinH-pinW*.3,pinW*.65,3,g=>{ g.translate(0,-pinH); g.fillStyle='#fff'; g.strokeStyle=C.ink; g.lineWidth=3; // origin = the pin's base (rotation pivot)
      g.beginPath(); g.moveTo(-pinW*.25,0); g.quadraticCurveTo(-pinW*.6,pinH*.35,-pinW*.5,pinH*.8); g.quadraticCurveTo(-pinW*.45,pinH,0,pinH); g.quadraticCurveTo(pinW*.45,pinH,pinW*.5,pinH*.8); g.quadraticCurveTo(pinW*.6,pinH*.35,pinW*.25,0); g.arc(0,0,pinW*.25,0,Math.PI,true); g.closePath(); g.fill(); g.stroke();
      g.strokeStyle='#F0562A'; g.lineWidth=pinH*.045; g.beginPath(); g.moveTo(-pinW*.42,pinH*.3); g.lineTo(pinW*.42,pinH*.3); g.moveTo(-pinW*.45,pinH*.4); g.lineTo(pinW*.45,pinH*.4); g.stroke();
      // face: angry eyes + eyebrows (or a grin after the hit)
      g.fillStyle='#151412'; g.beginPath(); g.arc(-pinW*.1,pinH*.08,pinW*.07,0,7); g.arc(pinW*.1,pinH*.08,pinW*.07,0,7); g.fill(); g.strokeStyle='#151412'; g.lineWidth=pinW*0.08; g.lineCap='round'; g.beginPath();
      if(angry){ g.moveTo(-pinW*.2,pinH*.0); g.lineTo(-pinW*.03,pinH*.04); g.moveTo(pinW*.2,pinH*.0); g.lineTo(pinW*.03,pinH*.04); g.moveTo(-pinW*.12,pinH*.17); g.lineTo(pinW*.12,pinH*.17); }
      else { g.moveTo(-pinW*.14,pinH*.14); g.quadraticCurveTo(0,pinH*.24,pinW*.14,pinH*.14); }
      g.stroke(); g.lineCap='butt'; },6);
    const drawPin=(x,y,a,angry)=>pinSp[angry].drawRot(x,y+pinH,a);
    const starR=R*0.16, starSp=SPR.shape(-starR-2,-starR-2,starR+2,starR+2,g=>{ g.fillStyle='#FFE34D'; g.strokeStyle=C.ink; g.lineWidth=2; g.beginPath(); for(let i=0;i<10;i++){ const rad=i%2?starR*0.45:starR; const an=i*Math.PI/5-Math.PI/2; g.lineTo(Math.cos(an)*rad,Math.sin(an)*rad); } g.closePath(); g.fill(); g.stroke(); },2);
    const star=(x,y,r,a)=>starSp.drawRot(x,y,a);
    A.frame = t=>{
      ctx.fillStyle='rgba(21,20,18,.05)'; ctx.fillRect(0,laneY,W,H*0.012);
      // dust behind the charging pins
      if(!A.struck){ ctx.globalAlpha=0.25; ctx.fillStyle=C.ink; for(let i=0;i<6;i++){ ctx.beginPath(); ctx.arc(pins[9].x+pins[9].off+pinW*1.5+i*pinW*0.9, laneY-rr(0,pinH*0.4), pinW*(0.3+i*0.12),0,7); ctx.fill(); } ctx.globalAlpha=1; }
      for(const p of pins){ if(!A.struck) p.x=p.x0-speed*t; }
      if(!A.struck && pins[0].x-pinW*0.3<=ball.x+R){ A.struck=true; A.struckAt=t; hit('REVENGE!','revenge'); ball.vx=-W/170; ball.vy=-20; ball.dazed=true; ball.grounded=false; }
      if(A.struck){ ball.vy+=0.9; ball.x+=ball.vx; ball.y+=ball.vy; ball.rot+=ball.vx/ball.r; if(ball.y>laneY-R && ball.vy>0){ ball.y=laneY-R; ball.vy*=-0.4; ball.vx*=0.92; if(Math.abs(ball.vy)<2) ball.vy=0; } }
      if(ball.x>-R*2) drawBall(ball);
      if(ball.dazed && ball.x>-R*2){ for(let i=0;i<5;i++){ const a=t*7+i*Math.PI*2/5; star(ball.x+Math.cos(a)*R*1.0, ball.y-R*1.25+Math.sin(a)*R*0.3, R*0.16, t*4+i); } }
      for(let i=pins.length-1;i>=0;i--){ const p=pins[i]; const run = A.struck? 0 : Math.sin(t*20+p.ph); const hop = A.struck? Math.abs(Math.sin((t-A.struckAt)*7+p.ph))*R*0.35 : Math.abs(run)*R*0.12; const tilt = A.struck? Math.sin((t-A.struckAt)*7+p.ph)*0.12 : -0.3+run*0.08; drawPin(p.x+p.off, laneY-pinH-hop, tilt, !A.struck); } };
    return A;
  },
  /* an armada of blue rubber ducks sails in; the big one wears a crown */
  ducks({W,H,hit}){
    const A = {dur:8.5, struck:false, struckAt:0}; SFX.bobbing();
    const layers=[{y:H*0.69,s:Math.min(H*0.045,50),col:'#BBD0F5',ph:0},{y:H*0.79,s:Math.min(H*0.06,66),col:'#7FAAF6',ph:2},{y:H*0.9,s:Math.min(H*0.075,82),col:'#1E4DA8',ph:4}];
    const N=60; const flock=[]; for(let i=0;i<N;i++){ const L=(i*7)%3; flock.push({L, x:(i+0.5)*W/N+rr(-W*0.015,W*0.015), ph:rr(0,6), s:layers[L].s*rr(0.85,1.15), big:false}); }
    flock.push({L:1, x:W*0.5, ph:1, s:layers[1].s*3.0, big:true});
    const ease=u=>1-Math.pow(1-u,3); const waveY=(L,x,t)=>layers[L].y+Math.sin(x/90+t*2.2+layers[L].ph)*layers[L].s*0.35+Math.sin(x/37-t*1.3)*layers[L].s*0.12;
    // every duck is a static shape (only position/tilt animate) → one sprite per duck at its exact size, drawn rotated
    const duckSp=(s,big)=>SPR.shape(-s*1.3,-s*1.5,s*1.4,s*0.7,g=>{ g.strokeStyle=C.ink; g.lineWidth=big?5:3;
      // tail
      g.fillStyle='#2E6FE0'; g.beginPath(); g.moveTo(-s*0.7,-s*0.1); g.lineTo(-s*1.25,-s*0.75); g.lineTo(-s*0.55,-s*0.5); g.closePath(); g.fill(); g.stroke();
      // body + wing
      g.beginPath(); g.ellipse(0,0,s,s*0.62,0,0,7); g.fill(); g.stroke(); g.fillStyle='#7FAAF6'; g.beginPath(); g.ellipse(-s*0.15,s*0.05,s*0.5,s*0.3,0.2,0,7); g.fill(); g.stroke();
      // head, beak, eye
      g.fillStyle='#2E6FE0'; g.beginPath(); g.arc(s*0.5,-s*0.6,s*0.45,0,7); g.fill(); g.stroke();
      g.fillStyle='#FFE34D'; SPR.rr(g,s*0.82,-s*0.72,s*0.5,s*0.24,s*0.1); g.fill(); g.stroke();
      g.fillStyle='#fff'; g.beginPath(); g.arc(s*0.6,-s*0.72,s*0.14,0,7); g.fill(); g.fillStyle='#151412'; g.beginPath(); g.arc(s*0.64,-s*0.72,s*0.06,0,7); g.fill();
      if(big){ // tiny crown
        g.fillStyle='#FFE34D'; g.beginPath(); g.moveTo(s*0.22,-s*0.95); g.lineTo(s*0.22,-s*1.35); g.lineTo(s*0.36,-s*1.15); g.lineTo(s*0.5,-s*1.45); g.lineTo(s*0.64,-s*1.15); g.lineTo(s*0.78,-s*1.35); g.lineTo(s*0.78,-s*0.95); g.closePath(); g.fill(); g.stroke();
        g.fillStyle='#F0562A'; for(const gx of [s*0.33,s*0.5,s*0.67]){ g.beginPath(); g.arc(gx,-s*1.05,s*0.045,0,7); g.fill(); } } },big?19:14);
    for(const d of flock) d.sp=duckSp(d.s,d.big);
    const duck=(x,y,d,tilt)=>d.sp.drawRot(x,y,tilt);
    A.frame = t=>{
      const off = -W*1.15*(1-ease(Math.min(1,t/2.4))) + t*8; const amp = A.struck? 1.6 : 1;
      for(let L=0;L<3;L++){ const ly=layers[L];
        ctx.beginPath(); ctx.moveTo(-60,H+60); for(let x=-60;x<=W+60;x+=14) ctx.lineTo(x, ly.y+(waveY(L,x,t)-ly.y)*amp); ctx.lineTo(W+60,H+60); ctx.closePath(); ctx.fillStyle=ly.col; ctx.fill(); ctx.strokeStyle=C.ink; ctx.lineWidth=3; ctx.stroke();
        for(const d of flock){ if(d.L!==L) continue; const x=d.x+off*(d.big?1:1+((d.ph%1)-0.5)*0.1); if(x<-d.s*2||x>W+d.s*2) continue; const wy=ly.y+(waveY(L,x,t)-ly.y)*amp; let y=wy-d.s*0.15+Math.sin(t*3+d.ph)*d.s*0.08*amp; const tilt=Math.cos(x/90+t*2.2+ly.ph)*0.2*amp+Math.sin(t*3+d.ph)*0.05;
          if(d.big && A.struck){ const f=t-A.struckAt; if(f<0.6) y-=Math.sin(f/0.6*Math.PI)*d.s*0.6; }
          duck(x,y,d,tilt); } }
      // splash drops around the big duck after the quack
      if(A.struck && t<A.struckAt+0.6){ const d=flock[N]; const x=d.x+off; ctx.fillStyle='#fff'; for(let i=0;i<10;i++){ ctx.beginPath(); ctx.arc(x+rr(-d.s*1.6,d.s*1.6), layers[1].y+rr(-d.s*0.4,d.s*0.2)-(t-A.struckAt)*H*0.2, rr(4,12),0,7); ctx.fill(); } }
      if(!A.struck && t>=2.4){ A.struck=true; A.struckAt=t; hit('QUACK!','quack'); } };
    return A;
  }
});
KINDS.push('wrestling','volcano','whackamole','reversebowl','ducks');
/* Election Night viewer — extra celebration animations, part 2:
   airhorn, pizza, toaster, yoink, lasercat.  Same contract as anims.js. */
SFX.airhorn = function(){ for(const [f,v] of [[440,0.22],[554,0.18],[659,0.14],[443,0.1]]){ tone(f, 0, 1.9, 'sawtooth', v, f*0.985); } noise(0, 1.9, 0.12, 2500); tone(110, 0, 1.9, 'square', 0.12, 105); cheer(0.9); };
SFX.scooter = function(){ for(let i=0;i<40;i++) tone(90+Math.sin(i*0.5)*20, i*0.04, 0.05, 'sawtooth', 0.12, 70); tone(900, 0.9, 0.12, 'square', 0.15); tone(900, 1.08, 0.12, 'square', 0.15); noise(1.3, 0.5, 0.3, 1500); };
SFX.pizza = function(){ tone(1568, 0, 0.5, 'sine', 0.3); tone(2093, 0.12, 0.7, 'sine', 0.25); noise(0.1, 0.3, 0.3, 3000); cheer(0.3); };
SFX.toastDown = function(){ tone(260, 0, 0.08, 'square', 0.3, 120); noise(0, 0.1, 0.3, 2000); tone(55, 0.15, 1.8, 'sine', 0.2, 60); };
SFX.ding = function(){ tone(1760, 0, 1.4, 'sine', 0.35); tone(3520, 0, 0.7, 'sine', 0.12); tone(2640, 0.02, 0.4, 'triangle', 0.08); noise(0.05, 0.15, 0.2, 4000); cheer(0.4); };
SFX.yoink = function(){ tone(280, 0, 0.55, 'sine', 0.35, 1500); tone(290, 0.02, 0.55, 'triangle', 0.15, 1550); noise(0, 0.12, 0.25, 2000); cheer(0.3); };
SFX.creep = function(){ for(let i=0;i<6;i++) tone(110+i*8, i*0.22, 0.25, 'triangle', 0.14, 95+i*8); };
SFX.pew = function(){ for(let i=0;i<9;i++){ tone(1800, i*0.18, 0.22, 'square', 0.16, 300); tone(2400, i*0.18, 0.12, 'sawtooth', 0.06, 500); } cheer(0.5); };
SFX.meow = function(){ tone(600, 0, 0.35, 'sawtooth', 0.12, 900); tone(900, 0.35, 0.45, 'sawtooth', 0.12, 500); };

Object.assign(ANIMS, {
  /* a giant air horn descends from above and blasts the whole screen */
  airhorn({W,H,r,hit}){
    const A = {dur:8.5, struck:false, struckAt:0}; const rings=[]; let lastRing=-1; const S=Math.min(H*0.5,560); const cx=W*0.5;
    A.frame = t=>{
      const drop = Math.min(1, t/1.5); const ease = 1-Math.pow(1-drop,3); const hy = -S*1.1 + ease*(S*1.1+H*0.02);
      const blast = A.struck && t<A.struckAt+2.6; const bt = A.struck? t-A.struckAt : 0;
      ctx.save();
      if(blast){ const amp = 10*(1-bt/2.6); ctx.translate(rr(-amp,amp), rr(-amp,amp)); }
      // sound rings expanding from the bell mouth
      const mx=cx, my=hy+S*1.05;
      if(blast && Math.floor(bt/0.14)!==lastRing && bt<2.2){ lastRing=Math.floor(bt/0.14); rings.push({r:S*0.3, a:1, c:lastRing%2?'#2E6FE0':'#FFE34D'}); }
      ctx.lineWidth=14; for(const g of rings){ g.r += W*0.012; g.a -= 0.012; if(g.a<=0) continue; ctx.globalAlpha=Math.max(0,g.a)*0.9; ctx.strokeStyle=g.c; ctx.beginPath(); ctx.arc(mx,my,g.r,0,7); ctx.stroke(); } ctx.globalAlpha=1;
      while(rings.length && rings[0].a<=0) rings.shift();
      // "sound lines" bursting out
      if(blast){ ctx.strokeStyle='#F0562A'; ctx.lineWidth=8; ctx.lineCap='round'; ctx.beginPath(); for(let i=0;i<16;i++){ const a=i/16*Math.PI*2 + bt*2; const r0=S*0.35+((bt*900+i*60)%300), r1=r0+60; ctx.moveTo(mx+Math.cos(a)*r0,my+Math.sin(a)*r0); ctx.lineTo(mx+Math.cos(a)*r1,my+Math.sin(a)*r1); } ctx.stroke(); }
      // the horn: red can on top, flared bell below pointing down at the page
      ctx.save(); ctx.translate(cx, hy); if(blast) ctx.translate(rr(-6,6), rr(-4,4));
      ctx.strokeStyle=C.ink; ctx.lineWidth=7;
      // can
      ctx.fillStyle='#F0562A'; roundRect(-S*0.18,0,S*0.36,S*0.42,S*0.05); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#fff'; ctx.fillRect(-S*0.13,S*0.05,S*0.06,S*0.32); // highlight
      ctx.fillStyle='#FFE34D'; roundRect(-S*0.18,S*0.16,S*0.36,S*0.1,4); ctx.fill(); ctx.stroke();
      ctx.fillStyle=C.ink; ctx.font=`900 ${Math.round(S*0.065)}px Archivo, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('LOUD', 0, S*0.21);
      // trigger button + thumb pressing it
      const press = A.struck? Math.min(1,bt*6) : 0; ctx.fillStyle='#8C8A84'; roundRect(S*0.18,S*0.04,S*0.1-press*S*0.04,S*0.08,6); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#F1C27D'; roundRect(S*0.26-press*S*0.04,-S*0.02,S*0.22,S*0.2,S*0.08); ctx.fill(); ctx.stroke();
      // neck
      ctx.fillStyle='#BBD0F5'; ctx.fillRect(-S*0.1,S*0.42,S*0.2,S*0.14); ctx.strokeRect(-S*0.1,S*0.42,S*0.2,S*0.14);
      // bell (trapezoid with curved flare)
      ctx.fillStyle='#F0562A'; ctx.beginPath(); ctx.moveTo(-S*0.12,S*0.56); ctx.quadraticCurveTo(-S*0.2,S*0.95,-S*0.55,S*1.05); ctx.lineTo(S*0.55,S*1.05); ctx.quadraticCurveTo(S*0.2,S*0.95,S*0.12,S*0.56); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#fff'; ctx.beginPath(); ctx.moveTo(-S*0.09,S*0.6); ctx.quadraticCurveTo(-S*0.15,S*0.9,-S*0.4,S*1.0); ctx.lineTo(-S*0.3,S*1.0); ctx.quadraticCurveTo(-S*0.1,S*0.9,-S*0.04,S*0.6); ctx.closePath(); ctx.fill();
      // bell mouth (ellipse rim)
      ctx.fillStyle='#1c1b19'; ctx.beginPath(); ctx.ellipse(0,S*1.05,S*0.55,S*0.1,0,0,7); ctx.fill(); ctx.strokeStyle='#FFE34D'; ctx.lineWidth=6; ctx.beginPath(); ctx.ellipse(0,S*1.05,S*0.55,S*0.1,0,0,7); ctx.stroke();
      ctx.restore();
      // the state cowering under the horn, ears covered
      const st=STATES[r.st]||STATES.TX; const path=new Path2D(st.d); const sc=Math.min(H*0.22/300,1.1); const sx=W*0.5, sy=H*0.82;
      ctx.save(); ctx.translate(sx,sy); if(blast) ctx.translate(rr(-12,12),rr(-12,12)); ctx.rotate(blast? Math.sin(t*40)*0.08 : 0); ctx.scale(sc,sc); ctx.translate(-st.c[0],-st.c[1]); ctx.fillStyle='#2E6FE0'; ctx.strokeStyle=C.ink; ctx.lineWidth=4/sc; ctx.fill(path); ctx.stroke(path); ctx.restore();
      ctx.fillStyle=C.ink; ctx.font=`900 ${Math.round(H*0.05)}px Archivo, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(r.st, sx, sy);
      ctx.restore();
      if(!A.struck && t>=1.8){ A.struck=true; A.struckAt=t; hit('BWAAAMP!','airhorn'); } };
    return A;
  },
  /* a delivery scooter skids in; the pizza box opens; the state is the pizza and it gets sliced */
  pizza({W,H,r,hit}){
    const A = {dur:9, struck:false, struckAt:0}; SFX.scooter(); const st=STATES[r.st]||STATES.TX; const path=new Path2D(st.d); const sc=Math.min(H*0.48/300,2.1); const smoke=[]; const S=Math.min(H*0.22,240); const N=8; const cuts=[...Array(N)].map((_,i)=>i/N*Math.PI*2+0.3);
    const scooter=(x,y,s,t,tilt)=>{ ctx.save(); ctx.translate(x,y); ctx.rotate(tilt); ctx.strokeStyle=C.ink; ctx.lineWidth=5;
      // wheels
      for(const wx of [-s*0.6,s*0.55]){ ctx.fillStyle='#3a3835'; ctx.beginPath(); ctx.arc(wx,0,s*0.22,0,7); ctx.fill(); ctx.stroke(); ctx.fillStyle='#3a3835'; ctx.beginPath(); ctx.arc(wx,0,s*0.22,0,7); ctx.fill(); ctx.fillStyle='#8C8A84'; ctx.beginPath(); ctx.arc(wx,0,s*0.1,0,7); ctx.fill(); ctx.strokeStyle='#fff'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(wx-s*0.15,0); ctx.lineTo(wx+s*0.15,0); ctx.moveTo(wx,-s*0.15); ctx.lineTo(wx,s*0.15); ctx.stroke(); ctx.strokeStyle=C.ink; ctx.lineWidth=5; }
      // body
      ctx.fillStyle='#F0562A'; ctx.beginPath(); ctx.moveTo(-s*0.75,-s*0.2); ctx.lineTo(-s*0.2,-s*0.55); ctx.lineTo(s*0.3,-s*0.55); ctx.lineTo(s*0.45,-s*0.25); ctx.lineTo(s*0.7,-s*0.9); ctx.lineTo(s*0.82,-s*0.86); ctx.lineTo(s*0.6,-s*0.2); ctx.lineTo(s*0.3,-s*0.05); ctx.lineTo(-s*0.75,-s*0.05); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#fff'; ctx.fillRect(-s*0.5,-s*0.38,s*0.5,s*0.08);
      // handlebars + headlight
      ctx.beginPath(); ctx.moveTo(s*0.6,-s*0.95); ctx.lineTo(s*0.95,-s*1.0); ctx.stroke(); ctx.fillStyle='#FFE34D'; ctx.beginPath(); ctx.arc(s*0.72,-s*0.72,s*0.09,0,7); ctx.fill(); ctx.stroke();
      // seat + delivery box on the back
      ctx.fillStyle=C.ink; roundRect(-s*0.25,-s*0.7,s*0.5,s*0.14,s*0.05); ctx.fill();
      ctx.fillStyle='#2E6FE0'; roundRect(-s*0.95,-s*1.15,s*0.6,s*0.55,s*0.06); ctx.fill(); ctx.stroke(); ctx.fillStyle='#fff'; ctx.font=`900 ${Math.round(s*0.16)}px Archivo, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('HOT', -s*0.65, -s*0.96); ctx.fillText('VOTES', -s*0.65, -s*0.78);
      // rider: legs, torso, helmet
      ctx.fillStyle='#2E6FE0'; roundRect(-s*0.1,-s*1.25,s*0.36,s*0.6,s*0.12); ctx.fill(); ctx.stroke();
      ctx.lineWidth=s*0.09; ctx.lineCap='round'; ctx.beginPath(); ctx.moveTo(s*0.05,-s*0.7); ctx.lineTo(s*0.3,-s*0.3); ctx.moveTo(s*0.15,-s*1.1); ctx.lineTo(s*0.75,-s*0.95); ctx.stroke(); ctx.lineWidth=5; ctx.lineCap='butt';
      ctx.fillStyle='#FFE34D'; ctx.beginPath(); ctx.arc(s*0.1,-s*1.45,s*0.24,Math.PI,0); ctx.lineTo(s*0.34,-s*1.35); ctx.lineTo(-s*0.14,-s*1.35); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle='#F1C27D'; ctx.fillRect(-s*0.08,-s*1.35,s*0.36,s*0.14); ctx.strokeRect(-s*0.08,-s*1.35,s*0.36,s*0.14); ctx.fillStyle=C.ink; ctx.fillRect(s*0.14,-s*1.32,s*0.05,s*0.06);
      ctx.restore(); };
    A.frame = t=>{
      const gy=H*0.86; const u=Math.min(1,t/1.5); const easeOut=1-Math.pow(1-u,3); const x=-S*2 + easeOut*(W*0.22+S*2); const skid = u<1? Math.sin(u*Math.PI)*-0.18 : 0;
      if(u<1 && Math.random()<0.9) smoke.push({x:x-S*0.6, y:gy, r:rr(10,30), vx:-rr(2,6), vy:-rr(1,3), a:1});
      for(const m of smoke){ m.x+=m.vx; m.y+=m.vy; m.r+=0.8; m.a-=0.012; ctx.globalAlpha=Math.max(0,m.a)*0.55; ctx.fillStyle='#8C8A84'; ctx.beginPath(); ctx.arc(m.x,m.y,m.r,0,7); ctx.fill(); } ctx.globalAlpha=1; while(smoke.length && smoke[0].a<=0) smoke.shift();
      if(u<1){ ctx.strokeStyle=C.ink; ctx.lineWidth=6; ctx.beginPath(); ctx.moveTo(Math.max(-10,x-S*2.2),gy+S*0.2); ctx.lineTo(x-S*0.4,gy+S*0.2); ctx.stroke(); }
      scooter(x, gy, S, t, skid);
      // the pizza box: slides out of the delivery box into centre, lid opens
      const bt=Math.max(0,t-1.4); const bu=Math.min(1,bt/0.7); const be=1-Math.pow(1-bu,2); const bsc=0.3+be*0.7; const bw=Math.min(W*0.4,H*0.66)*bsc, bh=bw*0.09; const bx = x-S*0.65 + be*(W*0.55-(x-S*0.65)); const by = gy-S*0.6 - Math.sin(bu*Math.PI)*H*0.3 + be*(H*0.74-(gy-S*0.6));
      const open = Math.min(1, Math.max(0,(t-2.1)/0.5)); const lidA = -open*Math.PI*0.8;
      // pizza inside: rises once the lid is open
      const rise = Math.min(1, Math.max(0,(t-2.5)/0.6)); const re=1-Math.pow(1-rise,2); const px=bx, py=by-bh*0.5 - re*H*0.3; const psc=sc*(0.35+re*0.65);
      const fly = A.struck? Math.min(1,(t-A.struckAt)/2.2) : 0; const fe=1-Math.pow(1-fly,2);
      const lid=(back)=>{ ctx.save(); ctx.translate(bx,by-bh*1.6); ctx.strokeStyle=C.ink; ctx.lineWidth=5; ctx.scale(1, Math.max(0.08, Math.abs(Math.cos(lidA)))); ctx.fillStyle= back? '#E8C090' : '#D9A05B'; roundRect(-bw/2,-bw*0.62,bw,bw*0.62,10); ctx.fill(); ctx.stroke();
        if(!back){ ctx.fillStyle='#F0562A'; ctx.beginPath(); ctx.arc(0,-bw*0.31,bw*0.14,0,7); ctx.fill(); ctx.stroke(); ctx.fillStyle='#fff'; ctx.font=`900 ${Math.round(bw*0.12)}px Archivo, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('D', 0, -bw*0.31); }
        else { ctx.fillStyle='#C98A4B'; ctx.font=`900 ${Math.round(bw*0.07)}px Archivo, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('YOU VOTED. YOU EARNED THIS.', 0, -bw*0.5); }
        ctx.restore(); };
      const lidBack = Math.cos(lidA)<0; if(lidBack) lid(true);
      ctx.save(); ctx.translate(bx,by);
      // box base
      ctx.fillStyle='#D9A05B'; ctx.strokeStyle=C.ink; ctx.lineWidth=5; roundRect(-bw/2,-bh,bw,bh,8); ctx.fill(); ctx.stroke();
      ctx.restore();
      if(open>0){ // the pizza = the state
        const drawSlice=(i)=>{ ctx.save(); const a0=cuts[i], a1=cuts[(i+1)%N]; const mid=(a0 + (i===N-1? a1+Math.PI*2 : a1))/2; const d=fe*Math.min(W,H)*0.55; ctx.translate(px+Math.cos(mid)*d, py+Math.sin(mid)*d); ctx.rotate(fe*(i%2?1:-1)*1.5); ctx.scale(psc,psc); ctx.translate(-st.c[0],-st.c[1]);
          if(A.struck){ ctx.beginPath(); ctx.moveTo(st.c[0],st.c[1]); ctx.arc(st.c[0],st.c[1],2000,a0,i===N-1? a1+Math.PI*2 : a1); ctx.closePath(); ctx.clip(); }
          ctx.fillStyle='#F0562A'; ctx.strokeStyle='#F0562A'; ctx.lineWidth=34/psc; ctx.lineJoin='round'; ctx.stroke(path); ctx.strokeStyle=C.ink; ctx.lineWidth=46/psc; ctx.stroke(path); ctx.strokeStyle='#F0562A'; ctx.lineWidth=36/psc; ctx.stroke(path);
          ctx.fillStyle='#2E6FE0'; ctx.fill(path);
          // pepperoni (yellow) + cheese bubbles (white), clipped to the state
          ctx.clip(path); ctx.fillStyle='#FFE34D'; for(let k=0;k<14;k++){ const a=k*2.4, rad=60+((k*37)%160); ctx.beginPath(); ctx.arc(st.c[0]+Math.cos(a)*rad*1.4, st.c[1]+Math.sin(a)*rad, 22,0,7); ctx.fill(); }
          ctx.fillStyle='#fff'; for(let k=0;k<10;k++){ const a=k*1.9+1, rad=40+((k*53)%170); ctx.beginPath(); ctx.arc(st.c[0]+Math.cos(a)*rad*1.4, st.c[1]+Math.sin(a)*rad, 9,0,7); ctx.fill(); }
          ctx.restore(); };
        if(A.struck){ for(let i=0;i<N;i++) drawSlice(i); } else { drawSlice(0); }
        // cut lines just before the split
        if(!A.struck && rise>=1){ ctx.strokeStyle='#fff'; ctx.lineWidth=5; ctx.setLineDash([14,10]); ctx.beginPath(); for(const a of cuts){ ctx.moveTo(px,py); ctx.lineTo(px+Math.cos(a)*H*0.25, py+Math.sin(a)*H*0.2); } ctx.stroke(); ctx.setLineDash([]); }
        if(fly<0.5){ ctx.fillStyle='#fff'; ctx.font=`900 ${Math.round(H*0.06*psc/sc)}px Archivo, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.strokeStyle=C.ink; ctx.lineWidth=6; ctx.strokeText(r.st, px, py); ctx.fillText(r.st, px, py); }
      }
      // box front + lid (drawn over the pizza so it looks like it lives inside)
      ctx.save(); ctx.translate(bx,by); ctx.strokeStyle=C.ink; ctx.lineWidth=5;
      ctx.fillStyle='#C98A4B'; roundRect(-bw/2,-bh*1.6,bw,bh*0.7,6); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#fff'; ctx.font=`900 ${Math.round(bh*0.5)}px Archivo, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText("MAMA D's PIZZA", 0, -bh*1.25);
      ctx.restore();
      if(!lidBack) lid(false);
      if(!A.struck && t>=3.4){ A.struck=true; A.struckAt=t; hit('DELIVERED!','pizza'); } };
    return A;
  },
  /* a chrome toaster: lever down, glow, the state pops out golden-brown with butter on top */
  toaster({W,H,r,hit}){
    const A = {dur:8.5, struck:false, struckAt:0}; setTimeout(()=>SFX.toastDown(), 350); const st=STATES[r.st]||STATES.TX; const path=new Path2D(st.d); const sc=Math.min(H*0.46/300,2.0);
    const TW=Math.min(W*0.5,H*0.95), TH=TW*0.42, tx=W*0.5, ty=H*0.96; let vy=0, y=0, landed=false, bounces=0;
    A.frame = t=>{
      const lever = t<0.35? 0 : t<0.9? (t-0.35)/0.55 : 1; const glow = t<0.9? 0 : Math.min(1,(t-0.9)/0.6) * (A.struck? Math.max(0,1-(t-A.struckAt)*2) : 1);
      // crumbs / heat shimmer above the slots
      if(glow>0.2){ ctx.strokeStyle='#F0562A'; ctx.lineWidth=4; ctx.globalAlpha=glow*0.8; ctx.beginPath(); for(let i=0;i<9;i++){ const x=tx-TW*0.38+i*TW*0.095; ctx.moveTo(x, ty-TH); for(let k=1;k<=6;k++) ctx.lineTo(x+Math.sin(t*12+i+k)*10, ty-TH-k*TH*0.08); } ctx.stroke(); ctx.globalAlpha=1; }
      // the toast (the state) — hidden inside until it pops, then physics
      const sy0 = ty-TH*0.5; if(!A.struck){ y = sy0 + TH*0.1; }
      else if(!landed){ vy += 0.55; y += vy; const land = ty-TH-H*0.2; if(y>land && vy>0){ /* lands on the toaster top, bouncing */ y=land; vy*=-0.45; bounces++; if(Math.abs(vy)<2){ landed=true; vy=0; } } }
      const toastSc = sc*(A.struck? 1 : 0.7); const squash = (A.struck && !landed)? 1 : 1+Math.sin(t*9)*0.03;
      const drawToast=()=>{ ctx.save(); ctx.translate(tx, y); ctx.rotate(A.struck? Math.sin((t-A.struckAt)*3)*0.08*(landed?0.3:1) : 0); ctx.scale(toastSc*squash, toastSc/squash); ctx.translate(-st.c[0],-st.c[1]);
        ctx.fillStyle = A.struck? '#D98A32' : '#F3D9A4'; ctx.strokeStyle='#8A4B22'; ctx.lineWidth=16/toastSc; ctx.lineJoin='round'; ctx.stroke(path); ctx.strokeStyle=C.ink; ctx.lineWidth=5/toastSc; ctx.fill(path); ctx.stroke(path);
        // toast grill marks
        if(A.struck){ ctx.save(); ctx.clip(path); ctx.strokeStyle='#8A4B22'; ctx.globalAlpha=0.5; ctx.lineWidth=14/toastSc; ctx.beginPath(); for(let i=-4;i<=4;i++){ ctx.moveTo(st.c[0]-400+i*90, st.c[1]-300); ctx.lineTo(st.c[0]+200+i*90, st.c[1]+300); } ctx.stroke(); ctx.restore(); }
        ctx.restore(); };
      if(!A.struck){ // clip to the region above the toaster body so the toast peeks out of the slot
        ctx.save(); ctx.beginPath(); ctx.rect(0,0,W,ty-TH); ctx.clip(); drawToast(); ctx.restore(); }
      else drawToast();
      // butter pat + label
      if(A.struck){ const bs=TW*0.11; ctx.save(); ctx.translate(tx, y - bs*0.6); ctx.rotate(Math.sin((t-A.struckAt)*3)*0.08*(landed?0.3:1)); ctx.fillStyle='#FFE34D'; ctx.strokeStyle=C.ink; ctx.lineWidth=4; roundRect(-bs/2,-bs*0.3,bs,bs*0.6,bs*0.1); ctx.fill(); ctx.stroke(); ctx.fillStyle='#fff'; ctx.fillRect(-bs*0.4,-bs*0.22,bs*0.5,bs*0.12); const melt=Math.min(1,(t-A.struckAt)/2); ctx.fillStyle='#FFE34D'; ctx.globalAlpha=0.8; ctx.beginPath(); ctx.ellipse(0,bs*0.3,bs*(0.5+melt*0.5),bs*0.18*(0.3+melt),0,0,7); ctx.fill(); ctx.globalAlpha=1; ctx.restore();
        ctx.fillStyle=C.ink; ctx.font=`900 ${Math.round(H*0.055)}px Archivo, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(r.st, tx, y+TW*0.08); }
      // chrome toaster body
      ctx.save(); ctx.translate(tx,ty); const g=ctx.createLinearGradient(-TW/2,0,TW/2,0); g.addColorStop(0,'#8C8A84'); g.addColorStop(0.25,'#E9E7E1'); g.addColorStop(0.5,'#A9A7A1'); g.addColorStop(0.75,'#F2F0EA'); g.addColorStop(1,'#7C7A74'); ctx.fillStyle=g; ctx.strokeStyle=C.ink; ctx.lineWidth=6;
      ctx.beginPath(); ctx.moveTo(-TW/2,0); ctx.lineTo(-TW/2,-TH*0.75); ctx.quadraticCurveTo(-TW/2,-TH,-TW*0.4,-TH); ctx.lineTo(TW*0.4,-TH); ctx.quadraticCurveTo(TW/2,-TH,TW/2,-TH*0.75); ctx.lineTo(TW/2,0); ctx.closePath(); ctx.fill(); ctx.stroke();
      // top face with two long slots, glowing orange when on
      ctx.fillStyle='#D8D6D0'; roundRect(-TW*0.46,-TH-TH*0.1,TW*0.92,TH*0.12,10); ctx.fill(); ctx.stroke();
      for(const sy of [-TH-TH*0.075, -TH-TH*0.025]){ ctx.fillStyle = glow>0? `rgb(${Math.round(21+glow*219)},${Math.round(20+glow*66)},${Math.round(18+glow*24)})` : '#151412'; roundRect(-TW*0.4,sy-7,TW*0.8,14,5); ctx.fill(); ctx.stroke(); }
      // lever on the right
      ctx.fillStyle='#F0562A'; roundRect(TW/2-6,-TH*0.75+lever*TH*0.45,TW*0.09,TH*0.12,8); ctx.fill(); ctx.stroke(); ctx.fillStyle=C.ink; ctx.fillRect(TW/2-2,-TH*0.75,8,TH*0.6);
      // dial + feet
      ctx.fillStyle='#FFE34D'; ctx.beginPath(); ctx.arc(TW*0.36,-TH*0.3,TH*0.12,0,7); ctx.fill(); ctx.stroke(); ctx.lineWidth=5; ctx.beginPath(); ctx.moveTo(TW*0.36,-TH*0.3); const da=-2.2+Math.min(1,t/0.9)*2.6; ctx.lineTo(TW*0.36+Math.cos(da)*TH*0.1,-TH*0.3+Math.sin(da)*TH*0.1); ctx.stroke();
      ctx.fillStyle=C.ink; ctx.font=`900 ${Math.round(TH*0.09)}px Archivo, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('LIGHT', TW*0.25,-TH*0.12); ctx.fillText('DARK', TW*0.46,-TH*0.12);
      ctx.font=`900 ${Math.round(TH*0.2)}px Archivo, sans-serif`; ctx.fillStyle='#2E6FE0'; ctx.fillText('TOAST-O-MATIC', -TW*0.12, -TH*0.3);
      ctx.fillStyle=C.ink; for(const fx of [-TW*0.4, TW*0.4]) roundRect(fx-TW*0.04,0,TW*0.08,TH*0.08,4), ctx.fill();
      ctx.restore();
      if(!A.struck && t>=2.3){ A.struck=true; A.struckAt=t; vy=-Math.sqrt(2*0.55*H*0.55); hit('TOASTED!','ding'); } };
    return A;
  },
  /* a giant hand reaches in from the right, pinches the state off the map and pockets it */
  yoink({W,H,r,hit}){
    const A = {dur:8.5, struck:false, struckAt:0}; setTimeout(()=>SFX.creep(), 100); const st=STATES[r.st]||STATES.TX; const path=new Path2D(st.d); const sc=Math.min(H*0.42/300,1.9); const HS=Math.min(H*0.55,600); const sx0=W*0.36, sy0=H*0.52;
    const hand=(x,y,s,pinch,rot)=>{ ctx.save(); ctx.translate(x,y); ctx.rotate(rot); ctx.lineCap='round'; ctx.lineJoin='round';
      const L=s*0.6, fw=s*0.15, gap=(1-pinch)*s*0.32; const px=L*0.85; // origin = the pinch point; palm starts at px
      const fingers=[[0,-gap/2, px+s*0.05,-s*0.22],[0,gap/2, px+s*0.05,s*0.12]]; const stubs=[[px-s*0.22,s*0.02],[px-s*0.2,s*0.18],[px-s*0.16,s*0.32]];
      // ink outlines first, then skin on top (so overlapping strokes merge)
      for(const pass of [0,1]){ ctx.strokeStyle= pass? '#F1C27D' : C.ink; ctx.lineWidth= pass? fw : fw+12;
        ctx.beginPath(); for(const [sx,sy] of stubs){ ctx.moveTo(px+s*0.1,sy); ctx.lineTo(sx,sy); } ctx.stroke();
        ctx.beginPath(); for(const [x0,y0,x1,y1] of fingers){ ctx.moveTo(x0,y0); ctx.lineTo(x1,y1); } ctx.stroke(); }
      // fingernails
      ctx.fillStyle='#fff'; ctx.strokeStyle=C.ink; ctx.lineWidth=3; for(const [x0,y0] of fingers){ roundRect(x0-fw*0.1,y0-fw*0.25,fw*0.45,fw*0.5,fw*0.2); ctx.fill(); ctx.stroke(); }
      // palm
      ctx.fillStyle='#F1C27D'; ctx.strokeStyle=C.ink; ctx.lineWidth=7; roundRect(px,-s*0.38,s*0.62,s*0.78,s*0.2); ctx.fill(); ctx.stroke();
      // sleeve (blue with a white cuff) running off the right edge
      ctx.fillStyle='#fff'; roundRect(px+s*0.52,-s*0.42,s*0.16,s*0.84,8); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#2E6FE0'; ctx.fillRect(px+s*0.68,-s*0.4,W+s,s*0.8); ctx.strokeRect(px+s*0.68,-s*0.4,W+s,s*0.8);
      ctx.restore(); };
    A.frame = t=>{
      const reach = Math.min(1, t/1.4); const re=1-Math.pow(1-reach,3); const pinch = Math.min(1, Math.max(0,(t-1.4)/0.35));
      const lift = A.struck? Math.min(1,(t-A.struckAt)/1.6) : 0; const le = lift*lift;
      // where the state is: on the "map" until lifted, then carried up-right and off screen
      const sx = sx0 + le*(W*0.9), sy = sy0 - Math.sin(Math.min(1,lift*1.2)*Math.PI)*H*0.35 + le*(-H*0.2); const srot = le*0.9 + (pinch>0 && !A.struck? Math.sin(t*30)*0.03 : 0);
      // dotted outline left behind on the map
      if(A.struck){ ctx.save(); ctx.translate(sx0,sy0); ctx.scale(sc,sc); ctx.translate(-st.c[0],-st.c[1]); ctx.setLineDash([16/sc,12/sc]); ctx.strokeStyle=C.ink; ctx.lineWidth=5/sc; ctx.globalAlpha=0.9; ctx.stroke(path); ctx.setLineDash([]); ctx.restore();
        ctx.fillStyle=C.ink; ctx.globalAlpha=Math.min(1,lift*2); ctx.font=`900 ${Math.round(H*0.09)}px Archivo, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('?', sx0, sy0); ctx.font=`700 ${Math.round(H*0.03)}px Archivo, sans-serif`; ctx.fillText('(gone)', sx0, sy0+H*0.08); ctx.globalAlpha=1; }
      // the state
      if(sx < W+H){ ctx.save(); ctx.translate(sx,sy); ctx.rotate(srot); ctx.scale(sc,sc); ctx.translate(-st.c[0],-st.c[1]); ctx.fillStyle='#FFE34D'; ctx.strokeStyle=C.ink; ctx.lineWidth=4/sc; ctx.fill(path); ctx.stroke(path); ctx.restore();
        ctx.fillStyle=C.ink; ctx.font=`900 ${Math.round(H*0.05)}px Archivo, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(r.st, sx, sy);
        // worried eyes on the state
        const cs=Math.cos(srot), sn=Math.sin(srot); const ex=sx+(-sc*20)*cs-(-sc*45)*sn, ey=sy+(-sc*20)*sn+(-sc*45)*cs; ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(ex-18,ey,16,0,7); ctx.arc(ex+18,ey,16,0,7); ctx.fill(); ctx.fillStyle=C.ink; const look=pinch>0? -5:0; ctx.beginPath(); ctx.arc(ex-18+look,ey+(pinch>0?-4:2),7,0,7); ctx.arc(ex+18+look,ey+(pinch>0?-4:2),7,0,7); ctx.fill(); }
      // the hand: approaches the state's top-right edge, pinches, then carries it away
      const hx = sx + sc*95 + (1-re)*(W*0.8); const hy = sy - sc*70 + (re<1? Math.sin(t*5)*8 : 0);
      hand(hx, hy, HS, pinch, -0.25*le);
      // motion lines when it yanks
      if(A.struck && lift<0.6){ ctx.strokeStyle=C.ink; ctx.lineWidth=5; ctx.lineCap='round'; ctx.beginPath(); for(let i=0;i<6;i++){ const a=-2.2+i*0.25; ctx.moveTo(sx0+Math.cos(a)*H*0.26, sy0+Math.sin(a)*H*0.26); ctx.lineTo(sx0+Math.cos(a)*H*0.36, sy0+Math.sin(a)*H*0.36); } ctx.stroke(); }
      if(!A.struck && pinch>=1 && t>=1.9){ A.struck=true; A.struckAt=t; hit('YOINK!','yoink'); } };
    return A;
  },
  /* a cartoon cat rises from the bottom and sweeps the screen with eye lasers, turning it blue */
  lasercat({W,H,r,hit}){
    const A = {dur:9, struck:false, struckAt:0}; setTimeout(()=>SFX.meow(), 200); const S=Math.min(W*0.32,H*0.6); const cx=W*0.5; const sparks=[]; let swept=0;
    const cat=(x,y,s,t,fire)=>{ ctx.save(); ctx.translate(x,y); ctx.strokeStyle=C.ink; ctx.lineWidth=7; ctx.lineJoin='round';
      // body
      ctx.fillStyle='#8C8A84'; ctx.beginPath(); ctx.ellipse(0,s*0.75,s*0.55,s*0.55,0,0,7); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#fff'; ctx.beginPath(); ctx.ellipse(0,s*0.8,s*0.3,s*0.38,0,0,7); ctx.fill();
      // paws
      ctx.fillStyle='#8C8A84'; for(const px of [-s*0.3,s*0.3]){ roundRect(px-s*0.13,s*0.95,s*0.26,s*0.2,s*0.1); ctx.fill(); ctx.stroke(); }
      // tail swishing
      ctx.lineWidth=s*0.09; ctx.lineCap='round'; ctx.strokeStyle=C.ink; ctx.beginPath(); ctx.moveTo(s*0.5,s*0.9); ctx.quadraticCurveTo(s*0.95,s*0.9+Math.sin(t*3)*s*0.2,s*0.85,s*0.4+Math.sin(t*3)*s*0.1); ctx.stroke(); ctx.strokeStyle='#8C8A84'; ctx.lineWidth=s*0.06; ctx.stroke(); ctx.strokeStyle=C.ink; ctx.lineWidth=7; ctx.lineCap='butt';
      // ears
      ctx.fillStyle='#8C8A84'; for(const d of [-1,1]){ ctx.beginPath(); ctx.moveTo(d*s*0.15,-s*0.25); ctx.lineTo(d*s*0.45,-s*0.6); ctx.lineTo(d*s*0.48,-s*0.1); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle='#F7B7C9'; ctx.beginPath(); ctx.moveTo(d*s*0.22,-s*0.25); ctx.lineTo(d*s*0.4,-s*0.48); ctx.lineTo(d*s*0.42,-s*0.18); ctx.closePath(); ctx.fill(); ctx.fillStyle='#8C8A84'; }
      // head
      ctx.beginPath(); ctx.ellipse(0,0,s*0.5,s*0.42,0,0,7); ctx.fill(); ctx.stroke();
      // stripes on the forehead
      ctx.fillStyle=C.ink; for(const d of [-1,0,1]){ roundRect(d*s*0.1-s*0.025,-s*0.42,s*0.05,s*0.18,s*0.02); ctx.fill(); }
      // eyes
      for(const d of [-1,1]){ const ex=d*s*0.2, ey=-s*0.05; if(fire){ ctx.fillStyle='#F0562A'; ctx.beginPath(); ctx.arc(ex,ey,s*0.13,0,7); ctx.fill(); ctx.stroke(); ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(ex,ey,s*0.05,0,7); ctx.fill(); }
        else { ctx.fillStyle='#fff'; ctx.beginPath(); ctx.ellipse(ex,ey,s*0.12,s*0.14,0,0,7); ctx.fill(); ctx.stroke(); ctx.fillStyle='#2E6FE0'; ctx.beginPath(); ctx.ellipse(ex,ey,s*0.08,s*0.11,0,0,7); ctx.fill(); ctx.fillStyle='#151412'; ctx.beginPath(); ctx.ellipse(ex,ey,s*0.03,s*0.1,0,0,7); ctx.fill(); } }
      // nose, mouth, whiskers
      ctx.fillStyle='#F7B7C9'; ctx.beginPath(); ctx.moveTo(-s*0.05,s*0.12); ctx.lineTo(s*0.05,s*0.12); ctx.lineTo(0,s*0.18); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.lineWidth=5; ctx.beginPath(); ctx.moveTo(0,s*0.18); ctx.lineTo(0,s*0.24); ctx.moveTo(-s*0.1,s*0.22); ctx.quadraticCurveTo(-s*0.05,s*0.3,0,s*0.24); ctx.quadraticCurveTo(s*0.05,s*0.3,s*0.1,s*0.22); ctx.stroke();
      ctx.lineWidth=4; ctx.beginPath(); for(const d of [-1,1]) for(let i=-1;i<=1;i++){ ctx.moveTo(d*s*0.15,s*0.15+i*s*0.05); ctx.lineTo(d*s*0.75,s*0.1+i*s*0.14); } ctx.stroke();
      ctx.restore(); };
    A.frame = t=>{
      const rise=Math.min(1,t/1.4); const re=1-Math.pow(1-rise,3); const cy = H+S*0.6 - re*(H+S*0.6 - H*0.55);
      const fire = A.struck && t<A.struckAt+3.4; const ft = A.struck? t-A.struckAt : 0;
      // beam target sweeps left -> right -> left across the top half of the screen
      const sweep = Math.min(1, ft/3.2); const ang = Math.PI + Math.PI*(sweep<0.5? sweep*2 : 2-sweep*2) * 1.0; // from pointing left (PI) to pointing right (2PI) and back
      const ex=[cx-S*0.2, cx+S*0.2], ey=cy-S*0.05;
      // the blue wash: everything the beams have swept (a sector from the eyes, growing with the sweep)
      if(A.struck){ swept=Math.max(swept, sweep<0.5? sweep*2 : 1); ctx.save(); ctx.globalAlpha=0.55; ctx.fillStyle='#2E6FE0'; ctx.beginPath(); ctx.moveTo(cx,ey); ctx.arc(cx,ey,W*1.2,Math.PI,Math.PI+Math.PI*swept,false); ctx.closePath(); ctx.fill(); ctx.restore(); }
      cat(cx, cy, S, t, fire || (A.struck===false && t>1.5));
      if(fire){ const R=W*1.3; const tx=Math.cos(ang)*R, ty=Math.sin(ang)*R;
        for(const x of ex){ ctx.strokeStyle='#F0562A'; ctx.lineWidth=26; ctx.lineCap='round'; ctx.globalAlpha=0.6; ctx.beginPath(); ctx.moveTo(x,ey); ctx.lineTo(x+tx,ey+ty); ctx.stroke(); ctx.globalAlpha=1; ctx.lineWidth=12; ctx.beginPath(); ctx.moveTo(x,ey); ctx.lineTo(x+tx,ey+ty); ctx.stroke(); ctx.strokeStyle='#fff'; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(x,ey); ctx.lineTo(x+tx,ey+ty); ctx.stroke(); }
        // sparks where the beams hit the screen edge
        const hitR = Math.min(Math.abs((ang>Math.PI*1.5? W-cx : cx)/Math.cos(ang)||1e9), Math.abs(ey/Math.sin(ang)||1e9)); const hx=cx+Math.cos(ang)*hitR, hy=ey+Math.sin(ang)*hitR;
        for(let i=0;i<4;i++){ const a=rr(0,6.3), v=rr(3,12); sparks.push({x:hx,y:hy,vx:Math.cos(a)*v,vy:Math.sin(a)*v,a:1,c:i%2?'#FFE34D':'#F0562A'}); } }
      for(const s of sparks){ s.x+=s.vx; s.y+=s.vy; s.vy+=0.3; s.a-=0.025; ctx.globalAlpha=Math.max(0,s.a); ctx.fillStyle=s.c; ctx.fillRect(s.x-5,s.y-5,10,10); } ctx.globalAlpha=1; for(let i=sparks.length-1;i>=0;i--) if(sparks[i].a<=0) sparks.splice(i,1);
      // the state, watching from the corner, turns blue when the beam passes
      const st=STATES[r.st]||STATES.TX; const path=new Path2D(st.d); const sc=Math.min(H*0.22/300,1.0); const sx=W*0.14, sy=H*0.3;
      ctx.save(); ctx.translate(sx,sy); ctx.rotate(A.struck? Math.sin(t*20)*0.05:0); ctx.scale(sc,sc); ctx.translate(-st.c[0],-st.c[1]); ctx.fillStyle= A.struck? '#2E6FE0' : '#FFE34D'; ctx.strokeStyle=C.ink; ctx.lineWidth=4/sc; ctx.fill(path); ctx.stroke(path); ctx.restore();
      ctx.fillStyle=C.ink; ctx.font=`900 ${Math.round(H*0.045)}px Archivo, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(r.st, sx, sy);
      if(!A.struck && t>=1.8){ A.struck=true; A.struckAt=t; hit('PEW PEW!','pew'); } };
    return A;
  }
});
KINDS.push('airhorn','pizza','toaster','yoink','lasercat');
/* anims-extra/part3.js — balloon, bubblewrap, gameshow, snowglobe, donkeydj */
SFX.liftoff = function(){ noise(0, 1.2, 0.35, 600); tone(90, 0, 1.2, 'sawtooth', 0.18, 240); tone(600, 0.2, 0.6, 'sine', 0.12, 1400); cheer(0.5); };
SFX.burner = function(){ noise(0, 0.35, 0.3, 900); tone(70, 0, 0.35, 'sawtooth', 0.12, 110); };
SFX.pop = function(){ tone(900+Math.random()*600, 0, 0.06, 'square', 0.14, 200); noise(0, 0.04, 0.25, 4000); };
SFX.popstorm = function(){ for(let i=0;i<24;i++){ tone(700+Math.random()*900, i*0.045, 0.06, 'square', 0.12, 200); } noise(0, 0.5, 0.3, 3500); cheer(0.4); };
SFX.clack = function(){ tone(1800, 0, 0.03, 'square', 0.12, 900); noise(0, 0.03, 0.2, 5000); };
SFX.siren = function(){ for(let i=0;i<5;i++){ tone(600, i*0.5, 0.25, 'square', 0.12, 1100); tone(1100, i*0.5+0.25, 0.25, 'square', 0.12, 600); } [523,659,784,1047].forEach((f,i)=>tone(f, 0.1+i*0.12, 0.5, 'triangle', 0.2)); cheer(0.4); };
SFX.rattle = function(){ for(let i=0;i<16;i++){ noise(i*0.08, 0.06, 0.35, 2500); tone(200+Math.random()*300, i*0.08, 0.05, 'square', 0.08, 120); } };
SFX.shook = function(){ noise(0, 0.8, 0.7, 1200); tone(120, 0, 0.5, 'sine', 0.4, 40); for(let i=0;i<20;i++) tone(2000+Math.random()*2500, 0.1+i*0.07, 0.25, 'sine', 0.05); cheer(0.3); };
SFX.riser = function(){ tone(110, 0, 2.2, 'sawtooth', 0.14, 880); noise(0, 2.2, 0.08, 3000); for(let i=0;i<12;i++) noise(i*0.18, 0.05, 0.15, 6000); };
SFX.drop = function(){ noise(0, 1.2, 0.9, 500); tone(55, 0, 1.4, 'sine', 0.9, 28); tone(110, 0, 0.6, 'square', 0.2, 55); for(let i=0;i<8;i++) tone(220, 0.2+i*0.23, 0.12, 'square', 0.1, 110); cheer(0.4); };

Object.assign(ANIMS, {
  /* balloon — a striped hot-air balloon lifts the state off the ground and floats it away; birds flap past */
  balloon({W,H,r,hit}){
    const A = {dur:9, struck:false, struckAt:0}; SFX.burner(); setTimeout(()=>SFX.burner(), 700);
    const st = (STATES[r.st]&&STATES[r.st].d)? STATES[r.st] : STATES.TX; const path=new Path2D(st.d); const sc=Math.min(H*0.26/300, 1.3);
    const R = Math.min(H*0.18, W*0.13); const groundY=H*0.9; const cy0 = groundY - R*2.75; const T0=1.4;
    const birds=[...Array(8)].map((_,i)=>({x:W*0.1+i*W*0.14, y:H*(0.1+(i%4)*0.09), v:W/300*(0.8+(i%2)*0.4), s:Math.min(H*0.045,50)*(0.8+(i%3)*0.2), ph:i*1.3}));
    const bird=(x,y,s,t)=>{ const f=Math.sin(t*14)*0.8; ctx.strokeStyle=C.ink; ctx.lineWidth=Math.max(3,s*0.16); ctx.lineCap='round'; ctx.beginPath(); ctx.moveTo(x-s,y-f*s*0.6); ctx.quadraticCurveTo(x-s*0.5,y+s*0.1,x,y); ctx.quadraticCurveTo(x+s*0.5,y+s*0.1,x+s,y-f*s*0.6); ctx.stroke(); ctx.lineCap='butt'; };
    A.frame = t=>{
      // rise: hold on the ground, strain, then lift and drift right
      const u = t<T0? 0 : Math.min(1,(t-T0)/4.5); const e = 1-Math.pow(1-u,2.2);
      const strain = t<T0? Math.sin(t*18)*3 : 0;
      const cx = W*0.3 + e*W*0.38, cy = cy0 - e*(cy0-H*0.06) + strain + (u>=1? Math.sin(t*1.5)*8 : 0); const sway = Math.sin(t*1.2)*0.06*(u>0?1:0.3);
      for(const b of birds){ b.x-=b.v; b.y+=Math.sin(t*2+b.ph)*0.4; if(b.x<-W*0.1) b.x=W*1.15; bird(b.x,b.y,b.s,t+b.ph); }
      ctx.save(); ctx.translate(cx,cy); ctx.rotate(sway);
      // envelope (striped) — clip to its shape
      ctx.beginPath(); ctx.moveTo(0,-R*1.3); ctx.bezierCurveTo(R*1.25,-R*1.3, R*1.25,R*0.6, R*0.28,R*1.5); ctx.lineTo(-R*0.28,R*1.5); ctx.bezierCurveTo(-R*1.25,R*0.6, -R*1.25,-R*1.3, 0,-R*1.3); ctx.closePath();
      ctx.save(); ctx.clip(); const n=9; for(let i=0;i<n;i++){ ctx.fillStyle = i%2? '#FFE34D':'#2E6FE0'; const x0=-R*1.3+i*(R*2.6/n); ctx.fillRect(x0,-R*1.4,R*2.6/n+1,R*3); } ctx.restore();
      ctx.beginPath(); ctx.moveTo(0,-R*1.3); ctx.bezierCurveTo(R*1.25,-R*1.3, R*1.25,R*0.6, R*0.28,R*1.5); ctx.lineTo(-R*0.28,R*1.5); ctx.bezierCurveTo(-R*1.25,R*0.6, -R*1.25,-R*1.3, 0,-R*1.3); ctx.closePath(); ctx.strokeStyle=C.ink; ctx.lineWidth=6; ctx.stroke();
      // big D roundel on the envelope
      ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(0,-R*0.1,R*0.42,0,7); ctx.fill(); ctx.stroke(); ctx.fillStyle='#2E6FE0'; ctx.font=`900 ${Math.round(R*0.6)}px Archivo, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('D',0,-R*0.07);
      // burner flame
      const fl = (t<T0 || (t>T0 && Math.floor(t*3)%2===0))? 1 : 0.4; ctx.fillStyle='#F0562A'; ctx.beginPath(); ctx.moveTo(-R*0.14,R*1.75); ctx.lineTo(R*0.14,R*1.75); ctx.lineTo(0,R*1.5-R*0.35*fl*(0.8+Math.random()*0.4)); ctx.closePath(); ctx.fill(); ctx.fillStyle='#FFE34D'; ctx.beginPath(); ctx.moveTo(-R*0.07,R*1.75); ctx.lineTo(R*0.07,R*1.75); ctx.lineTo(0,R*1.55-R*0.2*fl); ctx.closePath(); ctx.fill();
      // ropes + basket
      ctx.strokeStyle=C.ink; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(-R*0.28,R*1.5); ctx.lineTo(-R*0.3,R*1.95); ctx.moveTo(R*0.28,R*1.5); ctx.lineTo(R*0.3,R*1.95); ctx.stroke();
      ctx.fillStyle='#c98a4b'; roundRect(-R*0.36,R*1.9,R*0.72,R*0.42,R*0.06); ctx.fill(); ctx.stroke(); ctx.strokeStyle='rgba(21,20,18,.45)'; ctx.lineWidth=2; for(let i=1;i<4;i++){ ctx.beginPath(); ctx.moveTo(-R*0.36,R*1.9+i*R*0.105); ctx.lineTo(R*0.36,R*1.9+i*R*0.105); ctx.stroke(); }
      // the state dangling under the basket on two ropes
      ctx.strokeStyle=C.ink; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(-R*0.25,R*2.32); ctx.lineTo(-R*0.2,R*2.7); ctx.moveTo(R*0.25,R*2.32); ctx.lineTo(R*0.2,R*2.7); ctx.stroke();
      ctx.save(); ctx.translate(0,R*2.75+ (u>0? 0 : 0)); ctx.rotate(Math.sin(t*1.7)*0.05*(u>0?1:0)); ctx.scale(sc,sc); ctx.translate(-st.c[0],-st.c[1]); ctx.fillStyle='#F0562A'; ctx.strokeStyle=C.ink; ctx.lineWidth=4/sc; ctx.fill(path); ctx.stroke(path); ctx.restore();
      ctx.fillStyle='#fff'; ctx.font=`900 ${Math.round(H*0.045)}px Archivo, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(r.st, 0, R*2.75); ctx.restore();
      // ground line + a little shadow that shrinks as it rises
      ctx.fillStyle='rgba(21,20,18,.08)'; ctx.fillRect(0,groundY+R*0.12,W,4); ctx.fillStyle='rgba(21,20,18,.18)'; ctx.beginPath(); ctx.ellipse(cx,groundY+R*0.12,R*0.9*(1-e*0.6),R*0.12*(1-e*0.6),0,0,7); ctx.fill();
      if(!A.struck && u>0.08){ A.struck=true; A.struckAt=t; hit('LIFTOFF!','liftoff'); } };
    return A;
  },
  /* bubblewrap — a sheet of bubble wrap covers the screen and pops in a wave from left to right, revealing the state */
  bubblewrap({W,H,r,hit}){
    const A = {dur:8.5, struck:false, struckAt:0}; const st = (STATES[r.st]&&STATES[r.st].d)? STATES[r.st] : STATES.TX; const path=new Path2D(st.d); const sc=Math.min(H*0.55/300, 2.4);
    const d = Math.max(54, Math.min(W,H)/14); const cols=Math.ceil(W/d)+1, rows=Math.ceil(H/d)+1; const bubbles=[];
    for(let j=0;j<rows;j++) for(let i=0;i<cols;i++) bubbles.push({x:i*d+(j%2?d/2:0), y:j*d+d/2, popAt:-1, jit:rr(0,0.25)});
    const T0=0.7, T1=3.6; let lastPopSound=-1; let popped=0;
    A.frame = t=>{
      const front = (t-T0)/(T1-T0)*W*1.15 - W*0.05; let newPops=0;
      const R=d*0.46;
      for(const b of bubbles) if(b.popAt<0 && t>T0 && b.x < front - b.jit*d*2){ b.popAt=t; newPops++; popped++; }
      // pass 1: the flattened, crumpled remains of popped bubbles
      for(const b of bubbles){ if(b.popAt<0) continue; ctx.fillStyle='rgba(127,170,246,.22)'; ctx.beginPath(); ctx.ellipse(b.x,b.y+R*0.15,R*0.85,R*0.5,0,0,7); ctx.fill(); ctx.strokeStyle='rgba(127,170,246,.6)'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(b.x-R*0.5,b.y); ctx.lineTo(b.x-R*0.1,b.y+R*0.2); ctx.lineTo(b.x+R*0.2,b.y-R*0.15); ctx.lineTo(b.x+R*0.55,b.y+R*0.1); ctx.stroke(); }
      // pass 2: the big reveal (sits above the popped sheet, under the intact bubbles)
      ctx.save(); ctx.translate(W/2,H*0.5); ctx.scale(sc,sc); ctx.translate(-st.c[0],-st.c[1]); ctx.fillStyle='#FFE34D'; ctx.strokeStyle=C.ink; ctx.lineWidth=5/sc; ctx.fill(path); ctx.stroke(path); ctx.restore();
      ctx.fillStyle=C.ink; ctx.font=`900 ${Math.round(H*0.12)}px Archivo, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(r.st, W/2, H*0.5);
      // pass 3: intact bubbles + fresh pop rings
      for(const b of bubbles){
        if(b.popAt<0){
          ctx.fillStyle='rgba(127,170,246,.8)'; ctx.beginPath(); ctx.arc(b.x,b.y,R,0,7); ctx.fill(); ctx.strokeStyle=C.ink; ctx.lineWidth=2.5; ctx.stroke();
          ctx.fillStyle='rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(b.x-R*0.35,b.y-R*0.35,R*0.2,0,7); ctx.fill();
        } else { const age=t-b.popAt;
          if(age<0.35){ const k=age/0.35; ctx.strokeStyle=C.ink; ctx.globalAlpha=1-k; ctx.lineWidth=4*(1-k)+1; ctx.beginPath(); ctx.arc(b.x,b.y,R*(0.6+k*1.1),0,7); ctx.stroke(); ctx.globalAlpha=1;
            if(age<0.18){ ctx.fillStyle=C.ink; ctx.font=`900 ${Math.round(R*0.7)}px Archivo, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('pop', b.x, b.y-R*0.9-k*R); } }
        }
      }
      if(newPops>0 && t-lastPopSound>0.045){ lastPopSound=t; SFX.pop(); }
      if(!A.struck && front>W*0.5){ A.struck=true; A.struckAt=t; hit('POP POP POP!','popstorm'); } };
    return A;
  },
  /* gameshow — a giant prize wheel spins, clacks down and lands on the state; sirens + a WINNER sash */
  gameshow({W,H,r,hit,shake}){
    const A = {dur:9.5, struck:false, struckAt:0}; const N=16; const codes=Object.keys(STATES).filter(k=>k!==r.st && STATES[k].d); const labels=[r.st];
    for(let i=1;i<N;i++) labels.push(i%3===1? 'D' : codes.splice(Math.floor(Math.random()*codes.length),1)[0]||'D');
    const cols=['#2E6FE0','#FFE34D','#F0562A','#BBD0F5']; const w=Math.PI*2/N; const R=Math.min(H*0.4, W*0.28); const cx=W/2, cy=H*0.56; const T=3.4;
    const thetaFinal = -Math.PI/2 - w/2 - Math.PI*2*7; let lastWedge=-1, lastClackT=0;
    const wedgeCol=i=> labels[i]===r.st? '#2E6FE0' : cols[(i%4===0)? 3 : i%4]; const textCol=i=>{ const c=wedgeCol(i); return (c==='#FFE34D'||c==='#BBD0F5')? '#151412' : '#fff'; };
    const wedgeAt=(theta)=>{ const a=((-Math.PI/2 - theta)%(Math.PI*2)+Math.PI*2)%(Math.PI*2); return Math.floor(a/w); };
    // the wheel (wedges, labels, rim, hub) is static → one sprite, baked at its final resting angle so the 6 s it sits still are drawn unresampled; lights stay live
    const wheelSp=SPR.shape(-R-5,-R-5,R+5,R+5,g=>{ g.rotate(thetaFinal);
      for(let i=0;i<N;i++){ g.fillStyle = wedgeCol(i); g.beginPath(); g.moveTo(0,0); g.arc(0,0,R,i*w,(i+1)*w); g.closePath(); g.fill(); g.strokeStyle=C.ink; g.lineWidth=3; g.stroke(); }
      for(let i=0;i<N;i++){ g.save(); g.rotate(i*w+w/2); const isWin=labels[i]===r.st; g.fillStyle = textCol(i); g.font=`900 ${Math.round(R*(isWin?0.17:0.13))}px Archivo, sans-serif`; g.textAlign='right'; g.textBaseline='middle'; g.fillText(labels[i], R*0.92, 0); g.restore(); }
      g.strokeStyle=C.ink; g.lineWidth=8; g.beginPath(); g.arc(0,0,R,0,7); g.stroke();
      g.fillStyle='#fff'; g.beginPath(); g.arc(0,0,R*0.14,0,7); g.fill(); g.lineWidth=5; g.stroke(); g.fillStyle=C.ink; g.beginPath(); g.arc(0,0,R*0.05,0,7); g.fill(); },N*5+4);
    A.frame = t=>{
      const u=Math.min(1,t/T); const theta = thetaFinal*(1-Math.pow(1-u,3)); const wi=wedgeAt(theta);
      if(wi!==lastWedge){ if(lastWedge>=0){ lastClackT=t; SFX.clack(); } lastWedge=wi; }
      // stand
      ctx.fillStyle=C.ink; ctx.beginPath(); ctx.moveTo(cx-R*0.35,H); ctx.lineTo(cx+R*0.35,H); ctx.lineTo(cx+R*0.1,cy); ctx.lineTo(cx-R*0.1,cy); ctx.closePath(); ctx.fill();
      // wheel
      ctx.save(); ctx.translate(cx,cy); ctx.rotate(theta-thetaFinal); wheelSp.draw(0,0); ctx.rotate(thetaFinal);
      // rim lights
      for(let i=0;i<N*2;i++){ const a=i*Math.PI/N; const on = A.struck? (Math.floor(t*12)+i)%2===0 : (Math.floor(t*6)+i)%3===0; ctx.fillStyle= on? '#FFE34D' : '#fff'; ctx.beginPath(); ctx.arc(Math.cos(a)*R*0.97, Math.sin(a)*R*0.97, R*0.025,0,7); ctx.fill(); }
      ctx.restore();
      // pointer / ticker (flicks on each clack)
      const flick = Math.max(0,1-(t-lastClackT)/0.12) * (u<1? 0.5 : 0); ctx.save(); ctx.translate(cx,cy-R-R*0.02); ctx.rotate(-flick); ctx.fillStyle='#F0562A'; ctx.strokeStyle=C.ink; ctx.lineWidth=5; ctx.beginPath(); ctx.moveTo(-R*0.1,-R*0.16); ctx.lineTo(R*0.1,-R*0.16); ctx.lineTo(0,R*0.16); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
      if(!A.struck && u>=1){ A.struck=true; A.struckAt=t; hit('WINNER!','siren'); }
      if(A.struck){ const k=t-A.struckAt;
        // sirens: two rotating red/blue beacons at the top corners
        for(const [sx,c1,c2] of [[W*0.1,'#F0562A','#2E6FE0'],[W*0.9,'#2E6FE0','#F0562A']]){ const sy=H*0.12, sr=Math.min(H*0.06,60); ctx.globalAlpha=0.22; for(let b=0;b<2;b++){ const a=t*9+b*Math.PI; ctx.fillStyle= b? c2:c1; ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(sx+Math.cos(a)*W*0.55, sy+Math.sin(a)*W*0.55); ctx.lineTo(sx+Math.cos(a+0.3)*W*0.55, sy+Math.sin(a+0.3)*W*0.55); ctx.closePath(); ctx.fill(); } ctx.globalAlpha=1;
          ctx.fillStyle=C.ink; ctx.fillRect(sx-sr*1.2,sy+sr*0.5,sr*2.4,sr*0.5); ctx.fillStyle= Math.floor(t*10)%2? c1:c2; ctx.beginPath(); ctx.arc(sx,sy+sr*0.5,sr,Math.PI,0); ctx.fill(); ctx.strokeStyle=C.ink; ctx.lineWidth=4; ctx.stroke(); }
        // the WINNER sash unfurls across the wheel
        const un=Math.min(1,k/0.5); ctx.save(); ctx.translate(cx,cy); ctx.rotate(-0.45); ctx.translate(-R*1.3,0); ctx.scale(un,1); ctx.fillStyle='#F0562A'; ctx.strokeStyle=C.ink; ctx.lineWidth=5; const sw=R*2.6, sh=R*0.42; ctx.beginPath(); ctx.moveTo(0,-sh/2); ctx.lineTo(sw,-sh/2); ctx.lineTo(sw-sh*0.3,0); ctx.lineTo(sw,sh/2); ctx.lineTo(0,sh/2); ctx.lineTo(sh*0.3,0); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle='#fff'; ctx.font=`900 ${Math.round(sh*0.72)}px Archivo, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('WINNER', sw/2, 2); ctx.restore();
        if(Math.floor(k*2)!==Math.floor((k-1/60)*2) && k<3) shake(); } };
    return A;
  },
  /* snowglobe — a hand grabs the globe and shakes it hard, then hundreds of flakes settle over the state */
  snowglobe({W,H,r,hit,shake}){
    const A = {dur:9, struck:false, struckAt:0}; const st = (STATES[r.st]&&STATES[r.st].d)? STATES[r.st] : STATES.TX; const path=new Path2D(st.d);
    const R=Math.min(H*0.34, W*0.26); const cx=W/2, cy=H*0.42; const baseY=cy+R*0.78; const sc=Math.min(R*1.1/300, 1.6); const flakes=[]; const cols=['#fff','#FFE34D','#2E6FE0','#BBD0F5','#7FAAF6'];
    for(let i=0;i<380;i++){ const a=Math.random()*Math.PI*2, d=Math.sqrt(Math.random())*R*0.95; flakes.push({x:Math.cos(a)*d, y:Math.sin(a)*d, vx:0, vy:0, w:rr(9,20), h:rr(5,11), c:cols[i%5], a:rr(0,6), settle: baseY-cy-rr(0,R*0.18)-Math.abs(Math.cos(a)*d)/R*R*0.1, done:false}); }
    const T0=0.9, T1=2.4; let lastShake=0; SFX.rattle(); setTimeout(()=>SFX.rattle(), 1300);
    A.frame = t=>{
      const shaking = t>=T0 && t<T1; const jx = shaking? rr(-R*0.12,R*0.12) : 0, jy = shaking? rr(-R*0.08,R*0.08) : 0;
      if(shaking && t-lastShake>0.14){ lastShake=t; shake(); }
      const handY = t<0.6? H+R*0.3 - (t/0.6)*(H+R*0.3-baseY) : baseY; // hand rises from the bottom then grips the base
      ctx.save(); ctx.translate(cx+jx, cy+jy);
      // base
      ctx.fillStyle='#c98a4b'; ctx.strokeStyle=C.ink; ctx.lineWidth=6; roundRect(-R*0.75, baseY-cy, R*1.5, R*0.34, R*0.08); ctx.fill(); ctx.stroke(); ctx.fillStyle=C.ink; ctx.font=`900 ${Math.round(R*0.16)}px Archivo, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(r.label||r.st, 0, baseY-cy+R*0.17);
      // globe interior: glass tint, the state, the flakes (clipped to the dome)
      ctx.save(); ctx.beginPath(); ctx.arc(0,0,R,0,7); ctx.clip();
      ctx.fillStyle='rgba(127,170,246,.22)'; ctx.fillRect(-R,-R,R*2,R*2); ctx.fillStyle='rgba(255,255,255,.35)'; ctx.fillRect(-R,baseY-cy-R*0.08,R*2,R);
      ctx.save(); ctx.translate(0,R*0.12); ctx.rotate(shaking? rr(-0.06,0.06):0); ctx.scale(sc,sc); ctx.translate(-st.c[0],-st.c[1]); ctx.fillStyle='#2E6FE0'; ctx.strokeStyle=C.ink; ctx.lineWidth=4/sc; ctx.fill(path); ctx.stroke(path); ctx.restore();
      ctx.fillStyle='#fff'; ctx.font=`900 ${Math.round(R*0.22)}px Archivo, sans-serif`; ctx.fillText(r.st, 0, R*0.12);
      for(const f of flakes){
        if(shaking){ f.vx+=rr(-R*0.05,R*0.05); f.vy+=rr(-R*0.06,R*0.04); const sp=Math.hypot(f.vx,f.vy), mx=R*0.14; if(sp>mx){ f.vx*=mx/sp; f.vy*=mx/sp; } f.x+=f.vx; f.y+=f.vy; const d=Math.hypot(f.x,f.y); if(d>R*0.95){ f.x*=R*0.95/d; f.y*=R*0.95/d; f.vx*=-0.6; f.vy*=-0.6; } f.a+=0.5; f.done=false; }
        else if(t>=T1 && !f.done){ f.vx = Math.sin(t*2+f.a)*0.8; f.vy = Math.min(Math.abs(f.vy)*0.9+0.08, rr(1.4,2.6)); f.x+=f.vx; f.y+=f.vy; f.a+=0.04; if(f.y>=f.settle){ f.y=f.settle; f.done=true; } }
        else if(t<T0){ f.y = Math.max(f.y, f.settle); }
        const cs=Math.cos(f.a)*f.w/2, sn=Math.sin(f.a)*f.w/2; ctx.fillStyle=f.c; ctx.beginPath(); ctx.moveTo(f.x-cs,f.y-sn); ctx.lineTo(f.x+cs,f.y+sn); ctx.lineTo(f.x+cs-sn*f.h/f.w, f.y+sn+cs*f.h/f.w); ctx.lineTo(f.x-cs-sn*f.h/f.w, f.y-sn+cs*f.h/f.w); ctx.closePath(); ctx.fill(); }
      ctx.restore();
      // glass dome outline + highlight
      ctx.strokeStyle=C.ink; ctx.lineWidth=7; ctx.beginPath(); ctx.arc(0,0,R,0,7); ctx.stroke(); ctx.strokeStyle='rgba(255,255,255,.75)'; ctx.lineWidth=R*0.05; ctx.beginPath(); ctx.arc(0,0,R*0.84,-2.4,-1.5); ctx.stroke();
      ctx.restore();
      // the hand (skin + outline) gripping the base
      ctx.save(); ctx.translate(cx+jx*0.9, handY+jy*0.9); ctx.fillStyle='#f1c9a5'; ctx.strokeStyle=C.ink; ctx.lineWidth=5;
      roundRect(-R*0.5, R*0.1, R*1.0, R*0.9, R*0.18); ctx.fill(); ctx.stroke();
      for(let i=0;i<4;i++){ roundRect(-R*0.62+i*R*0.31, -R*0.02, R*0.27, R*0.4, R*0.12); ctx.fill(); ctx.stroke(); }
      roundRect(R*0.42, R*0.05, R*0.26, R*0.5, R*0.12); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#2E6FE0'; roundRect(-R*0.55, R*0.95, R*1.1, R*0.5, R*0.08); ctx.fill(); ctx.stroke(); ctx.restore();
      if(!A.struck && t>=T1){ A.struck=true; A.struckAt=t; hit('SHOOK!','shook'); } };
    return A;
  },
  /* donkeydj — a blue donkey in headphones behind the decks; the bass bar bounces, then the drop hits with blue strobes */
  donkeydj({W,H,r,hit}){
    const A = {dur:9, struck:false, struckAt:0}; SFX.riser(); setTimeout(()=>SFX.beat(16), 2250); const S=Math.min(H*0.16,185); const DROP=2.3; const BPM=0.46;
    const dx=W*0.5-S*0.7, dy=H*0.55; const tw=Math.min(W*0.6, S*7), th=S*1.0, tx=W/2-tw/2, ty=H*0.6; const strobes=[];
    // body and the nodding head (neck, ears, headphones, shades) are two static sprites; the head sprite's origin is its nod pivot (0.8s,-0.4s). Legs + tail live.
    const bodySp=SPR.shape(-S*0.95,-S*0.5,S*0.95,S*0.5,g=>{ g.fillStyle='#2E6FE0'; g.strokeStyle=C.ink; g.lineWidth=4; SPR.rr(g,-S*0.9,-S*0.45,S*1.8,S*0.9,S*0.3); g.fill(); g.stroke(); },2);
    const headSp=SPR.shape(-S*0.1,-S*1.3,S*1.4,S*0.3,g=>{ const s=S; g.translate(-s*0.8,s*0.4); g.fillStyle='#2E6FE0'; g.strokeStyle=C.ink; g.lineWidth=4;
      g.beginPath(); g.moveTo(s*0.8,-s*0.4); g.lineTo(s*1.25,-s*0.95); g.lineTo(s*1.5,-s*0.8); g.lineTo(s*1.05,-s*0.2); g.closePath(); g.fill(); g.stroke();
      SPR.rr(g,s*1.15,-s*1.15,s*0.75,s*0.5,s*0.15); g.fill(); g.stroke();
      g.fillStyle='#FFE34D'; for(const ex of [s*1.2,s*1.45]){ g.beginPath(); g.moveTo(ex,-s*1.1); g.lineTo(ex+s*0.1,-s*1.55); g.lineTo(ex+s*0.22,-s*1.1); g.closePath(); g.fill(); g.stroke(); }
      // headphones: band over the head, cups on either side
      g.strokeStyle=C.ink; g.lineWidth=s*0.07; g.beginPath(); g.arc(s*1.52,-s*0.98,s*0.5,Math.PI*1.02,Math.PI*1.98); g.stroke(); g.fillStyle='#F0562A'; g.lineWidth=4; SPR.rr(g,s*0.95,-s*1.15,s*0.2,s*0.36,s*0.07); g.fill(); g.stroke(); SPR.rr(g,s*1.88,-s*1.15,s*0.2,s*0.36,s*0.07); g.fill(); g.stroke();
      // sunglasses
      g.fillStyle=C.ink; SPR.rr(g,s*1.5,-s*1.08,s*0.34,s*0.18,s*0.05); g.fill(); g.fillStyle='#7FAAF6'; g.fillRect(s*1.54,-s*1.05,s*0.26,s*0.08); },15);
    const donkey=(x,y,s,t,nod)=>{ ctx.save(); ctx.translate(x,y); const bob=Math.sin(t*14)*s*0.08; ctx.translate(0,bob); bodySp.draw(0,0); ctx.fillStyle='#2E6FE0'; ctx.strokeStyle=C.ink; ctx.lineWidth=4; SPR.donkeyLegs(s,t*14);
      headSp.drawRot(s*0.8,-s*0.4,nod);
      ctx.strokeStyle=C.ink; ctx.lineWidth=6; ctx.beginPath(); ctx.moveTo(-s*0.9,-s*0.3); ctx.quadraticCurveTo(-s*1.5,-s*0.6+Math.sin(t*10)*s*0.3,-s*1.3,s*0.1); ctx.stroke(); ctx.restore(); };
    A.frame = t=>{
      const beat = t<DROP? 0 : ((t-DROP)/BPM)%1; const bump = t<DROP? Math.min(1,t/DROP)*0.25*(0.5+0.5*Math.sin(t*20)) : Math.exp(-beat*5);
      // strobes on the drop
      if(A.struck){ const k=t-A.struckAt; if(k<1.4 || beat<0.1){ for(let i=0;i<2;i++) strobes.push({x:rr(-W*0.1,W*0.9), y:rr(-H*0.1,H*0.9), w:rr(W*0.12,W*0.45), h:rr(H*0.1,H*0.45), a:0.6}); } }
      for(const s of strobes){ s.a-=0.1; if(s.a<=0) continue; ctx.globalAlpha=s.a; ctx.fillStyle= Math.floor(t*30)%2? '#2E6FE0':'#7FAAF6'; ctx.fillRect(s.x,s.y,s.w,s.h); } ctx.globalAlpha=1; while(strobes.length && strobes[0].a<=0) strobes.shift(); if(strobes.length>120) strobes.splice(0,strobes.length-120);
      // equaliser bars behind the stage
      const nb=18, bw=W/nb; for(let i=0;i<nb;i++){ const hgt = H*0.12 + (A.struck? bump : 0.3)*H*0.3*Math.abs(Math.sin(t*7+i*0.9)) + Math.abs(Math.sin(t*3+i))*H*0.06; ctx.fillStyle = i%2? 'rgba(127,170,246,.45)':'rgba(46,111,224,.45)'; ctx.fillRect(i*bw+4, ty-hgt, bw-8, hgt); }
      // the donkey behind the decks (nods to the beat)
      donkey(dx, dy - bump*S*0.18, S, t, Math.sin(t*(A.struck?13.6:4))*0.12);
      // DJ table + two turntables + mixer
      ctx.fillStyle='#2a2926'; roundRect(tx,ty,tw,th,S*0.12); ctx.fill(); ctx.strokeStyle=C.ink; ctx.lineWidth=5; ctx.stroke(); ctx.fillStyle='#F0562A'; ctx.fillRect(tx+S*0.2, ty+th*0.78, tw-S*0.4, th*0.08);
      for(const px of [tx+tw*0.22, tx+tw*0.78]){ const pr=th*0.38; ctx.fillStyle='#8C8A84'; ctx.beginPath(); ctx.arc(px,ty+th*0.42,pr*1.08,0,7); ctx.fill(); ctx.strokeStyle='#fff'; ctx.lineWidth=3; ctx.stroke(); ctx.save(); ctx.translate(px,ty+th*0.42); ctx.rotate(t*5); ctx.fillStyle='#FFE34D'; ctx.beginPath(); ctx.arc(0,0,pr*0.55,0,7); ctx.fill(); ctx.strokeStyle=C.ink; ctx.lineWidth=2; ctx.stroke(); ctx.fillStyle=C.ink; ctx.font=`900 ${Math.round(pr*0.6)}px Archivo, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('D',0,1); ctx.restore(); ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(px,ty+th*0.42,pr*0.08,0,7); ctx.fill(); }
      for(let i=0;i<4;i++){ ctx.fillStyle='#fff'; ctx.fillRect(tx+tw*0.42+i*tw*0.045, ty+th*0.2, tw*0.012, th*0.42); ctx.fillStyle='#F0562A'; const kn = ty+th*0.25+ (0.5+0.5*Math.sin(t*4+i))*th*0.3; ctx.fillRect(tx+tw*0.42+i*tw*0.045-tw*0.01, kn, tw*0.032, th*0.07); }
      ctx.fillStyle='#fff'; ctx.font=`900 ${Math.round(S*0.32)}px Archivo, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('DJ '+r.st, tx+tw/2, ty+th*0.88);
      // the giant bass bar at the bottom
      const bh = H*0.07 + bump*H*0.2; ctx.fillStyle='#2E6FE0'; ctx.fillRect(0,H-bh,W,bh); ctx.strokeStyle=C.ink; ctx.lineWidth=5; ctx.strokeRect(-5,H-bh,W+10,bh+10); ctx.fillStyle='#fff'; ctx.font=`900 ${Math.round(Math.max(28,bh*0.55))}px Archivo, sans-serif`; ctx.fillText(A.struck? 'BASS' : 'BUILD UP…', W/2, H-bh/2);
      if(!A.struck && t>=DROP){ A.struck=true; A.struckAt=t; hit('DROP!','drop'); } };
    return A;
  }
});
KINDS.push('balloon','bubblewrap','gameshow','snowglobe','donkeydj');
/* anims-extra/part4.js — catapult, submarine, treadmill, dvdball, drivethru */
SFX.wind = function(){ for(let i=0;i<14;i++){ tone(160+i*12, i*0.11, 0.08, 'square', 0.07, 120+i*12); noise(i*0.11, 0.05, 0.08, 1500); } };
SFX.moo = function(){ tone(260, 0, 0.45, 'sawtooth', 0.22, 190); tone(190, 0.4, 0.7, 'sawtooth', 0.22, 150); tone(382, 0.05, 0.5, 'triangle', 0.08, 300); cheer(0.5); };
SFX.thud = function(){ noise(0, 0.3, 0.8, 350); tone(60, 0, 0.35, 'sine', 0.6, 28); };
SFX.bubbles = function(){ for(let i=0;i<16;i++) tone(400+Math.random()*500, i*0.12+Math.random()*0.06, 0.1, 'sine', 0.06, 900+Math.random()*600); };
SFX.ping = function(){ tone(1900, 0, 0.9, 'sine', 0.28, 1500); tone(1900, 0.7, 0.9, 'sine', 0.12, 1500); tone(1900, 1.4, 0.9, 'sine', 0.05, 1500); for(let i=0;i<3;i++) tone(220, 0.2+i*0.3, 0.2, 'square', 0.14, 170); cheer(0.4); };
SFX.torpedo = function(){ noise(0, 0.9, 0.3, 2500); tone(90, 0, 0.9, 'sawtooth', 0.12, 240); };
SFX.whir = function(){ noise(0, 2.8, 0.1, 900); tone(80, 0, 2.8, 'triangle', 0.1, 260); for(let i=0;i<6;i++) tone(880, i*0.42, 0.05, 'square', 0.05); };
SFX.cardio = function(){ noise(0, 0.5, 0.6, 2000); tone(300, 0, 0.6, 'sine', 0.3, 1300); tone(520, 0.1, 0.4, 'sawtooth', 0.18, 900); tone(700, 0.55, 0.5, 'sawtooth', 0.2, 300); cheer(0.4); };
SFX.boing = function(f){ tone(f||300, 0, 0.18, 'square', 0.14, (f||300)*1.6); };
SFX.crowd = function(){ noise(0, 2.6, 0.4, 1100); tone(55, 0, 1.2, 'sine', 0.6, 30); cheer(0); cheer(0.5); };
SFX.static = function(){ noise(0, 0.35, 0.12, 3500); tone(700, 0.05, 0.12, 'square', 0.06, 1100); tone(500, 0.2, 0.1, 'square', 0.06, 1300); };
SFX.bell = function(){ for(const [f,t] of [[1760,0],[1318,0.22],[1760,0.44]]){ tone(f, t, 1.4, 'sine', 0.3); tone(f*2.01, t, 0.7, 'sine', 0.08); } cheer(0.5); };

Object.assign(ANIMS, {
  /* a medieval catapult flings a blue cow across the screen */
  catapult({W,H,r,hit,shake}){
    const A = {dur:9, struck:false, struckAt:0}; SFX.wind();
    const S=Math.min(H*0.46,500), bx=W*0.3, gy=H*0.86, cs=Math.min(H*0.11,120), L=S*0.75, landX=W*0.74;
    const piv={x:bx, y:gy-S*0.42}; const aRest=-1.0, aWound=Math.PI-0.45, aLaunch=-1.25;
    const launchT=1.85, Tf=2.0, g=H*0.6; const dust=[]; let p0=null, vx=0, vy=0, land=null, thudded=false;
    // the cow is one static shape (only the pupils roll with the spin) → one sprite at size cs, drawn under the rotate/squash transform; pupils live on top
    const cowSp=SPR.shape(-cs*1.4,-cs*1.15,cs*1.4,cs*0.9,g=>{ const s=cs; g.strokeStyle=C.ink; g.lineWidth=4; g.fillStyle='#2E6FE0';
      for(const lx of [-s*0.6,-s*0.25,s*0.2,s*0.55]){ g.fillStyle='#2E6FE0'; SPR.rr(g,lx-s*0.1,s*0.3,s*0.2,s*0.5,s*0.06); g.fill(); g.stroke(); g.fillStyle=C.ink; g.fillRect(lx-s*0.1,s*0.68,s*0.2,s*0.12); }
      g.lineWidth=5; g.beginPath(); g.moveTo(-s*0.9,-s*0.2); g.quadraticCurveTo(-s*1.3,-s*0.1,-s*1.2,s*0.35); g.stroke(); g.fillStyle=C.ink; g.beginPath(); g.arc(-s*1.2,s*0.35,s*0.09,0,7); g.fill();
      g.fillStyle='#2E6FE0'; g.lineWidth=4; g.beginPath(); g.ellipse(0,0,s*0.95,s*0.5,0,0,7); g.fill(); g.stroke();
      g.fillStyle='#153E8F'; for(const [sx,sy,sr] of [[-0.45,-0.1,0.2],[0.1,0.15,0.17],[0.45,-0.2,0.14],[-0.1,-0.3,0.11]]){ g.beginPath(); g.ellipse(sx*s,sy*s,sr*s,sr*s*0.75,0.4,0,7); g.fill(); }
      g.fillStyle='#F5B8C8'; g.beginPath(); g.ellipse(-s*0.1,s*0.42,s*0.22,s*0.14,0,0,7); g.fill(); g.stroke();
      g.fillStyle='#2E6FE0'; g.beginPath(); g.ellipse(s*0.62,-s*0.72,s*0.18,s*0.08,-0.5,0,7); g.fill(); g.stroke();
      g.fillStyle='#FFE34D'; for(const hx of [s*0.72,s*1.08]){ g.beginPath(); g.moveTo(hx,-s*0.74); g.quadraticCurveTo(hx+s*0.02,-s*1.05,hx+s*0.2,-s*1.02); g.lineTo(hx+s*0.22,-s*0.74); g.closePath(); g.fill(); g.stroke(); }
      g.fillStyle='#2E6FE0'; SPR.rr(g,s*0.65,-s*0.78,s*0.62,s*0.68,s*0.18); g.fill(); g.stroke();
      g.fillStyle='#F5B8C8'; SPR.rr(g,s*0.78,-s*0.42,s*0.52,s*0.32,s*0.12); g.fill(); g.stroke(); g.fillStyle=C.ink; g.beginPath(); g.arc(s*0.93,-s*0.26,s*0.04,0,7); g.arc(s*1.13,-s*0.26,s*0.04,0,7); g.fill();
      g.fillStyle='#fff'; g.beginPath(); g.arc(s*0.86,-s*0.58,s*0.13,0,7); g.fill(); g.beginPath(); g.arc(s*1.12,-s*0.58,s*0.13,0,7); g.fill(); g.lineWidth=2; g.beginPath(); g.arc(s*0.86,-s*0.58,s*0.13,0,7); g.stroke(); g.beginPath(); g.arc(s*1.12,-s*0.58,s*0.13,0,7); g.stroke(); },34);
    const cow=(x,y,s,rot,squash)=>{ ctx.save(); ctx.translate(x,y); ctx.rotate(rot); ctx.scale(1+(squash||0)*0.3, 1-(squash||0)*0.35); cowSp.draw(0,0);
      const px=Math.cos(rot*2.5)*s*0.05, py=Math.sin(rot*2.5)*s*0.05; ctx.fillStyle='#151412'; ctx.beginPath(); ctx.arc(s*0.86+px,-s*0.58+py,s*0.06,0,7); ctx.fill(); ctx.beginPath(); ctx.arc(s*1.12-px,-s*0.58-py,s*0.06,0,7); ctx.fill();
      ctx.restore(); };
    const wheel=(x,y,rad,rot)=>{ ctx.save(); ctx.translate(x,y); ctx.rotate(rot); ctx.fillStyle='#8a4b22'; ctx.strokeStyle=C.ink; ctx.lineWidth=5; ctx.beginPath(); ctx.arc(0,0,rad,0,7); ctx.fill(); ctx.stroke(); ctx.strokeStyle='#FFE34D'; ctx.lineWidth=rad*0.12; ctx.beginPath(); for(let i=0;i<3;i++){ const a=i*Math.PI/3; ctx.moveTo(-Math.cos(a)*rad*0.85,-Math.sin(a)*rad*0.85); ctx.lineTo(Math.cos(a)*rad*0.85,Math.sin(a)*rad*0.85); } ctx.stroke(); ctx.fillStyle=C.ink; ctx.beginPath(); ctx.arc(0,0,rad*0.18,0,7); ctx.fill(); ctx.restore(); };
    A.frame = t=>{
      // arm angle: wind back, hold, snap forward, wobble
      let a; if(t<1.4){ const u=t/1.4; a = aRest + (aWound-aRest)*(1-Math.pow(1-u,2)) + Math.sin(t*40)*0.01; }
      else if(t<launchT) a = aWound + Math.sin(t*50)*0.012;
      else if(t<launchT+0.13) a = aWound + (aLaunch-aWound)*Math.pow((t-launchT)/0.13,0.6);
      else a = aLaunch + Math.sin((t-launchT-0.13)*18)*0.15*Math.exp(-(t-launchT-0.13)*3);
      const ex=piv.x+Math.cos(a)*L, ey=piv.y+Math.sin(a)*L;
      // launch event
      if(!A.struck && t>=launchT+0.1){ A.struck=true; A.struckAt=t; p0={x:ex,y:ey-cs*0.5}; const lx=landX, ly=gy-cs*0.8; vx=(lx-p0.x)/Tf; vy=(ly-p0.y-0.5*g*Tf*Tf)/Tf; hit('LAUNCHED!','moo'); }
      // ground line + dust
      ctx.fillStyle='rgba(21,20,18,.08)'; ctx.fillRect(0,gy+cs*0.2,W,H*0.012);
      for(const d of dust){ d.x+=d.vx; d.y+=d.vy; d.vy+=0.1; d.a-=0.02; d.r+=0.6; ctx.globalAlpha=Math.max(0,d.a)*0.55; ctx.fillStyle='#9A978F'; ctx.beginPath(); ctx.arc(d.x,d.y,d.r,0,7); ctx.fill(); } ctx.globalAlpha=1; for(let i=dust.length-1;i>=0;i--) if(dust[i].a<=0) dust.splice(i,1);
      // catapult base: platform, wheels, A-frame, crossbar
      ctx.fillStyle='#8a4b22'; ctx.strokeStyle=C.ink; ctx.lineWidth=5; roundRect(bx-S*0.5,gy-S*0.12,S*1.0,S*0.12,S*0.03); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bx-S*0.32,gy-S*0.1); ctx.lineTo(piv.x,piv.y); ctx.lineTo(bx+S*0.32,gy-S*0.1); ctx.lineTo(bx+S*0.22,gy-S*0.1); ctx.lineTo(piv.x,piv.y+S*0.1); ctx.lineTo(bx-S*0.22,gy-S*0.1); ctx.closePath(); ctx.fill(); ctx.stroke();
      roundRect(bx+S*0.05,piv.y-S*0.05,S*0.42,S*0.09,S*0.02); ctx.fill(); ctx.stroke(); // stop bar
      wheel(bx-S*0.38,gy,S*0.14,0); wheel(bx+S*0.38,gy,S*0.14,0.5);
      // winch rope while wound
      if(t<launchT+0.1){ ctx.strokeStyle='#c98a4b'; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(ex,ey); ctx.lineTo(bx-S*0.42,gy-S*0.14); ctx.stroke(); }
      // arm + cup
      ctx.save(); ctx.translate(piv.x,piv.y); ctx.rotate(a); ctx.fillStyle='#c98a4b'; ctx.strokeStyle=C.ink; ctx.lineWidth=5; roundRect(-S*0.22,-S*0.045,L+S*0.22,S*0.09,S*0.03); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#8C8A84'; ctx.beginPath(); ctx.arc(-S*0.22,0,S*0.09,0,7); ctx.fill(); ctx.stroke(); // counterweight
      ctx.fillStyle='#8a4b22'; ctx.beginPath(); ctx.arc(L,0,S*0.14,Math.PI*0.1,Math.PI*0.9,true); ctx.closePath(); ctx.fill(); ctx.stroke(); // cup
      ctx.restore();
      ctx.fillStyle=C.ink; ctx.beginPath(); ctx.arc(piv.x,piv.y,S*0.035,0,7); ctx.fill();
      // the cow
      if(!A.struck){ cow(ex, ey-cs*0.5, cs, a+Math.PI/2+0.4, 0); }
      else { const f=t-A.struckAt; if(f<Tf){ const x=p0.x+vx*f, y=p0.y+vy*f+0.5*g*f*f; cow(x,y,cs,f*7,0); if(f<0.25) for(let i=0;i<2;i++) dust.push({x:p0.x+rr(-20,20),y:p0.y+rr(-10,30),vx:rr(-3,1),vy:rr(-2,0),r:rr(8,18),a:1}); }
        else { if(!thudded){ thudded=true; SFX.thud(); shake(); for(let i=0;i<30;i++) dust.push({x:landX+rr(-cs,cs),y:gy,vx:rr(-9,9),vy:rr(-7,-1),r:rr(8,22),a:1}); }
          const k=f-Tf; const sq=Math.max(0,Math.exp(-k*5)*Math.cos(k*14)); cow(landX, gy-cs*0.8+sq*cs*0.2, cs, 0, sq);
          // dizzy stars
          ctx.fillStyle='#FFE34D'; ctx.strokeStyle=C.ink; ctx.lineWidth=2; for(let i=0;i<3;i++){ const ang=k*4+i*2.1; const sx=landX+cs*1.0+Math.cos(ang)*cs*0.5, sy=gy-cs*1.75+Math.sin(ang)*cs*0.18; ctx.beginPath(); for(let j=0;j<10;j++){ const rad=j%2?cs*0.06:cs*0.14; ctx.lineTo(sx+Math.cos(j*Math.PI/5-Math.PI/2)*rad, sy+Math.sin(j*Math.PI/5-Math.PI/2)*rad); } ctx.closePath(); ctx.fill(); ctx.stroke(); } } }
      // the state watches from the far right (where the cow lands next to it)
      const st=STATES[r.st]||STATES.TX; const path=new Path2D(st.d); const sc=Math.min(H*0.2/300,0.95); ctx.save(); ctx.translate(W*0.92,gy-cs*0.9+(thudded?Math.sin((t-A.struckAt-Tf)*20)*8*Math.exp(-(t-A.struckAt-Tf)*3):0)); ctx.scale(sc,sc); ctx.translate(-st.c[0],-st.c[1]); ctx.fillStyle='#FFE34D'; ctx.strokeStyle=C.ink; ctx.lineWidth=4/sc; ctx.fill(path); ctx.stroke(path); ctx.restore();
      ctx.fillStyle=C.ink; ctx.font=`900 ${Math.round(H*0.04)}px Archivo, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(r.st, W*0.92, gy-cs*0.9); };
    return A;
  },
  /* a periscope rises, swivels, locks on, and a torpedo blows the state sky-high */
  submarine({W,H,r,hit,spawnConfetti,shake}){
    const A = {dur:9, struck:false, struckAt:0}; SFX.bubbles();
    const st=STATES[r.st]||STATES.TX; const path=new Path2D(st.d); const sc=Math.min(H*0.24/300,1.1);
    const waterY=H*0.7, px=W*0.42, tw=Math.min(W*0.038,70), tx=W*0.8; const bubbles=[], sparks=[]; let fired=false, boomed=false, boomAt=0;
    const drawState=(x,y,rot,s)=>{ ctx.save(); ctx.translate(x,y); ctx.rotate(rot); ctx.scale(s,s); ctx.translate(-st.c[0],-st.c[1]); ctx.fillStyle='#FFE34D'; ctx.strokeStyle=C.ink; ctx.lineWidth=4/s; ctx.fill(path); ctx.stroke(path); ctx.restore(); ctx.fillStyle=C.ink; ctx.font=`900 ${Math.round(H*0.045)}px Archivo, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(r.st,x,y); };
    A.frame = t=>{
      const rise=1-Math.pow(1-Math.min(1,t/1.5),3); const topY=waterY+tw*2-rise*(waterY-H*0.25);
      const sw=t<1.6?0:Math.min(1,(t-1.6)/0.9); const dir=-Math.cos(sw*Math.PI);
      // target state bobbing on the surface (then launched by the torpedo)
      let sx=tx, sy=waterY-H*0.03+Math.sin(t*2)*8, srot=Math.sin(t*2)*0.08, ss=sc;
      if(boomed){ const f=t-boomAt; sy=waterY-H*0.03-Math.sin(Math.min(1,f/1.8)*Math.PI)*H*0.55; srot=f*5; }
      if(!boomed||t-boomAt>0.1) drawState(sx,sy,srot,ss);
      // water (translucent so the page shows through)
      ctx.beginPath(); ctx.moveTo(0,H+10); ctx.lineTo(0,waterY); for(let x=0;x<=W;x+=16) ctx.lineTo(x, waterY+Math.sin(x/90+t*3)*9+Math.sin(x/37-t*2)*4); ctx.lineTo(W,H+10); ctx.closePath(); ctx.fillStyle='rgba(46,111,224,0.42)'; ctx.fill(); ctx.strokeStyle='#7FAAF6'; ctx.lineWidth=6; ctx.stroke();
      // sub hull hint below the surface
      ctx.fillStyle='rgba(21,20,18,0.25)'; ctx.beginPath(); ctx.ellipse(px, H*0.92, W*0.16, H*0.07, 0, 0, 7); ctx.fill();
      // periscope tube + head
      ctx.fillStyle='#8C8A84'; ctx.strokeStyle=C.ink; ctx.lineWidth=5; roundRect(px-tw/2, topY, tw, H-topY+20, 4); ctx.fill(); ctx.stroke();
      ctx.save(); ctx.translate(px,topY); ctx.scale(dir,1); roundRect(-tw/2,-tw*1.3,tw*2.6,tw*1.3,tw*0.3); ctx.fill(); ctx.stroke(); ctx.fillStyle='#153E8F'; ctx.beginPath(); ctx.arc(tw*1.9,-tw*0.65,tw*0.42,0,7); ctx.fill(); ctx.stroke(); ctx.fillStyle='#7FAAF6'; ctx.beginPath(); ctx.arc(tw*1.9,-tw*0.65,tw*0.28,0,7); ctx.fill(); ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(tw*2.0,-tw*0.78,tw*0.1,0,7); ctx.fill(); ctx.restore();
      // bubbles
      if(t<6 && Math.random()<0.6) bubbles.push({x:px+rr(-tw,tw), y:H+10, r:rr(4,12), vy:-rr(2,5), wob:rr(0,6)});
      ctx.strokeStyle='#fff'; ctx.lineWidth=2; for(const b of bubbles){ b.y+=b.vy; ctx.beginPath(); ctx.arc(b.x+Math.sin(b.y/30+b.wob)*6,b.y,b.r,0,7); ctx.stroke(); } for(let i=bubbles.length-1;i>=0;i--) if(bubbles[i].y<waterY) bubbles.splice(i,1);
      // crosshair lock-on
      if(t>=2.5 && !boomed){ const k=Math.min(1,(t-2.5)/0.4); const R=H*0.3-(H*0.3-H*0.13)*k; const blink=(t>=3&&Math.floor(t*8)%2===0); ctx.strokeStyle=blink?'#FFE34D':'#F0562A'; ctx.lineWidth=7; ctx.beginPath(); ctx.arc(sx,sy,R,0,7); ctx.stroke(); ctx.beginPath(); ctx.arc(sx,sy,R*0.5,0,7); ctx.stroke(); ctx.beginPath(); for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){ ctx.moveTo(sx+dx*R*0.3,sy+dy*R*0.3); ctx.lineTo(sx+dx*R*1.25,sy+dy*R*1.25); } ctx.stroke();
        if(k>=1){ ctx.fillStyle=blink?'#FFE34D':'#F0562A'; ctx.font=`900 ${Math.round(H*0.045)}px Archivo, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('TARGET LOCKED', sx, sy-R-H*0.04); } }
      if(!A.struck && t>=2.95){ A.struck=true; A.struckAt=t; hit('DIVE DIVE DIVE!','ping'); }
      // torpedo
      if(t>=3.3 && !boomed){ if(!fired){ fired=true; SFX.torpedo(); } const f=(t-3.3)/0.75; const x=px+tw*2+(tx-px-tw*2)*f, y=waterY+H*0.06; const tl=Math.min(W*0.09,170);
        for(let i=0;i<3;i++) bubbles.push({x:x-tl*0.6+rr(-10,10), y:y+rr(-10,10), r:rr(3,9), vy:-rr(3,6), wob:rr(0,6)});
        ctx.fillStyle='#F0562A'; ctx.strokeStyle=C.ink; ctx.lineWidth=4; roundRect(x-tl*0.6,y-tl*0.11,tl*1.2,tl*0.22,tl*0.11); ctx.fill(); ctx.stroke(); ctx.fillStyle='#FFE34D'; ctx.beginPath(); ctx.moveTo(x-tl*0.55,y-tl*0.1); ctx.lineTo(x-tl*0.75,y-tl*0.25); ctx.lineTo(x-tl*0.6,y); ctx.lineTo(x-tl*0.75,y+tl*0.25); ctx.lineTo(x-tl*0.55,y+tl*0.1); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(x+tl*0.35,y-tl*0.03,tl*0.05,0,7); ctx.fill();
        if(f>=1){ boomed=true; boomAt=t; shake(); SFX.boom(); spawnConfetti(300, tx, waterY); for(let i=0;i<220;i++){ const a=Math.random()*Math.PI*2, v=rr(3,18); sparks.push({x:tx,y:waterY-H*0.03,vx:Math.cos(a)*v,vy:Math.sin(a)*v-4,life:rr(0.8,2),age:0,c:['#FFE34D','#fff','#7FAAF6','#F0562A'][i%4],r:rr(4,10)}); } } }
      // splash sparks
      for(const s of sparks){ s.age+=1/60; s.vy+=0.25; s.x+=s.vx; s.y+=s.vy; const a=Math.max(0,1-s.age/s.life); ctx.globalAlpha=a; ctx.fillStyle=s.c; const q=s.r*a+1; ctx.fillRect(s.x-q,s.y-q,q*2,q*2); } ctx.globalAlpha=1; for(let i=sparks.length-1;i>=0;i--) if(sparks[i].age>sparks[i].life) sparks.splice(i,1);
      if(boomed){ const f=t-boomAt; if(f<0.5){ ctx.strokeStyle='#FFE34D'; ctx.lineWidth=14*(1-f/0.5); ctx.beginPath(); ctx.arc(tx,waterY,f*W*0.5,0,7); ctx.stroke(); } } };
    return A;
  },
  /* the blue donkey on a treadmill: dial climbs, legs blur, then it flies off the back */
  treadmill({W,H,hit,shake}){
    const A = {dur:9, struck:false, struckAt:0}; SFX.whir();
    const S=Math.min(H*0.14,150), bw=Math.min(W*0.55,1000), bh=S*0.38, bx=W*0.5-bw/2, by=H*0.8, launchT=2.8;
    const smoke=[]; let off=0, ph=0, fly=null;
    // body, head, ears, sweatband and eye are static → one sprite (size S); the (possibly motion-blurred) legs, tail and sweat drops stay live
    const bodySp=SPR.shape(-S*0.95,-S*1.6,S*1.95,S*0.5,g=>{ const s=S; SPR.donkeyBase(g,s);
      g.fillStyle='#F0562A'; g.fillRect(s*1.15,-s*1.12,s*0.75,s*0.1); g.strokeRect(s*1.15,-s*1.12,s*0.75,s*0.1);
      g.fillStyle='#fff'; g.beginPath(); g.arc(s*1.7,-s*0.95,s*0.11,0,7); g.fill(); g.fillStyle='#151412'; g.beginPath(); g.arc(s*1.73,-s*0.94,s*0.05,0,7); g.fill(); },14);
    const donkey=(x,y,s,ph,blur,rot)=>{ ctx.save(); ctx.translate(x,y); ctx.rotate(rot||0); const bob=Math.sin(ph)*s*0.08; ctx.translate(0,bob); bodySp.draw(0,0); ctx.fillStyle='#2E6FE0'; ctx.strokeStyle=C.ink; ctx.lineWidth=4;
      const passes=blur?[-0.9,0,0.9]:[0]; for(const dp of passes){ ctx.globalAlpha=blur?0.45:1; SPR.donkeyLegs(s,ph+dp); } ctx.globalAlpha=1;
      ctx.strokeStyle=C.ink; ctx.lineWidth=6; ctx.beginPath(); ctx.moveTo(-s*0.9,-s*0.3); ctx.quadraticCurveTo(-s*1.5,-s*0.6+Math.sin(ph*0.7)*s*0.3,-s*1.3,s*0.1); ctx.stroke();
      // sweat drops
      ctx.fillStyle='#7FAAF6'; for(let i=0;i<2;i++){ const q=((ph*0.15)+i*0.5)%1; ctx.beginPath(); ctx.arc(s*1.95+q*s*0.4, -s*1.0+q*s*0.6, s*0.06*(1-q*0.5),0,7); ctx.fill(); }
      ctx.restore(); };
    A.frame = t=>{
      const speed = t<launchT? Math.min(1,t/2.5) : 1; off += (0.3+speed*speed*1.4)*W/90; ph += 0.25+speed*0.75;
      // treadmill frame: base + belt with moving stripes
      ctx.fillStyle='#8C8A84'; ctx.strokeStyle=C.ink; ctx.lineWidth=5; roundRect(bx-S*0.3,by+bh*0.6,bw+S*0.6,bh*0.8,bh*0.3); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#1E2A44'; roundRect(bx,by,bw,bh,bh/2); ctx.fill(); ctx.stroke();
      ctx.save(); roundRect(bx,by,bw,bh,bh/2); ctx.clip(); ctx.fillStyle='#7FAAF6'; const sp=S*0.5; for(let x=bx-sp+((-off)%sp+sp)%sp; x<bx+bw; x+=sp){ ctx.fillRect(x,by,sp*0.18,bh); } ctx.restore();
      // console post + dial at the front (right)
      const cx=bx+bw+S*0.55, cy=by-S*1.9, pw=S*1.5, phh=S*1.1; ctx.fillStyle='#8C8A84'; ctx.lineWidth=5; roundRect(bx+bw-S*0.1,by-S*1.4,S*0.22,S*1.5,8); ctx.fill(); ctx.stroke(); roundRect(bx+bw+S*0.3,by-S*1.4,S*0.22,S*1.5,8); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#1E2A44'; roundRect(cx-pw/2,cy-phh/2,pw,phh,S*0.12); ctx.fill(); ctx.stroke();
      ctx.lineWidth=S*0.09; ctx.strokeStyle='#7FAAF6'; ctx.beginPath(); ctx.arc(cx,cy+S*0.2,S*0.5,Math.PI,Math.PI*1.7); ctx.stroke(); ctx.strokeStyle='#F0562A'; ctx.beginPath(); ctx.arc(cx,cy+S*0.2,S*0.5,Math.PI*1.7,Math.PI*2); ctx.stroke();
      const na=Math.PI+speed*Math.PI*(1+(speed>=1?Math.sin(t*40)*0.04:0)); ctx.strokeStyle='#fff'; ctx.lineWidth=S*0.05; ctx.beginPath(); ctx.moveTo(cx,cy+S*0.2); ctx.lineTo(cx+Math.cos(na)*S*0.48,cy+S*0.2+Math.sin(na)*S*0.48); ctx.stroke(); ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(cx,cy+S*0.2,S*0.07,0,7); ctx.fill();
      ctx.fillStyle='#FFE34D'; ctx.font=`900 ${Math.round(S*0.26)}px Archivo, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(Math.round(speed*88)+' MPH', cx, cy+S*0.4);
      // smoke at the hooves when fast
      if(speed>0.55 && !fly) for(let i=0;i<3;i++) smoke.push({x:bx+bw*0.3+rr(-S,S*0.4),y:by+rr(-10,10),r:rr(10,26),vx:-rr(4,10)*speed,vy:-rr(0.5,3),a:1});
      for(const m of smoke){ m.x+=m.vx; m.y+=m.vy; m.r+=0.8; m.a-=0.018; ctx.globalAlpha=Math.max(0,m.a)*0.5; ctx.fillStyle='#9A978F'; ctx.beginPath(); ctx.arc(m.x,m.y,m.r,0,7); ctx.fill(); } ctx.globalAlpha=1; for(let i=smoke.length-1;i>=0;i--) if(smoke[i].a<=0) smoke.splice(i,1);
      // the donkey
      if(!fly){ const dx=bx+bw*0.45-speed*bw*0.12+(speed>0.8?rr(-4,4):0); donkey(dx,by-S*0.55,S,ph,speed>0.7,0);
        if(t>=launchT){ A.struck=true; A.struckAt=t; fly={x:dx,y:by-S*0.55,vx:-W/70,vy:-H/90,rot:0}; hit('CARDIO!','cardio'); shake(); for(let i=0;i<25;i++) smoke.push({x:dx,y:by,r:rr(12,30),vx:rr(-12,4),vy:rr(-6,1),a:1}); } }
      else { fly.vy+=0.35; fly.x+=fly.vx; fly.y+=fly.vy; fly.rot-=0.16; if(fly.y<H+S*3) donkey(fly.x,fly.y,S,ph,true,fly.rot); }
      };
    return A;
  },
  /* a rubber-band ball bounces DVD-logo style and finally nails the corner */
  dvdball({W,H,r,hit}){
    const A = {dur:9, struck:false, struckAt:0}; SFX.boing(240);
    const R=Math.min(H*0.14,150), T=3.4, Px=2*(W-2*R), Py=2*(H-2*R); const x0=R+W*rr(0.1,0.2), y0=R+H*rr(0.08,0.2);
    const vx=(R+Px/2+1*Px-x0)/T, vy=(R+Py/2+2*Py-y0)/T;
    const fills=['#2E6FE0','#F0562A','#FFE34D','#8c4bd6','#7FAAF6','#1E4DA8','#F0562A']; const bands=['#F0562A','#FFE34D','#7FAAF6','#fff','#BBD0F5','#2E6FE0'];
    let ci=0, segX=-1, segY=-1; const trail=[]; let hits=0; const rings=[];
    const fold=(u,P)=>{ u=((u%P)+P)%P; return u<=P/2? u : P-u; };
    const ball=(x,y,rad,spin,sqx,sqy)=>{ ctx.save(); ctx.translate(x,y); ctx.scale(sqx,sqy); ctx.rotate(spin); ctx.fillStyle=fills[ci%fills.length]; ctx.beginPath(); ctx.arc(0,0,rad,0,7); ctx.fill();
      ctx.save(); ctx.beginPath(); ctx.arc(0,0,rad,0,7); ctx.clip(); for(let i=0;i<9;i++){ ctx.strokeStyle=bands[(i+ci)%bands.length]; ctx.lineWidth=rad*0.09; ctx.beginPath(); ctx.ellipse(0,0,rad*0.98,rad*(0.18+i*0.09),i*0.73+ci,0,7); ctx.stroke(); ctx.strokeStyle='rgba(21,20,18,.35)'; ctx.lineWidth=2; ctx.stroke(); } ctx.restore();
      ctx.strokeStyle=C.ink; ctx.lineWidth=5; ctx.beginPath(); ctx.arc(0,0,rad,0,7); ctx.stroke();
      // googly eyes, naturally
      ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(-rad*0.3,-rad*0.1,rad*0.18,0,7); ctx.fill(); ctx.beginPath(); ctx.arc(rad*0.3,-rad*0.1,rad*0.18,0,7); ctx.fill(); ctx.fillStyle='#151412'; ctx.beginPath(); ctx.arc(-rad*0.25,-rad*0.08,rad*0.08,0,7); ctx.fill(); ctx.beginPath(); ctx.arc(rad*0.35,-rad*0.08,rad*0.08,0,7); ctx.fill(); ctx.restore(); };
    A.frame = t=>{
      const te = t<T? t : T+Math.max(0,t-T-1.3)*0.55; const xu=x0+vx*te, yu=y0+vy*te;
      const x=R+fold(xu-R,Px), y=R+fold(yu-R,Py); const sX=Math.floor((xu-R)/(Px/2)), sY=Math.floor((yu-R)/(Py/2));
      if(segX>=0 && (sX!==segX||sY!==segY)){ ci++; hits++; if(!(t>=T&&t<T+0.1)) SFX.boing(260+hits*60); rings.push({x,y,r:R,a:1}); } segX=sX; segY=sY;
      // corner moment
      if(!A.struck && t>=T){ A.struck=true; A.struckAt=t; hit('CORNER!','crowd'); for(let i=0;i<4;i++) rings.push({x:W-R,y:H-R,r:R*(1+i*0.3),a:1}); }
      // faded trail
      trail.push({x,y}); if(trail.length>14) trail.shift(); for(let i=0;i<trail.length-1;i++){ ctx.globalAlpha=(i/trail.length)*0.35; ctx.fillStyle=fills[ci%fills.length]; ctx.beginPath(); ctx.arc(trail[i].x,trail[i].y,R*(0.5+i/trail.length*0.5),0,7); ctx.fill(); } ctx.globalAlpha=1;
      // bounce rings
      for(const g of rings){ g.r+=8; g.a-=0.04; ctx.globalAlpha=Math.max(0,g.a); ctx.strokeStyle='#FFE34D'; ctx.lineWidth=8; ctx.beginPath(); ctx.arc(g.x,g.y,g.r,0,7); ctx.stroke(); } ctx.globalAlpha=1; for(let i=rings.length-1;i>=0;i--) if(rings[i].a<=0) rings.splice(i,1);
      // the ball (squashed into the corner at the climax)
      const inCorner=A.struck && t<T+1.3; const sq=inCorner? Math.exp(-(t-T)*4)*0.3 : 0; ball(x,y,R,te*3,1+sq,1-sq);
      // corner counter / commentary
      if(A.struck){ const f=t-T; ctx.fillStyle='#FFE34D'; ctx.strokeStyle=C.ink; ctx.lineWidth=3; for(const [cxp,cyp] of [[0,0],[W,0],[0,H],[W,H]]){ const k=Math.sin(f*6)*0.5+0.5; ctx.beginPath(); ctx.moveTo(cxp,cyp); ctx.lineTo(cxp+(cxp?-1:1)*R*(0.8+k*0.3),cyp); ctx.lineTo(cxp,cyp+(cyp?-1:1)*R*(0.8+k*0.3)); ctx.closePath(); ctx.fill(); ctx.stroke(); } }
      // the state keeps score top-left
      const st=STATES[r.st]||STATES.TX; const path=new Path2D(st.d); const sc=Math.min(H*0.16/300,0.8); ctx.save(); ctx.translate(W*0.5,H*0.12); ctx.scale(sc,sc); ctx.translate(-st.c[0],-st.c[1]); ctx.fillStyle='#FFE34D'; ctx.strokeStyle=C.ink; ctx.lineWidth=4/sc; ctx.fill(path); ctx.stroke(path); ctx.restore();
      ctx.fillStyle=C.ink; ctx.font=`900 ${Math.round(H*0.035)}px Archivo, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(`${r.st} · BOUNCES: ${hits}`, W*0.5, H*0.12+H*0.1); };
    return A;
  },
  /* drive-thru: the order board lights up and the state slides out as a burger */
  drivethru({W,H,r,hit}){
    const A = {dur:9, struck:false, struckAt:0}; SFX.static();
    const st=STATES[r.st]||STATES.TX; const path=new Path2D(st.d); const S=Math.min(H*0.17,180); const sc=S*1.5/300;
    const counterY=H*0.7, trayW=S*2.9, trayH=S*0.24, startX=W*0.3, endX=W*0.68; const steam=[]; let dinged=false;
    const burger=(x,y,wob)=>{ const bw=S*1.6; ctx.save(); ctx.translate(x,y); ctx.rotate(wob); ctx.strokeStyle=C.ink; ctx.lineWidth=4;
      ctx.fillStyle='#E8B04E'; ctx.beginPath(); ctx.ellipse(0,-S*0.1,bw/2,S*0.2,0,0,Math.PI); ctx.lineTo(-bw/2,-S*0.1); ctx.closePath(); ctx.fill(); ctx.stroke(); // bottom bun
      ctx.fillStyle='#F0562A'; ctx.beginPath(); ctx.ellipse(0,-S*0.2,bw*0.53,S*0.09,0,0,7); ctx.fill(); ctx.stroke(); // tomato
      ctx.save(); ctx.translate(0,-S*0.55); ctx.scale(sc,sc*0.75); ctx.translate(-st.c[0],-st.c[1]); ctx.fillStyle='#2E6FE0'; ctx.strokeStyle=C.ink; ctx.lineWidth=5/sc; ctx.fill(path); ctx.stroke(path); ctx.restore(); // the patty
      ctx.fillStyle=C.ink; ctx.font=`900 ${Math.round(S*0.28)}px Archivo, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillStyle='#fff'; ctx.fillText(r.st,0,-S*0.46);
      ctx.fillStyle='#FFE34D'; ctx.beginPath(); ctx.moveTo(-bw*0.55,-S*0.74); ctx.lineTo(bw*0.5,-S*0.78); ctx.lineTo(bw*0.42,-S*0.68); ctx.lineTo(-bw*0.42,-S*0.64); ctx.closePath(); ctx.fill(); ctx.stroke(); // cheese
      ctx.fillStyle='#E8B04E'; ctx.beginPath(); ctx.ellipse(0,-S*0.74,bw/2,S*0.46,0,Math.PI,0); ctx.lineTo(bw/2,-S*0.74); ctx.closePath(); ctx.fill(); ctx.stroke(); // top bun
      ctx.fillStyle='#fff'; for(const [dx,dy] of [[-0.3,-0.3],[-0.1,-0.42],[0.12,-0.38],[0.3,-0.28],[0,-0.22],[-0.22,-0.18],[0.22,-0.15]]){ ctx.beginPath(); ctx.ellipse(dx*bw,-S*0.74+dy*S,S*0.04,S*0.025,0.5,0,7); ctx.fill(); }
      ctx.restore(); };
    A.frame = t=>{
      // menu board
      const mx=W*0.07, my=H*0.1, mw=Math.min(W*0.34,660), mh=H*0.46; ctx.fillStyle='#8C8A84'; ctx.strokeStyle=C.ink; ctx.lineWidth=5; roundRect(mx+mw/2-S*0.16,my+mh,S*0.32,counterY-my-mh+H*0.3,6); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#1E2A44'; roundRect(mx,my,mw,mh,S*0.12); ctx.fill(); ctx.strokeStyle='#FFE34D'; ctx.lineWidth=10; roundRect(mx,my,mw,mh,S*0.12); ctx.stroke(); ctx.strokeStyle=C.ink; ctx.lineWidth=4; roundRect(mx-7,my-7,mw+14,mh+14,S*0.14); ctx.stroke();
      ctx.fillStyle='#FFE34D'; roundRect(mx+S*0.1,my+S*0.1,mw-S*0.2,S*0.42,S*0.08); ctx.fill(); ctx.fillStyle='#1E2A44'; ctx.font=`900 ${Math.round(S*0.28)}px Archivo, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('DRIVE-THRU', mx+mw/2, my+S*0.31);
      const blink=Math.floor(t*3)%2===0||t>2.3; ctx.fillStyle='#fff'; ctx.font=`900 ${Math.round(S*0.34)}px Archivo, sans-serif`; ctx.fillText('ORDER', mx+mw/2, my+S*0.95);
      ctx.fillStyle=blink?'#FFE34D':'#F0562A'; ctx.font=`900 ${Math.round(S*0.95)}px Archivo, sans-serif`; ctx.fillText('#218', mx+mw/2, my+S*1.6);
      ctx.fillStyle='#fff'; ctx.font=`900 ${Math.round(S*0.42)}px Archivo, sans-serif`; ctx.fillText('READY', mx+mw/2, my+S*2.25);
      ctx.fillStyle='#7FAAF6'; ctx.font=`900 ${Math.round(S*0.3)}px Archivo, sans-serif`; ctx.fillText('#51 · coming up', mx+mw/2, my+S*2.68);
      // speaker grille on the post
      ctx.fillStyle='#1E2A44'; roundRect(mx+mw/2-S*0.3,my+mh+S*0.15,S*0.6,S*0.5,S*0.08); ctx.fill(); ctx.strokeStyle=C.ink; ctx.lineWidth=4; roundRect(mx+mw/2-S*0.3,my+mh+S*0.15,S*0.6,S*0.5,S*0.08); ctx.stroke(); ctx.fillStyle='#8C8A84'; for(let i=0;i<4;i++) ctx.fillRect(mx+mw/2-S*0.22,my+mh+S*0.23+i*S*0.1,S*0.44,S*0.04);
      // pickup window + counter
      const wx=W*0.42, wy=H*0.22, ww=W*0.14, wh=counterY-wy; ctx.fillStyle='rgba(127,170,246,0.3)'; ctx.fillRect(wx,wy,ww,wh); ctx.strokeStyle=C.ink; ctx.lineWidth=8; ctx.strokeRect(wx,wy,ww,wh); ctx.fillStyle='#FFE34D'; ctx.fillRect(wx-S*0.1,wy-S*0.25,ww+S*0.2,S*0.25); ctx.strokeRect(wx-S*0.1,wy-S*0.25,ww+S*0.2,S*0.25);
      ctx.fillStyle='#1E2A44'; ctx.font=`900 ${Math.round(S*0.16)}px Archivo, sans-serif`; ctx.fillText('PICK UP', wx+ww/2, wy-S*0.12);
      ctx.fillStyle='#c98a4b'; ctx.strokeStyle=C.ink; ctx.lineWidth=5; roundRect(wx-S*0.1,counterY,W-wx+S*0.2,S*0.3,8); ctx.fill(); ctx.stroke();
      // tray slides out
      const u=Math.min(1,Math.max(0,(t-0.4)/1.8)); const e=1-Math.pow(1-u,3); const over=u>=1? Math.sin((t-2.2)*14)*Math.exp(-(t-2.2)*5)*S*0.1 : 0; const txx=startX+(endX-startX)*e+over; const ty=counterY;
      ctx.save(); ctx.beginPath(); ctx.rect(wx,0,W,H); ctx.clip();
      ctx.fillStyle='#F0562A'; ctx.strokeStyle=C.ink; ctx.lineWidth=5; roundRect(txx-trayW/2,ty-trayH,trayW,trayH,trayH/2); ctx.fill(); ctx.stroke(); ctx.fillStyle='rgba(255,255,255,.25)'; roundRect(txx-trayW/2+S*0.1,ty-trayH+S*0.05,trayW-S*0.2,trayH*0.35,trayH*0.2); ctx.fill();
      // fries + drink
      ctx.fillStyle='#FFE34D'; for(let i=0;i<5;i++){ ctx.fillRect(txx-trayW*0.42+i*S*0.09, ty-trayH-S*0.55-(i%2)*S*0.08, S*0.07, S*0.6); } ctx.fillStyle='#F0562A'; roundRect(txx-trayW*0.45,ty-trayH-S*0.32,S*0.55,S*0.34,S*0.06); ctx.fill(); ctx.stroke(); ctx.fillStyle='#fff'; ctx.font=`900 ${Math.round(S*0.16)}px Archivo, sans-serif`; ctx.fillText('D', txx-trayW*0.45+S*0.27, ty-trayH-S*0.14);
      ctx.fillStyle='#2E6FE0'; ctx.beginPath(); ctx.moveTo(txx+trayW*0.28,ty-trayH); ctx.lineTo(txx+trayW*0.47,ty-trayH); ctx.lineTo(txx+trayW*0.45,ty-trayH-S*0.75); ctx.lineTo(txx+trayW*0.3,ty-trayH-S*0.75); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle='#fff'; ctx.fillRect(txx+trayW*0.29,ty-trayH-S*0.8,trayW*0.17,S*0.08); ctx.strokeRect(txx+trayW*0.29,ty-trayH-S*0.8,trayW*0.17,S*0.08); ctx.strokeStyle='#F0562A'; ctx.lineWidth=6; ctx.beginPath(); ctx.moveTo(txx+trayW*0.38,ty-trayH-S*0.8); ctx.lineTo(txx+trayW*0.42,ty-trayH-S*1.15); ctx.stroke();
      burger(txx-S*0.05, ty-trayH+2, u<1? Math.sin(t*18)*0.03 : Math.sin((t-2.2)*14)*0.06*Math.exp(-(t-2.2)*5));
      ctx.restore();
      if(!A.struck && u>=1){ A.struck=true; A.struckAt=t; hit('ORDER UP!','bell'); }
      // steam once it has arrived
      if(A.struck){ if(Math.random()<0.3) steam.push({x:txx+rr(-S*0.5,S*0.5), y:ty-trayH-S*1.25, r:rr(6,14), a:1, vx:rr(-0.5,0.5), ph:rr(0,6)});
        ctx.strokeStyle='#fff'; for(const s of steam){ s.y-=2.6; s.a-=0.016; s.r+=0.3; ctx.globalAlpha=Math.max(0,s.a)*0.8; ctx.lineWidth=4; ctx.beginPath(); ctx.arc(s.x+Math.sin(s.y/25+s.ph)*10,s.y,s.r,0,7); ctx.stroke(); } ctx.globalAlpha=1; for(let i=steam.length-1;i>=0;i--) if(steam[i].a<=0) steam.splice(i,1);
        // bell on the counter, ringing
        const bxp=W*0.9, byp=counterY; const ring=Math.sin((t-A.struckAt)*30)*0.12*Math.exp(-(t-A.struckAt)*2); ctx.save(); ctx.translate(bxp,byp); ctx.rotate(ring); ctx.fillStyle='#FFE34D'; ctx.strokeStyle=C.ink; ctx.lineWidth=4; ctx.beginPath(); ctx.arc(0,-S*0.2,S*0.3,Math.PI,0); ctx.lineTo(S*0.3,0); ctx.lineTo(-S*0.3,0); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle=C.ink; ctx.beginPath(); ctx.arc(0,-S*0.52,S*0.06,0,7); ctx.fill(); ctx.restore(); }
      else { const bxp=W*0.9, byp=counterY; ctx.fillStyle='#FFE34D'; ctx.strokeStyle=C.ink; ctx.lineWidth=4; ctx.beginPath(); ctx.arc(bxp,byp-S*0.2,S*0.3,Math.PI,0); ctx.lineTo(bxp+S*0.3,byp); ctx.lineTo(bxp-S*0.3,byp); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle=C.ink; ctx.beginPath(); ctx.arc(bxp,byp-S*0.52,S*0.06,0,7); ctx.fill(); } };
    return A;
  }
});
KINDS.push('catapult','submarine','treadmill','dvdball','drivethru');
/* anims-extra/part5.js — elevator, gnomes, coaster, lasso, piano */
(function(){
const ease = u => u<=0? 0 : u>=1? 1 : u*u*(3-2*u);
const easeOut = u => u<=0? 0 : u>=1? 1 : 1-Math.pow(1-u,3);
// bounding box of a state's absolute-coordinate SVG path (viewBox 975x610)
const stBox = st => { const n=(st.d.match(/-?\d+(\.\d+)?/g)||[]).map(Number); let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9; for(let i=0;i+1<n.length;i+=2){ x0=Math.min(x0,n[i]); x1=Math.max(x1,n[i]); y0=Math.min(y0,n[i+1]); y1=Math.max(y1,n[i+1]); } if(x1<x0){ x0=st.c[0]-120; x1=st.c[0]+120; y0=st.c[1]-120; y1=st.c[1]+120; } return {w:x1-x0, h:y1-y0, cx:(x0+x1)/2, cy:(y0+y1)/2}; };
// draw the state silhouette centred on (x,y)
const drawState = (st,path,box,x,y,sc,rot,fill,sx,sy) => { ctx.save(); ctx.translate(x,y); ctx.rotate(rot||0); ctx.scale(sc*(sx||1),sc*(sy||1)); ctx.translate(-box.cx,-box.cy); ctx.fillStyle=fill; ctx.strokeStyle=C.ink; ctx.lineWidth=4/sc; ctx.fill(path); ctx.stroke(path); ctx.restore(); };
const label = (txt,x,y,px,col) => { ctx.fillStyle=col||C.ink; ctx.font=`900 ${Math.round(px)}px Archivo, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(txt,x,y); };

/* ---------- sounds ---------- */
SFX.elevDing = function(){ tone(1568, 0, 0.1, 'sine', 0.12); };
SFX.elevator = function(){ tone(1047, 0, 0.5, 'sine', 0.3); tone(1319, 0.18, 0.9, 'sine', 0.3); noise(0.2, 1.2, 0.08, 3000); cheer(0.5); };
SFX.march = function(){ for(let i=0;i<26;i++){ tone(i%2?95:70, i*0.15, 0.07, 'triangle', 0.3, 50); if(i%4===0) tone(660, i*0.15, 0.05, 'square', 0.05); } };
SFX.gnomed = function(){ [392,523,659,784,1047].forEach((f,i)=>tone(f, i*0.08, 0.35, 'square', 0.15)); for(let i=0;i<10;i++) tone(1500+Math.random()*1500, 0.4+i*0.05, 0.2, 'sine', 0.06); cheer(0.3); };
SFX.clack = function(){ for(let i=0;i<10;i++) tone(220, i*0.1, 0.05, 'square', 0.1, 150); };
SFX.whoosh = function(){ noise(0, 1.4, 0.5, 2200); tone(1100, 0, 1.0, 'sawtooth', 0.14, 250); tone(1300, 0.05, 0.9, 'sawtooth', 0.08, 320); cheer(0.5); };
SFX.whirl = function(){ for(let i=0;i<10;i++) noise(i*0.18, 0.12, 0.18, 1600); };
SFX.yeehaw = function(){ tone(330, 0, 0.25, 'sawtooth', 0.18, 660); tone(660, 0.25, 0.5, 'sawtooth', 0.18, 440); noise(0.3, 0.8, 0.3, 900); cheer(0.4); };
SFX.whistle = function(){ tone(2200, 0, 1.7, 'sine', 0.18, 500); };
SFX.plonk = function(){ noise(0, 1.0, 1.0, 1200); tone(55, 0, 1.2, 'sine', 0.6, 28); [130.8,155.6,196,261.6,311.1,392].forEach(f=>{ tone(f, 0.02, 2.2, 'sawtooth', 0.09); tone(f, 0.02, 2.2, 'triangle', 0.1); }); for(let i=0;i<12;i++) tone(1200+Math.random()*2500, 0.1+i*0.06, 0.3, 'square', 0.05); cheer(0.5); };

Object.assign(ANIMS, {
  /* elevator — the state rides a lift up to floor 218 */
  elevator({W,H,r,hit,shake}){
    const A = {dur:9, struck:false, struckAt:0}; SFX.elevDing();
    const st=STATES[r.st]||STATES.TX, path=new Path2D(st.d), box=stBox(st);
    const EH=Math.min(H*0.58, 640), EW=EH*0.78, ex=W/2, ebot=H*0.9, etop=ebot-EH, fw=EW*0.09; // doorway box
    const sc=Math.min(EW*0.78/box.w, EH*0.5/box.h); let lastDing=-1, lastShake=-1;
    const openAmt = t => t<0.7? ease(t/0.7) : t<1.7? 1 : t<2.2? 1-ease((t-1.7)/0.5) : t<3.6? 0 : ease((t-3.6)/0.5);
    const floorAt = t => t<2.2? 1 : t<3.6? Math.round(1+217*ease((t-2.2)/1.4)) : 218;
    A.frame = t=>{
      const open=openAmt(t), fl=floorAt(t); const counting=t>=2.2 && t<3.6;
      if(counting){ const k=Math.floor(fl/20); if(k!==lastDing){ lastDing=k; SFX.elevDing(); } const sk=Math.floor(t*6); if(sk!==lastShake){ lastShake=sk; } }
      const jx = counting? rr(-3,3):0, jy = counting? rr(-3,3):0;
      // light pouring out after arrival
      if(A.struck){ const g=Math.min(1,(t-A.struckAt)/0.6)*open; ctx.save(); ctx.globalAlpha=0.55*g; ctx.fillStyle='#FFE34D'; ctx.beginPath(); ctx.moveTo(ex-EW/2,etop); ctx.lineTo(ex+EW/2,etop); ctx.lineTo(W+50,H+50); ctx.lineTo(-50,H+50); ctx.closePath(); ctx.fill();
        ctx.globalAlpha=0.35*g; for(let i=0;i<9;i++){ const a=-Math.PI/2 + (i-4)*0.32 + Math.sin(t*2+i)*0.05; const L=Math.max(W,H)*1.2; ctx.beginPath(); ctx.moveTo(ex,ebot-EH*0.5); ctx.lineTo(ex+Math.cos(a-0.06)*L, ebot-EH*0.5+Math.sin(a-0.06)*L); ctx.lineTo(ex+Math.cos(a+0.06)*L, ebot-EH*0.5+Math.sin(a+0.06)*L); ctx.closePath(); ctx.fill(); } ctx.restore(); }
      ctx.save(); ctx.translate(jx,jy);
      // frame + interior
      ctx.fillStyle='#8C8A84'; ctx.strokeStyle=C.ink; ctx.lineWidth=6; roundRect(ex-EW/2-fw, etop-fw, EW+fw*2, EH+fw*1.3, 10); ctx.fill(); ctx.stroke();
      ctx.fillStyle = A.struck? '#FFE34D' : '#BBD0F5'; ctx.fillRect(ex-EW/2, etop, EW, EH); ctx.fillStyle = A.struck? '#F0562A':'#2E6FE0'; ctx.fillRect(ex-EW/2, ebot-EH*0.12, EW, EH*0.12);
      ctx.strokeStyle=C.ink; ctx.lineWidth=4; ctx.strokeRect(ex-EW/2, etop, EW, EH);
      // the state (walks in from the left, then rides)
      const walk = t>=0.6 && t<1.7; const wx = t<0.6? -1 : ex - EW*1.5 + EW*1.5*ease((t-0.6)/1.0); const sx = t<1.7? wx : ex;
      const bob = walk? Math.abs(Math.sin(t*14))*EH*0.02 : 0; const sy = ebot - EH*0.12 - box.h*sc*0.5 - EH*0.06 - bob;
      ctx.save(); ctx.beginPath(); ctx.rect(ex-EW/2, etop, EW, EH); ctx.rect(-10,etop,ex-EW/2+10-fw,EH); ctx.clip(); // visible inside the cab and in front-left while walking in
      if(t>=0.6){
        if(walk){ ctx.strokeStyle=C.ink; ctx.lineWidth=8; ctx.lineCap='round'; const ly=sy+box.h*sc*0.45; for(const [dx,ph] of [[-30,0],[30,Math.PI]]){ const sw=Math.sin(t*14+ph)*22; ctx.beginPath(); ctx.moveTo(sx+dx,ly); ctx.lineTo(sx+dx+sw,ly+EH*0.09); ctx.lineTo(sx+dx+sw+18,ly+EH*0.09); ctx.stroke(); } }
        drawState(st,path,box,sx,sy,sc,A.struck? Math.sin((t-A.struckAt)*6)*0.08 : 0,'#2E6FE0'); label(r.st,sx,sy,H*0.05);
        if(A.struck){ // sunglasses, obviously
          ctx.fillStyle='#2b2825'; roundRect(sx-60,sy-H*0.02-14,52,30,8); ctx.fill(); roundRect(sx+8,sy-H*0.02-14,52,30,8); ctx.fill(); ctx.fillRect(sx-10,sy-H*0.02-8,20,6); }
      }
      ctx.restore();
      // doors
      ctx.save(); ctx.beginPath(); ctx.rect(ex-EW/2, etop, EW, EH); ctx.clip(); ctx.fillStyle='#8C8A84'; ctx.strokeStyle=C.ink; ctx.lineWidth=5; const dw=EW/2, off=open*dw;
      ctx.fillRect(ex-dw-off, etop, dw, EH); ctx.strokeRect(ex-dw-off, etop, dw, EH); ctx.fillRect(ex+off, etop, dw, EH); ctx.strokeRect(ex+off, etop, dw, EH);
      ctx.fillStyle='#BBD0F5'; roundRect(ex-dw-off+dw*0.2, etop+EH*0.12, dw*0.6, EH*0.35, 8); ctx.fill(); roundRect(ex+off+dw*0.2, etop+EH*0.12, dw*0.6, EH*0.35, 8); ctx.fill(); ctx.restore();
      // floor indicator
      const iw=EW*0.7, ih=EH*0.16, iy=etop-fw-ih-EH*0.03; ctx.fillStyle='#2b2825'; roundRect(ex-iw/2, iy, iw, ih, 12); ctx.fill(); ctx.strokeStyle='#8C8A84'; ctx.lineWidth=5; roundRect(ex-iw/2, iy, iw, ih, 12); ctx.stroke();
      ctx.fillStyle = (counting && Math.floor(t*8)%2===0)? '#F0562A':'#8C8A84'; ctx.beginPath(); ctx.moveTo(ex-iw*0.36, iy+ih*0.7); ctx.lineTo(ex-iw*0.28, iy+ih*0.3); ctx.lineTo(ex-iw*0.2, iy+ih*0.7); ctx.closePath(); ctx.fill();
      label(String(fl), ex+iw*0.08, iy+ih*0.52, ih*0.8, A.struck? '#FFE34D' : '#F0562A');
      ctx.restore();
      if(A.struck && t<A.struckAt+2.5 && Math.random()<0.15) shake();
      if(!A.struck && t>=3.6){ A.struck=true; A.struckAt=t; hit('GOING UP!','elevator'); } };
    return A;
  },
  /* gnomes — a parade of lawn gnomes forms a giant D */
  gnomes({W,H,hit}){
    const A = {dur:9, struck:false, struckAt:0}; SFX.march(); const s=Math.min(H*0.068, W*0.04);
    const LH=H*0.7, cy=H*0.47, gap=s*0.75, x0=W/2-LH*0.3; const T=[];
    for(const dx of [0,gap]){ const n=Math.round(LH/(s*1.1)); for(let i=0;i<=n;i++) T.push({x:x0+dx, y:cy-LH/2+i*(LH/n)}); }
    for(const [rx,ry] of [[LH*0.5, LH/2],[LH*0.5-gap, LH/2-gap*0.9]]){ const n=Math.round(Math.PI*(rx+ry)/2/gap); for(let i=1;i<n;i++){ const a=-Math.PI/2+Math.PI*i/n; T.push({x:x0+gap*0.5+Math.cos(a)*rx, y:cy+Math.sin(a)*ry}); } }
    for(const p of T) p.y += s*0.8; // targets are feet positions
    const N=T.length; const order=[...Array(N).keys()]; for(let i=N-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [order[i],order[j]]=[order[j],order[i]]; }
    const V=(W*0.95+s*1.5)/2.0, tS=2.0;
    // every gnome is the same static shape (only the feet shuffle) → one sprite; feet drawn live underneath, as before
    const gnomeSp=SPR.shape(-s*0.4,-s*1.75,s*0.4,-s*0.05,g=>{ g.strokeStyle=C.ink; g.lineWidth=3;
      g.fillStyle='#2E6FE0'; SPR.rr(g,-s*0.32,-s*0.74,s*0.64,s*0.64,s*0.14); g.fill(); g.stroke();
      g.fillStyle=C.ink; g.fillRect(-s*0.32,-s*0.4,s*0.64,s*0.07); g.fillStyle='#FFE34D'; g.fillRect(-s*0.07,-s*0.43,s*0.14,s*0.12);
      g.fillStyle='#F6C9A8'; g.beginPath(); g.arc(0,-s*0.86,s*0.22,0,7); g.fill(); g.stroke();
      g.fillStyle='#fff'; g.beginPath(); g.moveTo(-s*0.26,-s*0.82); g.quadraticCurveTo(-s*0.34,-s*0.4,0,-s*0.28); g.quadraticCurveTo(s*0.34,-s*0.4,s*0.26,-s*0.82); g.closePath(); g.fill(); g.stroke();
      g.fillStyle='#F0562A'; g.beginPath(); g.arc(0,-s*0.82,s*0.07,0,7); g.fill();
      g.fillStyle=C.ink; g.beginPath(); g.arc(-s*0.09,-s*0.92,s*0.03,0,7); g.arc(s*0.09,-s*0.92,s*0.03,0,7); g.fill();
      g.fillStyle='#F0562A'; g.beginPath(); g.moveTo(-s*0.3,-s*0.98); g.quadraticCurveTo(-s*0.05,-s*1.15,s*0.1,-s*1.7); g.quadraticCurveTo(s*0.08,-s*1.15,s*0.3,-s*0.98); g.closePath(); g.fill(); g.stroke(); },13);
    const gnome=(x,y,s,t,walk)=>{ const bob=walk? Math.abs(Math.sin(t*12))*s*0.1 : 0; const yy=y-bob;
      const sw=walk? Math.sin(t*12)*s*0.14 : 0; ctx.fillStyle=C.ink; roundRect(x-s*0.32+sw,yy-s*0.12,s*0.3,s*0.12,s*0.04); ctx.fill(); roundRect(x+s*0.02-sw,yy-s*0.12,s*0.3,s*0.12,s*0.04); ctx.fill();
      gnomeSp.draw(x,yy); };
    A.frame = t=>{
      // ground line
      ctx.fillStyle=C.ink; ctx.globalAlpha=0.12; ctx.fillRect(0,H*0.86,W,H*0.012); ctx.globalAlpha=1;
      const list=[];
      for(let k=0;k<N;k++){ const i=order[k]; const px=-s*1.5-k*s*0.95+t*V, py=H*0.86; const u=ease((t-tS-k*0.01)/1.0); const tg=T[i]; const x=px+(tg.x-px)*u, y=py+(tg.y-py)*u - Math.sin(u*Math.PI)*H*0.12; list.push({x,y,walk:u<1 || A.struck}); }
      list.sort((a,b)=>a.y-b.y); for(const g of list) gnome(g.x,g.y,s,t,g.walk);
      if(!A.struck && t>=tS+1.05){ A.struck=true; A.struckAt=t; hit('GNOMED!','gnomed'); } };
    return A;
  },
  /* coaster — three donkeys ride a loop-the-loop */
  coaster({W,H,hit}){
    const A = {dur:9, struck:false, struckAt:0}; SFX.clack(); const R=Math.min(H*0.3, W*0.2), cx=W*0.5, cy=H*0.46, gy=cy+R, ground=H*0.92;
    const L1=cx+220, L2=2*Math.PI*R, L3=W+220-cx; const trail=[]; let pass2=false;
    const pos=d=>{ if(d<L1) return {x:-220+d, y:gy, a:0}; if(d<L1+L2){ const th=Math.PI/2-2*Math.PI*(d-L1)/L2; return {x:cx+R*Math.cos(th), y:cy+R*Math.sin(th), a:Math.atan2(-Math.cos(th), Math.sin(th))}; } return {x:cx+(d-L1-L2), y:gy, a:0}; };
    const dist=(t,t0,k)=>{ const u=(t-t0)/k; if(u<0) return -1; if(u<1) return L1*u; if(u<2.3) return L1+L2*(u-1)/1.3; if(u<3.0) return L1+L2+L3*(u-2.3)/0.7; return -1; };
    // rider torso+head and the car body are static → two sprites (all three riders share one); the waving arms and screaming mouth stay live
    const RS=R*0.2*1.35, riderSp=SPR.shape(-RS*0.45,-RS*1.65,RS*0.9,RS*0.15,g=>{ const s=RS; g.strokeStyle=C.ink; g.lineWidth=3; g.lineCap='round';
      g.fillStyle='#2E6FE0'; SPR.rr(g,-s*0.4,-s*0.6,s*0.8,s*0.7,s*0.2); g.fill(); g.stroke();
      // head (donkey, facing right)
      g.beginPath(); g.moveTo(-s*0.05,-s*0.5); g.lineTo(s*0.2,-s*1.0); g.lineTo(s*0.45,-s*0.9); g.lineTo(s*0.25,-s*0.35); g.closePath(); g.fill(); g.stroke();
      SPR.rr(g,s*0.1,-s*1.2,s*0.75,s*0.5,s*0.15); g.fill(); g.stroke();
      g.fillStyle='#FFE34D'; for(const ex of [s*0.15,s*0.4]){ g.beginPath(); g.moveTo(ex,-s*1.15); g.lineTo(ex+s*0.1,-s*1.6); g.lineTo(ex+s*0.22,-s*1.15); g.closePath(); g.fill(); g.stroke(); }
      g.fillStyle='#fff'; g.beginPath(); g.arc(s*0.65,-s*1.02,s*0.11,0,7); g.fill(); g.fillStyle=C.ink; g.beginPath(); g.arc(s*0.68,-s*1.0,s*0.05,0,7); g.fill(); g.lineCap='butt'; },12);
    const CS=R*0.2, carSp=SPR.shape(-CS*2.35,-CS*1.2,CS*2.35,CS*0.25,g=>{ const s=CS; g.fillStyle='#F0562A'; g.strokeStyle=C.ink; g.lineWidth=4; SPR.rr(g,-s*2.3,-s*1.15,s*4.6,s*1.05,s*0.3); g.fill(); g.stroke(); g.fillStyle='#FFE34D'; g.fillRect(-s*2.1,-s*0.75,s*4.2,s*0.22);
      g.fillStyle=C.ink; for(const wx of [-s*1.5,0,s*1.5]){ g.beginPath(); g.arc(wx,-s*0.1,s*0.28,0,7); g.fill(); } },6);
    const rider=(x,y,s,t)=>{ ctx.save(); ctx.translate(x,y); ctx.fillStyle='#2E6FE0'; ctx.strokeStyle=C.ink; ctx.lineWidth=3; ctx.lineCap='round';
      // arms up!
      for(const d of [-1,1]){ ctx.beginPath(); ctx.moveTo(d*s*0.3,-s*0.4); ctx.lineTo(d*s*0.7,-s*1.3+Math.sin(t*20+d)*s*0.08); ctx.lineWidth=s*0.16; ctx.strokeStyle='#2E6FE0'; ctx.stroke(); ctx.lineWidth=3; ctx.strokeStyle=C.ink; ctx.beginPath(); ctx.arc(d*s*0.7,-s*1.3+Math.sin(t*20+d)*s*0.08,s*0.12,0,7); ctx.fillStyle=C.ink; ctx.fill(); }
      riderSp.draw(0,0);
      // open mouth (screaming)
      ctx.fillStyle=C.ink; ctx.beginPath(); ctx.ellipse(s*0.72,-s*0.8,s*0.07,s*0.05+Math.abs(Math.sin(t*25))*s*0.03,0,0,7); ctx.fill();
      ctx.restore(); };
    const car=(p,t)=>{ ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.a); const s=R*0.2;
      for(const hx of [-s*1.45,0,s*1.45]) rider(hx,-s*0.9,s*1.35,t+hx);
      carSp.draw(0,0);
      ctx.restore(); };
    A.frame = t=>{
      // supports
      ctx.strokeStyle=C.ink; ctx.lineWidth=5; ctx.globalAlpha=0.5; ctx.beginPath(); for(let x=W*0.08;x<W;x+=W*0.14){ ctx.moveTo(x,gy); ctx.lineTo(x,ground); } ctx.moveTo(cx-R,cy); ctx.lineTo(cx-R*1.25,ground); ctx.moveTo(cx+R,cy); ctx.lineTo(cx+R*1.25,ground); ctx.moveTo(cx-R*0.7,cy-R*0.7); ctx.lineTo(cx-R*1.25,ground); ctx.moveTo(cx+R*0.7,cy-R*0.7); ctx.lineTo(cx+R*1.25,ground); ctx.stroke(); ctx.globalAlpha=1;
      ctx.fillStyle=C.ink; ctx.globalAlpha=0.15; ctx.fillRect(0,ground,W,H*0.012); ctx.globalAlpha=1;
      // track: ties, then rails
      ctx.strokeStyle=C.ink; ctx.lineWidth=4; ctx.beginPath(); for(let d=0; d<L1+L2+L3; d+=R*0.16){ const p=pos(d); const nx=-Math.sin(p.a), ny=Math.cos(p.a); ctx.moveTo(p.x-nx*R*0.07,p.y-ny*R*0.07); ctx.lineTo(p.x+nx*R*0.07,p.y+ny*R*0.07); } ctx.stroke();
      ctx.beginPath(); for(let d=0; d<L1+L2+L3; d+=8){ const p=pos(d); if(d===0) ctx.moveTo(p.x,p.y); else ctx.lineTo(p.x,p.y); } ctx.strokeStyle=C.ink; ctx.lineWidth=14; ctx.stroke(); ctx.strokeStyle='#F0562A'; ctx.lineWidth=6; ctx.stroke();
      // the car (two passes)
      let d=dist(t,0,1.4); if(d<0 && t>=5.0){ d=dist(t,5.0,1.0); if(!pass2 && d>=0){ pass2=true; SFX.clack(); } }
      // speed lines
      for(const q of trail){ q.a-=0.07; } while(trail.length && trail[0].a<=0) trail.shift();
      if(d>=0){ const p=pos(d); const inLoop = d>L1 && d<L1+L2; const sp = inLoop? 1.3 : 0.9; for(let k=0;k<2;k++){ const nx=-Math.sin(p.a), ny=Math.cos(p.a), off=-R*rr(0.05,0.45); trail.push({x:p.x-Math.cos(p.a)*R*0.5+nx*off, y:p.y-Math.sin(p.a)*R*0.5+ny*off, a:1, ang:p.a, l:R*sp*0.22}); }
        ctx.lineWidth=5; ctx.lineCap='round'; for(const q of trail){ ctx.globalAlpha=q.a*0.8; ctx.strokeStyle='#7FAAF6'; ctx.beginPath(); ctx.moveTo(q.x,q.y); ctx.lineTo(q.x-Math.cos(q.ang)*q.l, q.y-Math.sin(q.ang)*q.l); ctx.stroke(); } ctx.globalAlpha=1;
        car(p,t);
        if(!A.struck && d>=L1+L2*0.5){ A.struck=true; A.struckAt=t; hit('LOOP!','whoosh'); } }
      else { ctx.lineWidth=5; ctx.lineCap='round'; for(const q of trail){ ctx.globalAlpha=q.a*0.8; ctx.strokeStyle='#7FAAF6'; ctx.beginPath(); ctx.moveTo(q.x,q.y); ctx.lineTo(q.x-Math.cos(q.ang)*q.l, q.y-Math.sin(q.ang)*q.l); ctx.stroke(); } ctx.globalAlpha=1; }
    };
    return A;
  },
  /* lasso — the state gets roped and yanked across the screen */
  lasso({W,H,r,hit}){
    const A = {dur:9, struck:false, struckAt:0}; SFX.whirl(); const st=STATES[r.st]||STATES.TX, path=new Path2D(st.d), box=stBox(st);
    const sc=Math.min(H*0.36/box.h, W*0.26/box.w); const sw=box.w*sc, sh=box.h*sc; const x1=W*0.66, x2=W*0.24, sy0=H*0.56; const ax=W*0.09, ay=H*0.33; const dust=[]; const hat={x:W*0.1, y:H*0.27, s:Math.min(W*0.12,H*0.2)};
    const rope=(pts)=>{ ctx.lineCap='round'; ctx.lineJoin='round'; ctx.strokeStyle=C.ink; ctx.lineWidth=11; ctx.stroke(pts); ctx.strokeStyle='#c98a4b'; ctx.lineWidth=6; ctx.stroke(pts); };
    A.frame = t=>{
      // cowboy hat tipping in the corner
      ctx.save(); ctx.translate(hat.x,hat.y); ctx.rotate(Math.sin(t*2.2)*0.35 - 0.2); const s=hat.s; ctx.fillStyle='#c98a4b'; ctx.strokeStyle=C.ink; ctx.lineWidth=5;
      ctx.beginPath(); ctx.ellipse(0,0,s*0.5,s*0.16,0,0,7); ctx.fill(); ctx.stroke(); roundRect(-s*0.25,-s*0.42,s*0.5,s*0.46,s*0.12); ctx.fill(); ctx.stroke(); ctx.fillStyle='#F0562A'; ctx.fillRect(-s*0.26,-s*0.1,s*0.52,s*0.08); ctx.restore();
      // state position
      const yank = A.struck? easeOut(Math.min(1,(t-A.struckAt)/0.55)) : 0; const sx = x1 + (x2-x1)*yank + (A.struck && t-A.struckAt<0.9 ? 0 : 0); const wob = A.struck? Math.sin((t-A.struckAt)*9)*0.18*Math.exp(-(t-A.struckAt)*1.2) : Math.sin(t*3)*0.03; const sy=sy0 - (A.struck? Math.sin(Math.min(1,(t-A.struckAt)/0.55)*Math.PI)*H*0.06 : 0);
      if(A.struck && t-A.struckAt<0.6) for(let i=0;i<6;i++) dust.push({x:sx+sw*0.4+rr(-20,20), y:sy+sh*0.3+rr(-20,20), r:rr(10,28), a:1, vx:rr(1,5), vy:rr(-2,1)});
      for(const d of dust){ d.x+=d.vx; d.y+=d.vy; d.r+=0.8; d.a-=0.014; ctx.globalAlpha=Math.max(0,d.a)*0.6; ctx.fillStyle='#9A978F'; ctx.beginPath(); ctx.arc(d.x,d.y,d.r,0,7); ctx.fill(); } ctx.globalAlpha=1; for(let i=dust.length-1;i>=0;i--) if(dust[i].a<=0) dust.splice(i,1);
      // ground shadow line
      ctx.fillStyle=C.ink; ctx.globalAlpha=0.12; ctx.fillRect(0,sy0+sh*0.55,W,H*0.012); ctx.globalAlpha=1;
      drawState(st,path,box,sx,sy,sc,wob,'#FFE34D'); label(r.st,sx,sy+(A.struck?0:sh*0.08),H*0.06,'#2b2825');
      // worried eyes before the yank
      if(!A.struck){ ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(sx-sw*0.08,sy-sh*0.2,sh*0.07,0,7); ctx.arc(sx+sw*0.08,sy-sh*0.2,sh*0.07,0,7); ctx.fill(); ctx.fillStyle='#2b2825'; ctx.beginPath(); ctx.arc(sx-sw*0.08+Math.sin(t*5)*sh*0.02,sy-sh*0.2-sh*0.02,sh*0.03,0,7); ctx.arc(sx+sw*0.08+Math.sin(t*5)*sh*0.02,sy-sh*0.2-sh*0.02,sh*0.03,0,7); ctx.fill(); }
      // the loop
      let lx, ly, rx, ry, rot;
      if(t<1.2){ const u=ease(t/1.2); lx=sx+Math.sin(t*9)*sw*0.08; ly=-sh*0.5 + (sy-sh*0.9+sh*0.5)*u; rx=sw*0.5+Math.sin(t*9)*sw*0.08; ry=sh*0.25+Math.sin(t*9)*sh*0.1; rot=Math.sin(t*9)*0.4; }
      else if(t<2.1){ const u=(t-1.2)/0.9; lx=sx+Math.cos(u*Math.PI*3)*sw*0.25*(1-u); ly=sy-sh*0.1+Math.sin(u*Math.PI*3)*sh*0.25*(1-u); rx=sw*0.5+sw*0.3*(1-u); ry=sh*0.6+sh*0.3*(1-u); rot=u*Math.PI*0.5; }
      else { const u=easeOut(Math.min(1,(t-2.1)/0.3)); lx=sx; ly=sy-sh*0.05; rx=sw*0.62-sw*0.08*u; ry=sh*0.62-sh*0.08*u; rot=0; }
      const loop=new Path2D(); loop.ellipse(lx,ly,rx,ry,rot,0,Math.PI*2); rope(loop);
      // the rope from the anchor to the loop, with slack before the yank
      const line=new Path2D(); const kx=lx-Math.cos(rot)*rx, ky=ly-Math.sin(rot)*rx; const slack = A.struck? 20 : 160+Math.sin(t*4)*40; line.moveTo(ax,ay); line.quadraticCurveTo((ax+kx)/2, Math.max(ay,ky)+slack, kx, ky); rope(line);
      if(!A.struck && t>=2.4){ A.struck=true; A.struckAt=t; hit('YEEHAW!','yeehaw'); } };
    return A;
  },
  /* piano — a grand piano falls from the sky */
  piano({W,H,hit,shake}){
    const A = {dur:9, struck:false, struckAt:0}; SFX.whistle(); const PW=Math.min(W*0.4, H*0.72), BH=PW*0.3, LH=PW*0.22, px=W*0.5, floor=H*0.86; const bits=[]; const cracks=[]; let lidOn=true, keysOn=true;
    const fall=t=>{ const u=Math.min(1,t/1.6); return -PW*0.9 + (floor+PW*0.9)*u*u; };
    const piano=(x,y,sq,t)=>{ ctx.save(); ctx.translate(x,y); ctx.scale(1+sq*0.25, 1-sq*0.3); ctx.strokeStyle=C.ink; ctx.lineWidth=5; ctx.fillStyle='#2b2825';
      for(const lx of [-PW*0.42, 0, PW*0.42]){ roundRect(lx-PW*0.03,-LH,PW*0.06,LH,PW*0.015); ctx.fill(); ctx.stroke(); }
      if(lidOn){ const hx=-PW*0.47, hy=-LH-BH; const ang=-0.42, len=PW*0.85; const ex=hx+Math.cos(ang)*len, ey=hy+Math.sin(ang)*len;
        ctx.fillStyle='#c98a4b'; ctx.beginPath(); ctx.moveTo(hx,hy); ctx.lineTo(ex,ey); ctx.lineTo(PW*0.47,hy); ctx.closePath(); ctx.fill();
        ctx.strokeStyle=C.ink; ctx.lineWidth=5; ctx.beginPath(); ctx.moveTo(PW*0.25,hy); ctx.lineTo(hx+Math.cos(ang)*len*0.72, hy+Math.sin(ang)*len*0.72); ctx.stroke();
        ctx.save(); ctx.translate(hx,hy); ctx.rotate(ang); ctx.fillStyle='#2b2825'; roundRect(0,-PW*0.045,len,PW*0.045,PW*0.015); ctx.fill(); ctx.stroke(); ctx.restore(); }
      ctx.fillStyle='#2b2825'; roundRect(-PW/2,-LH-BH,PW,BH,PW*0.04); ctx.fill(); ctx.stroke();
      if(!lidOn){ ctx.fillStyle='#c98a4b'; roundRect(-PW*0.46,-LH-BH*0.95,PW*0.92,BH*0.35,PW*0.02); ctx.fill(); ctx.strokeStyle='#2b2825'; ctx.lineWidth=3; ctx.beginPath(); for(let i=0;i<9;i++){ ctx.moveTo(-PW*0.42+i*PW*0.1,-LH-BH*0.92); ctx.lineTo(-PW*0.38+i*PW*0.1,-LH-BH*0.63); } ctx.stroke(); ctx.strokeStyle=C.ink; ctx.lineWidth=5; }
      if(keysOn){ const kx=-PW*0.45, kw=PW*0.9, ky=-LH-BH*0.5, kh=BH*0.32; ctx.fillStyle='#fff'; ctx.fillRect(kx,ky,kw,kh); ctx.strokeStyle='#2b2825'; ctx.lineWidth=2; const n=24; ctx.beginPath(); for(let i=1;i<n;i++){ ctx.moveTo(kx+i*kw/n,ky); ctx.lineTo(kx+i*kw/n,ky+kh); } ctx.stroke(); ctx.fillStyle='#2b2825'; for(let i=0;i<n-1;i++){ if(i%7===2||i%7===6) continue; ctx.fillRect(kx+(i+1)*kw/n-kw/n*0.22, ky, kw/n*0.44, kh*0.6); } ctx.strokeStyle=C.ink; ctx.lineWidth=3; ctx.strokeRect(kx,ky,kw,kh); }
      ctx.fillStyle='#FFE34D'; ctx.font=`900 ${Math.round(BH*0.35)}px Archivo, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('D', 0, keysOn? -LH-BH*0.82 : -LH-BH*0.35);
      ctx.restore(); };
    A.frame = t=>{
      const y = A.struck? floor : fall(t); const u=Math.min(1,t/1.6);
      // shadow grows as it comes down
      if(!A.struck){ ctx.fillStyle=C.ink; ctx.globalAlpha=0.05+u*0.15; ctx.beginPath(); ctx.ellipse(px,floor,PW*0.2+PW*0.35*u,PW*0.04+PW*0.06*u,0,0,7); ctx.fill(); ctx.globalAlpha=1; }
      ctx.fillStyle=C.ink; ctx.globalAlpha=0.12; ctx.fillRect(0,floor,W,H*0.012); ctx.globalAlpha=1;
      // whoosh lines above the falling piano
      if(!A.struck && t>0.3){ ctx.strokeStyle='#7FAAF6'; ctx.lineWidth=4; ctx.lineCap='round'; ctx.beginPath(); for(let i=0;i<7;i++){ const lx=px-PW*0.45+i*PW*0.15, ly=y-LH-BH-PW*0.5-rr(0,60); ctx.moveTo(lx,ly); ctx.lineTo(lx,ly-PW*0.25*u); } ctx.stroke(); }
      // cracks in the floor
      if(cracks.length){ ctx.strokeStyle=C.ink; ctx.lineWidth=4; ctx.lineJoin='round'; ctx.beginPath(); for(const c of cracks){ ctx.moveTo(px,floor); let x=px,yy=floor; for(const [dx,dy] of c){ x+=dx; yy+=dy; ctx.lineTo(x,yy); } } ctx.stroke(); }
      const sq = A.struck? Math.max(0, Math.sin(Math.min(1,(t-A.struckAt)/0.5)*Math.PI))*0.6 : 0;
      piano(px, y, sq, t);
      // flying lid / keys
      for(const b of bits){ b.vy+=0.8; b.x+=b.vx; b.y+=b.vy; b.a+=b.va; if(b.y>floor-4 && b.vy>0){ b.y=floor-4; b.vy*=-0.45; b.vx*=0.8; b.va*=0.7; }
        ctx.save(); ctx.translate(b.x,b.y); ctx.rotate(b.a); ctx.fillStyle=b.c; ctx.strokeStyle=C.ink; ctx.lineWidth=2; if(b.lid){ roundRect(-b.w/2,-b.h/2,b.w,b.h,10); ctx.fill(); ctx.stroke(); ctx.fillStyle='#c98a4b'; ctx.fillRect(-b.w/2+8,-b.h/2+8,b.w-16,b.h*0.3); } else { ctx.fillRect(-b.w/2,-b.h/2,b.w,b.h); ctx.strokeRect(-b.w/2,-b.h/2,b.w,b.h); } ctx.restore(); }
      // musical notes rising after the crash
      if(A.struck && t<A.struckAt+3){ ctx.fillStyle=C.ink; ctx.font=`900 ${Math.round(H*0.06)}px Archivo, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; for(let i=0;i<6;i++){ const age=(t-A.struckAt)*0.6+i*0.17; const a=Math.max(0,1-(age%1)); ctx.globalAlpha=a; ctx.fillText(i%2?'♪':'♫', px+(i-2.5)*PW*0.22 + Math.sin(age*6)*20, floor-LH-BH-(age%1)*H*0.35); } ctx.globalAlpha=1; }
      if(!A.struck && t>=1.6){ A.struck=true; A.struckAt=t; hit('PLONK!','plonk'); lidOn=false; keysOn=false;
        bits.push({x:px, y:floor-LH-BH-PW*0.2, vx:rr(5,9), vy:-rr(8,13), a:-0.42, va:rr(-0.16,-0.06), w:PW*0.85, h:PW*0.06, c:'#2b2825', lid:true});
        for(let i=0;i<34;i++){ const blk=i%3===0; bits.push({x:px-PW*0.45+i*PW*0.9/34, y:floor-LH-BH*0.4, vx:rr(-16,16), vy:-rr(6,24), a:rr(0,6), va:rr(-0.3,0.3), w:blk? PW*0.02 : PW*0.035, h:blk? BH*0.2 : BH*0.32, c:blk? '#2b2825':'#fff'}); }
        for(let k=0;k<8;k++){ const c=[]; const dir=k<4?-1:1; for(let j=0;j<5;j++) c.push([dir*rr(70,150), rr(-14,14)+(k%2?6:-6)*j*0.5]); cracks.push(c); } }
      if(A.struck && t<A.struckAt+1 && Math.random()<0.2) shake(); };
    return A;
  }
});
KINDS.push('elevator','gnomes','coaster','lasso','piano');
})();


/* ===== round 3, part 6 ===== */
/* anims-extra/part6.js — zamboni, kaiju, carwash, popcorn, skydive
   Same contract as anims.js. Self-contained: every helper used here is defined in this file. */
(function(){
const ease = u => u<=0? 0 : u>=1? 1 : u*u*(3-2*u);
const easeOut = u => u<=0? 0 : u>=1? 1 : 1-Math.pow(1-u,3);
const clamp01 = u => u<0? 0 : u>1? 1 : u;
// bounding box of a state's SVG path (viewBox 975x610) so we can centre/scale it by its real extent
const stBox = st => { const n=(st.d.match(/-?\d+(\.\d+)?/g)||[]).map(Number); let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9; for(let i=0;i+1<n.length;i+=2){ x0=Math.min(x0,n[i]); x1=Math.max(x1,n[i]); y0=Math.min(y0,n[i+1]); y1=Math.max(y1,n[i+1]); } if(x1<x0){ x0=st.c[0]-120; x1=st.c[0]+120; y0=st.c[1]-120; y1=st.c[1]+120; } return {w:x1-x0, h:y1-y0, cx:(x0+x1)/2, cy:(y0+y1)/2}; };
// draw the state silhouette centred on (x,y) at scale sc, rotated rot, filled with fill (optional extra x/y squash)
const drawState = (st,path,box,x,y,sc,rot,fill,sx,sy) => { ctx.save(); ctx.translate(x,y); ctx.rotate(rot||0); ctx.scale(sc*(sx||1),sc*(sy||1)); ctx.translate(-box.cx,-box.cy); ctx.fillStyle=fill; ctx.strokeStyle=C.ink; ctx.lineWidth=4/sc; ctx.fill(path); ctx.stroke(path); ctx.restore(); };
const label = (txt,x,y,px,col) => { ctx.fillStyle=col||C.ink; ctx.font=`900 ${Math.round(px)}px Archivo, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(txt,x,y); };
const mix = (a,b,u) => { u=clamp01(u); const pa=parseInt(a.slice(1),16), pb=parseInt(b.slice(1),16); const ch=s=>Math.round(((pa>>s)&255)*(1-u)+((pb>>s)&255)*u); return `rgb(${ch(16)},${ch(8)},${ch(0)})`; };
/* the party donkey (faces right; origin = centre of the body; s = half body length ≈ body height). o: {flip, rot, legs(ph), hat, lw} */
const donkey = (x,y,s,o) => { o=o||{}; ctx.save(); ctx.translate(x,y); if(o.rot) ctx.rotate(o.rot); if(o.flip) ctx.scale(-1,1);
  ctx.fillStyle='#2E6FE0'; ctx.strokeStyle=C.ink; ctx.lineWidth=o.lw||4;
  // tail
  ctx.lineWidth=(o.lw||4)*1.4; ctx.beginPath(); ctx.moveTo(-s*0.9,-s*0.3); ctx.quadraticCurveTo(-s*1.4,-s*0.1,-s*1.2,s*0.3); ctx.stroke(); ctx.lineWidth=o.lw||4;
  // legs
  for(const [lx,d] of [[-s*0.7,1],[-s*0.3,-1],[s*0.3,1],[s*0.7,-1]]){ const a = o.legs!=null? Math.sin(o.legs+lx/s*3)*0.55*d : (o.dangle!=null? Math.sin(o.dangle+lx/s)*0.35 : 0); ctx.translate(lx,s*0.4); ctx.rotate(a); ctx.fillRect(-s*0.09,0,s*0.18,s*0.5); ctx.strokeRect(-s*0.09,0,s*0.18,s*0.5); ctx.rotate(-a); ctx.translate(-lx,-s*0.4); }
  // body, neck, head
  roundRect(-s*0.9,-s*0.45,s*1.8,s*0.9,s*0.3); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(s*0.8,-s*0.4); ctx.lineTo(s*1.25,-s*0.95); ctx.lineTo(s*1.5,-s*0.8); ctx.lineTo(s*1.05,-s*0.2); ctx.closePath(); ctx.fill(); ctx.stroke();
  roundRect(s*1.15,-s*1.15,s*0.75,s*0.5,s*0.15); ctx.fill(); ctx.stroke();
  // ears
  ctx.fillStyle='#FFE34D'; for(const ex of [s*1.2,s*1.45]){ ctx.beginPath(); ctx.moveTo(ex,-s*1.1); ctx.lineTo(ex+s*0.1,-s*1.55); ctx.lineTo(ex+s*0.22,-s*1.1); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  if(o.hat){ ctx.fillStyle=o.hat; roundRect(s*1.1,-s*1.3,s*0.85,s*0.22,s*0.08); ctx.fill(); ctx.stroke(); }
  // eye (+ optional grin)
  ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(s*1.7,-s*0.98,s*0.11,0,7); ctx.fill(); ctx.fillStyle=C.ink; ctx.beginPath(); ctx.arc(s*1.73+(o.look||0)*s*0.03,-s*0.97,s*0.05,0,7); ctx.fill();
  if(o.grin){ ctx.strokeStyle=C.ink; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(s*1.7,-s*0.78,s*0.12,0.2,Math.PI-0.2); ctx.stroke(); }
  ctx.restore(); };

/* ---------- sounds ---------- */
SFX.zamboniHum = function(){ for(let i=0;i<22;i++) tone(62+Math.sin(i*0.9)*6, i*0.11, 0.12, 'sawtooth', 0.1, 58); tone(1100, 0.2, 0.12, 'square', 0.08); tone(1100, 0.45, 0.12, 'square', 0.08); };
SFX.goalHorn = function(){ noise(0, 0.08, 0.8, 2500); tone(180, 0, 0.1, 'square', 0.3, 60); for(const [f,v] of [[233,0.2],[311,0.16],[466,0.12],[235,0.1]]) tone(f, 0.12, 2.2, 'sawtooth', v, f*0.99); for(let i=0;i<6;i++) tone(880, 0.1+i*0.25, 0.12, 'square', 0.1, 1200); cheer(0.5); };
SFX.kaijuStomp = function(){ noise(0, 0.25, 0.7, 300); tone(48, 0, 0.3, 'sine', 0.6, 30); };
SFX.kaijuRoar = function(){ tone(95, 0, 1.4, 'sawtooth', 0.4, 45); tone(140, 0.05, 1.3, 'square', 0.18, 60); noise(0, 1.4, 0.5, 700); for(let i=0;i<8;i++) tone(2200+Math.random()*1800, 0.2+i*0.09, 0.08, 'square', 0.08, 300); for(let i=0;i<5;i++) noise(0.3+i*0.2, 0.06, 0.5, 6000); cheer(0.8); };
SFX.washStart = function(){ noise(0, 2.0, 0.18, 900); for(let i=0;i<12;i++){ tone(220+Math.random()*120, i*0.17, 0.12, 'triangle', 0.07, 180); noise(0.2+i*0.15, 0.05, 0.2, 3000); } };
SFX.squeaky = function(){ tone(1500, 0, 0.18, 'sine', 0.25, 2600); tone(2600, 0.18, 0.2, 'sine', 0.22, 1700); tone(1700, 0.38, 0.25, 'sine', 0.2, 3000); for(let i=0;i<10;i++) tone(2000+Math.random()*2500, 0.5+i*0.06, 0.25, 'sine', 0.06); cheer(0.4); };
SFX.sizzle = function(){ noise(0, 2.6, 0.12, 2500); tone(70, 0, 2.6, 'sawtooth', 0.04, 65); };
SFX.kpop = function(){ tone(500+Math.random()*700, 0, 0.05, 'square', 0.12, 150); noise(0, 0.03, 0.25, 4000); };
SFX.bigPop = function(){ noise(0, 0.5, 1.0, 900); tone(160, 0, 0.3, 'square', 0.45, 45); tone(900, 0.02, 0.12, 'sine', 0.2, 300); for(let i=0;i<30;i++){ tone(600+Math.random()*1000, 0.1+i*0.04, 0.05, 'square', 0.1, 200); } cheer(0.4); };
SFX.propPlane = function(){ for(let i=0;i<40;i++) tone(85+Math.sin(i*0.7)*8, i*0.05, 0.06, 'sawtooth', 0.09, 80); };
SFX.chuteSnap = function(){ noise(0, 0.25, 0.7, 1800); tone(420, 0, 0.12, 'triangle', 0.2, 180); noise(0.08, 0.3, 0.3, 900); };
SFX.bullseye = function(){ noise(0, 0.2, 0.6, 600); tone(90, 0, 0.25, 'sine', 0.5, 40); [784,988,1175,1568].forEach((f,i)=>tone(f, 0.15+i*0.1, 0.5, 'triangle', 0.2)); tone(1568, 0.6, 1.0, 'sine', 0.25); cheer(0.5); };

Object.assign(ANIMS, {
  /* zamboni — resurfaces the rink, then the state (a puck) gets slapshotted into the net; red light spins */
  zamboni({W,H,r,hit,shake}){
    const A = {dur:9, struck:false, struckAt:0}; SFX.zamboniHum();
    const st=STATES[r.st]||STATES.TX, path=new Path2D(st.d), box=stBox(st);
    const rx=W*0.05, ry=H*0.3, rw=W*0.9, rh=H*0.55, rad=rh*0.28; const laneY=ry+rh*0.72; // lower lane = zamboni's run
    const ZW=Math.min(W*0.24,440), ZH=ZW*0.5; const zx0=rx-ZW*1.2, zx1=rx+rw+ZW*0.9; const S=Math.min(H*0.11,125);
    const puckY=ry+rh*0.33; const sc=Math.min(H*0.19/box.h, W*0.15/box.w); let puckX=W*0.44; const gx=rx+rw*0.88, GW=rw*0.08, GH=rh*0.3; // goal
    const px=W*0.24; const trail=[]; let netBulge=0;
    const rinkPath=()=>roundRect(rx,ry,rw,rh,rad);
    const zamboni=(x,y,t)=>{ ctx.save(); ctx.translate(x,y); ctx.strokeStyle=C.ink; ctx.lineWidth=5;
      // ice-scraper roller at the back (left), hopper on top, cab at front
      ctx.fillStyle='#FFE34D'; roundRect(-ZW*0.62,-ZH*0.25,ZW*0.18,ZH*0.5,ZH*0.1); ctx.fill(); ctx.stroke(); ctx.fillStyle=C.ink; for(let i=0;i<4;i++) ctx.fillRect(-ZW*0.6,-ZH*0.22+((i*ZH*0.13+t*ZH*0.6)%(ZH*0.46)),ZW*0.14,ZH*0.04);
      ctx.fillStyle='#2E6FE0'; roundRect(-ZW*0.5,-ZH*0.5,ZW,ZH*0.62,ZH*0.14); ctx.fill(); ctx.stroke(); roundRect(-ZW*0.45,-ZH*1.05,ZW*0.55,ZH*0.6,ZH*0.12); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#7FAAF6'; roundRect(ZW*0.12,-ZH*0.95,ZW*0.34,ZH*0.5,ZH*0.1); ctx.fill(); ctx.stroke(); ctx.fillStyle='#fff'; ctx.fillRect(ZW*0.16,-ZH*0.9,ZW*0.26,ZH*0.28); ctx.strokeRect(ZW*0.16,-ZH*0.9,ZW*0.26,ZH*0.28);
      // driver donkey head in the cab
      ctx.fillStyle='#2E6FE0'; roundRect(ZW*0.19,-ZH*0.88,ZW*0.2,ZH*0.22,ZH*0.06); ctx.fill(); ctx.stroke(); ctx.fillStyle='#FFE34D'; ctx.beginPath(); ctx.moveTo(ZW*0.2,-ZH*0.88); ctx.lineTo(ZW*0.23,-ZH*1.12); ctx.lineTo(ZW*0.26,-ZH*0.88); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(ZW*0.3,-ZH*0.88); ctx.lineTo(ZW*0.33,-ZH*1.12); ctx.lineTo(ZW*0.36,-ZH*0.88); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(ZW*0.35,-ZH*0.8,ZH*0.05,0,7); ctx.fill(); ctx.fillStyle=C.ink; ctx.beginPath(); ctx.arc(ZW*0.36,-ZH*0.8,ZH*0.022,0,7); ctx.fill();
      ctx.fillStyle='#FFE34D'; ctx.font=`900 ${Math.round(ZH*0.26)}px Archivo, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('ZAMBONKEY', -ZW*0.02, -ZH*0.2);
      // wheels
      for(const wx of [-ZW*0.3,ZW*0.28]){ ctx.fillStyle=C.ink; ctx.beginPath(); ctx.arc(wx,ZH*0.14,ZH*0.26,0,7); ctx.fill(); ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(wx,ZH*0.14,ZH*0.1,0,7); ctx.fill(); }
      // beacon
      ctx.fillStyle = Math.floor(t*5)%2? '#F0562A':'#FFE34D'; roundRect(ZW*0.22,-ZH*1.2,ZW*0.1,ZH*0.14,ZH*0.05); ctx.fill(); ctx.stroke(); ctx.restore(); };
    A.frame = t=>{
      const zx = zx0 + (zx1-zx0)*clamp01(t/2.6);
      // rink
      ctx.fillStyle='#DCE8FA'; rinkPath(); ctx.fill(); ctx.strokeStyle=C.ink; ctx.lineWidth=7; ctx.stroke();
      ctx.save(); rinkPath(); ctx.clip();
      ctx.fillStyle='#F0562A'; ctx.fillRect(rx+rw/2-rw*0.006,ry,rw*0.012,rh); ctx.fillStyle='#2E6FE0'; ctx.fillRect(rx+rw*0.3,ry,rw*0.01,rh); ctx.fillRect(rx+rw*0.7,ry,rw*0.01,rh);
      ctx.strokeStyle='#F0562A'; ctx.lineWidth=6; ctx.beginPath(); ctx.arc(rx+rw/2,ry+rh/2,rh*0.22,0,7); ctx.stroke();
      // fresh, gleaming ice behind the zamboni
      ctx.fillStyle='#fff'; ctx.fillRect(rx, laneY-ZH*0.55, Math.max(0,Math.min(zx-ZW*0.6,rx+rw)-rx), ZH*0.95);
      ctx.fillStyle='#7FAAF6'; for(let i=0;i<10;i++){ const sx=rx+rw*(i+0.5)/10; if(sx<zx-ZW*0.6){ const tw=0.5+0.5*Math.sin(t*6+i*2); ctx.fillRect(sx-3,laneY-18*tw,6,36*tw); ctx.fillRect(sx-18*tw,laneY-3,36*tw,6); } }
      ctx.restore();
      // goal + mesh
      ctx.save(); ctx.translate(gx,puckY); ctx.strokeStyle='#F0562A'; ctx.lineWidth=10; ctx.beginPath(); ctx.moveTo(0,-GH/2); ctx.lineTo(GW,-GH/2); ctx.lineTo(GW,GH/2); ctx.lineTo(0,GH/2); ctx.stroke();
      ctx.strokeStyle='rgba(120,120,120,.55)'; ctx.lineWidth=2; ctx.beginPath(); for(let i=1;i<6;i++){ ctx.moveTo(GW*i/6,-GH/2); ctx.lineTo(GW*i/6+netBulge*GW*0.5*(i/6),GH/2); } for(let j=0;j<=6;j++){ ctx.moveTo(0,-GH/2+GH*j/6); ctx.lineTo(GW+netBulge*GW*0.6*Math.sin(j/6*Math.PI),-GH/2+GH*j/6); } ctx.stroke();
      ctx.strokeStyle=C.ink; ctx.lineWidth=4; ctx.strokeRect(0,-GH/2,GW,GH);
      // red light on a pole
      ctx.lineWidth=6; ctx.beginPath(); ctx.moveTo(GW/2,-GH/2); ctx.lineTo(GW/2,-GH*0.95); ctx.stroke();
      if(A.struck){ const a=(t-A.struckAt)*9; ctx.fillStyle='rgba(240,86,42,.45)'; for(const k of [0,Math.PI]){ ctx.beginPath(); ctx.moveTo(GW/2,-GH*0.95); ctx.arc(GW/2,-GH*0.95,H*0.55,a+k-0.25,a+k+0.25); ctx.closePath(); ctx.fill(); } }
      ctx.fillStyle = A.struck && Math.floor(t*10)%2? '#FFE34D' : '#F0562A'; ctx.beginPath(); ctx.arc(GW/2,-GH*0.95,GH*0.16,0,7); ctx.fill(); ctx.stroke(); ctx.restore();
      // the shot
      if(A.struck){ netBulge = Math.max(0, 1-(t-A.struckAt)*1.2) * Math.abs(Math.sin((t-A.struckAt)*12)); }
      const shot = t>2.85? clamp01((t-2.85)/0.4) : 0; puckX = W*0.44 + (gx+GW*0.6-W*0.44)*easeOut(shot);
      if(shot>0 && shot<1){ ctx.strokeStyle='rgba(46,111,224,.45)'; ctx.lineWidth=8; ctx.beginPath(); for(let i=0;i<3;i++){ ctx.moveTo(puckX-box.w*sc*0.4, puckY+(i-1)*box.h*sc*0.25); ctx.lineTo(puckX-box.w*sc*0.4-W*0.12*(1-shot), puckY+(i-1)*box.h*sc*0.25); } ctx.stroke(); }
      const wob = !A.struck && t<2.85? Math.sin(t*25)*0.03*(t>2.3?1:0) : (A.struck? Math.sin((t-A.struckAt)*40)*0.08*Math.max(0,1-(t-A.struckAt)*1.5) : 0);
      drawState(st,path,box,puckX,puckY,sc,wob,'#2E6FE0'); label(r.st,puckX,puckY,box.h*sc*0.36,'#fff');
      if(!A.struck && shot>=1){ A.struck=true; A.struckAt=t; hit('GOAL!','goalHorn'); }
      // the player: a donkey with a stick winds up (2.3–2.85), swings, then celebrates
      const sw = t<2.3? -0.3 : t<2.85? -0.3-ease((t-2.3)/0.55)*1.6 : t<3.0? -1.9+(t-2.3-0.55)/0.15*2.6 : A.struck? -2.4+Math.sin((t-A.struckAt)*8)*0.3 : 0.7;
      const hop = A.struck? Math.abs(Math.sin((t-A.struckAt)*7))*S*0.4 : 0;
      donkey(px, puckY-S*0.1-hop, S, {hat:'#FFE34D', grin:A.struck, legs:A.struck? t*14 : null});
      ctx.save(); ctx.translate(px+S*1.7,puckY-S*0.7-hop); ctx.rotate(sw); ctx.strokeStyle=C.ink; ctx.lineWidth=S*0.14; ctx.lineCap='round'; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(S*0.5,S*1.6); ctx.stroke(); ctx.strokeStyle='#F0562A'; ctx.lineWidth=S*0.18; ctx.beginPath(); ctx.moveTo(S*0.5,S*1.6); ctx.lineTo(S*1.1,S*1.75); ctx.stroke(); ctx.restore();
      // zamboni on its lap (drawn last so it passes in front of the boards)
      if(zx<zx1) zamboni(zx, laneY, t);
      if(t<2.6 && Math.floor(t*4)!==Math.floor((t-1/60)*4) && Math.floor(t*4)%4===0) shake(); };
    return A;
  },

  /* kaiju — a skyscraper-sized donkey stomps through a tiny skyline holding the state; tanks flee; lightning roar */
  kaiju({W,H,r,hit,shake}){
    const A = {dur:9, struck:false, struckAt:0};
    const st=STATES[r.st]||STATES.TX, path=new Path2D(st.d), box=stBox(st); const gy=H*0.87; const S=Math.min(H*0.2,230); const sc=Math.min(H*0.18/box.h, W*0.15/box.w);
    const cols=['#7FAAF6','#BBD0F5','#8C8A84','#7FAAF6']; const blds=[]; for(let i=0;i<22;i++){ const w=W*rr(0.03,0.055); blds.push({x:W*0.02+i*(W*0.96/22)+rr(-10,10), w, h:H*rr(0.07,0.26), c:cols[i%4], crush:0, win:Math.floor(rr(2,4))}); }
    const tanks=[0,1,2,3].map(i=>({x:W*(0.55+i*0.12), v:0, sz:Math.min(W*0.045,80)})); const shells=[]; let lastStep=-1, stopX=W*0.5;
    const kx=t=> t<2.6? -S*1.5 + (stopX+S*1.5)*(t/2.6) : t<7? stopX : stopX + (t-7)*(W*0.5+S*2)/2;
    const bolt=(x0,y0,x1,y1,t)=>{ const n=9; ctx.lineJoin='round'; for(const [lw,col] of [[S*0.1,C.ink],[S*0.06,'#FFE34D'],[S*0.02,'#fff']]){ ctx.strokeStyle=col; ctx.lineWidth=lw; ctx.beginPath(); ctx.moveTo(x0,y0); for(let i=1;i<n;i++){ const u=i/n; const jit=Math.sin(t*60+i*5.1)*S*0.22*(i%2?1:-1); ctx.lineTo(x0+(x1-x0)*u, y0+(y1-y0)*u+jit); } ctx.lineTo(x1,y1); ctx.stroke(); } };
    const kaiju=(x,t,roar)=>{ const ph=t*7.5; const bob=Math.abs(Math.sin(ph))*S*0.08; const walking = t<2.6 || t>7; ctx.save(); ctx.translate(x,gy-bob); ctx.strokeStyle=C.ink; ctx.lineWidth=7;
      // legs (stomp)
      ctx.fillStyle='#2E6FE0'; for(const [lx,d] of [[-S*0.32,1],[S*0.22,-1]]){ const a = walking? Math.sin(ph)*0.35*d : (roar? Math.sin(t*20)*0.05 : 0); ctx.save(); ctx.translate(lx,-S*0.95); ctx.rotate(a); roundRect(-S*0.2,0,S*0.4,S*0.95,S*0.12); ctx.fill(); ctx.stroke(); roundRect(-S*0.26,S*0.8,S*0.62,S*0.18,S*0.08); ctx.fill(); ctx.stroke(); ctx.restore(); }
      // back fins
      ctx.fillStyle='#FFE34D'; for(let i=0;i<4;i++){ const fy=-S*1.0-i*S*0.32; ctx.beginPath(); ctx.moveTo(-S*0.42,fy); ctx.lineTo(-S*0.85,fy-S*0.18); ctx.lineTo(-S*0.42,fy-S*0.34); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      // tail
      ctx.fillStyle='#2E6FE0'; ctx.beginPath(); ctx.moveTo(-S*0.4,-S*1.0); ctx.quadraticCurveTo(-S*1.2,-S*0.6,-S*1.5+Math.sin(t*3)*S*0.1,-S*0.1); ctx.quadraticCurveTo(-S*1.0,-S*0.5,-S*0.4,-S*0.7); ctx.closePath(); ctx.fill(); ctx.stroke();
      // body
      roundRect(-S*0.5,-S*2.35,S*1.0,S*1.5,S*0.3); ctx.fill(); ctx.stroke(); ctx.fillStyle='#7FAAF6'; roundRect(-S*0.28,-S*2.0,S*0.56,S*1.0,S*0.2); ctx.fill(); ctx.stroke();
      // arms: left arm down, right arm raised holding the state
      ctx.fillStyle='#2E6FE0'; ctx.save(); ctx.translate(-S*0.35,-S*2.1); ctx.rotate(0.5+Math.sin(t*4)*0.15); roundRect(-S*0.1,0,S*0.2,S*0.6,S*0.08); ctx.fill(); ctx.stroke(); ctx.restore();
      ctx.save(); ctx.translate(S*0.42,-S*2.15); ctx.rotate(-2.2+Math.sin(t*4)*0.1); roundRect(-S*0.1,0,S*0.2,S*0.7,S*0.08); ctx.fill(); ctx.stroke(); ctx.restore();
      // neck + head
      ctx.beginPath(); ctx.moveTo(S*0.1,-S*2.3); ctx.lineTo(S*0.5,-S*2.95); ctx.lineTo(S*0.85,-S*2.8); ctx.lineTo(S*0.45,-S*2.15); ctx.closePath(); ctx.fill(); ctx.stroke();
      roundRect(S*0.35,-S*3.15,S*0.95,S*0.5,S*0.15); ctx.fill(); ctx.stroke();
      // jaw (opens on the roar)
      ctx.save(); ctx.translate(S*0.5,-S*2.7); ctx.rotate(roar? 0.55+Math.sin(t*30)*0.05 : 0.05); roundRect(0,0,S*0.78,S*0.2,S*0.06); ctx.fill(); ctx.stroke(); ctx.fillStyle='#fff'; for(let i=0;i<5;i++){ ctx.beginPath(); ctx.moveTo(S*0.12+i*S*0.13,0); ctx.lineTo(S*0.18+i*S*0.13,S*0.1); ctx.lineTo(S*0.24+i*S*0.13,0); ctx.fill(); } ctx.restore();
      // ears, eye
      ctx.fillStyle='#FFE34D'; for(const ex of [S*0.45,S*0.75]){ ctx.beginPath(); ctx.moveTo(ex,-S*3.1); ctx.lineTo(ex+S*0.12,-S*3.65); ctx.lineTo(ex+S*0.28,-S*3.1); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      ctx.fillStyle = roar? '#F0562A' : '#fff'; ctx.beginPath(); ctx.arc(S*1.05,-S*2.95,S*0.13,0,7); ctx.fill(); ctx.stroke(); ctx.fillStyle=C.ink; ctx.beginPath(); ctx.arc(S*1.08,-S*2.94,S*0.06,0,7); ctx.fill();
      ctx.restore();
      return {mouth:[x+S*1.25, gy-bob-S*2.55], hand:[x+S*0.42+Math.cos(-2.2+Math.PI/2)*S*0.7, gy-bob-S*2.15+Math.sin(-2.2+Math.PI/2)*S*0.7]}; };
    SFX.kaijuStomp();
    A.frame = t=>{
      const x=kx(t); const roar = A.struck && t<A.struckAt+1.7;
      // searchlights
      ctx.fillStyle='rgba(255,227,77,.18)'; for(const [bx,ph] of [[W*0.12,0],[W*0.88,2]]){ const a=Math.sin(t*1.1+ph)*0.6; ctx.beginPath(); ctx.moveTo(bx,gy); ctx.lineTo(bx+Math.sin(a)*H-W*0.05,-10); ctx.lineTo(bx+Math.sin(a)*H+W*0.05,-10); ctx.closePath(); ctx.fill(); }
      // ground
      ctx.fillStyle='rgba(140,138,132,.35)'; ctx.fillRect(0,gy,W,H-gy); ctx.strokeStyle=C.ink; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(0,gy); ctx.lineTo(W,gy); ctx.stroke();
      // skyline (buildings crush under the kaiju)
      for(const b of blds){ const cx=b.x+b.w/2; if(Math.abs(cx-x)<S*0.5 && b.crush<1){ b.crush=Math.min(1,b.crush+0.12); }
        const h=b.h*(1-0.88*b.crush); ctx.fillStyle=b.c; ctx.fillRect(b.x,gy-h,b.w,h); ctx.strokeRect(b.x,gy-h,b.w,h);
        if(b.crush<0.5){ ctx.fillStyle='#FFE34D'; const ww=b.w/(b.win*2+1); for(let i=0;i<b.win;i++) for(let j=0;j*ww*2.2<h-ww*2;j++) ctx.fillRect(b.x+ww*(1+i*2), gy-h+ww*(1+j*2.2), ww, ww*1.3); }
        else { ctx.fillStyle='#8C8A84'; ctx.fillRect(b.x-b.w*0.2,gy-h-8,b.w*0.4,8); ctx.fillRect(b.x+b.w*0.7,gy-h-6,b.w*0.5,6); ctx.strokeRect(b.x-b.w*0.2,gy-h-8,b.w*0.4,8); } }
      // tanks flee to the right, lobbing hopeless shells
      for(const tk of tanks){ const sz=tk.sz; if(x>tk.x-W*0.45) tk.v=Math.min(tk.v+0.4, W/160); tk.x+=tk.v; if(tk.x>W+sz*2) tk.x=-sz*2;
        if(tk.x>x+S*0.6 && Math.random()<0.03 && shells.length<20) shells.push({x:tk.x-sz*0.9,y:gy-sz*0.75,vx:-rr(6,10),vy:-rr(6,10)});
        ctx.save(); ctx.translate(tk.x,gy); ctx.fillStyle='#8C8A84'; ctx.strokeStyle=C.ink; ctx.lineWidth=3; roundRect(-sz,-sz*0.5,sz*2,sz*0.5,sz*0.2); ctx.fill(); ctx.stroke(); roundRect(-sz*0.5,-sz*0.85,sz*0.9,sz*0.4,sz*0.12); ctx.fill(); ctx.stroke(); ctx.lineWidth=sz*0.12; ctx.beginPath(); ctx.moveTo(-sz*0.4,-sz*0.7); ctx.lineTo(-sz*1.3,-sz*0.85); ctx.stroke();
        ctx.fillStyle=C.ink; for(let i=0;i<5;i++) ctx.fillRect(-sz*0.9+i*sz*0.4+((tk.v*t*3)%(sz*0.4)),-sz*0.12,sz*0.16,sz*0.12);
        if(tk.v>0){ ctx.fillStyle='#F0562A'; ctx.font=`900 ${Math.round(sz*0.6)}px Archivo, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('!',0,-sz*1.25); } ctx.restore(); }
      for(let i=shells.length-1;i>=0;i--){ const s=shells[i]; s.vy+=0.35; s.x+=s.vx; s.y+=s.vy; ctx.fillStyle='#FFE34D'; ctx.beginPath(); ctx.arc(s.x,s.y,7,0,7); ctx.fill(); ctx.strokeStyle=C.ink; ctx.lineWidth=2; ctx.stroke(); if(s.y>gy||s.x<-20) shells.splice(i,1); }
      // the monster
      const K = kaiju(x,t,roar);
      // the state held aloft
      const hx=K.hand[0], hy=K.hand[1]-box.h*sc*0.35; drawState(st,path,box,hx,hy,sc,Math.sin(t*4)*0.08,'#FFE34D'); label(r.st,hx,hy,box.h*sc*0.3);
      // lightning tongue
      if(roar){ bolt(K.mouth[0],K.mouth[1],W+S,K.mouth[1]-H*0.15+Math.sin(t*9)*H*0.1,t); }
      // stomps
      const walking = t<2.6 || t>7; const stepN=Math.floor(t*7.5/Math.PI); if(walking && stepN!==lastStep && x<W+S){ lastStep=stepN; SFX.kaijuStomp(); shake(); }
      if(!A.struck && t>=2.6){ A.struck=true; A.struckAt=t; hit('RAWR!','kaijuRoar'); } };
    return A;
  },

  /* carwash — the muddy red state rolls through a car wash and comes out gleaming blue */
  carwash({W,H,r,hit}){
    const A = {dur:9, struck:false, struckAt:0}; SFX.washStart();
    const st=STATES[r.st]||STATES.TX, path=new Path2D(st.d), box=stBox(st); const sc=Math.min(H*0.34/box.h, W*0.22/box.w);
    const gy=H*0.8, tx0=W*0.3, tx1=W*0.7, roofY=H*0.29, roofH=H*0.1; const TW=tx1-tx0; const foam=[]; const sparks=[]; const S=Math.min(H*0.08,90);
    const mud=[...Array(12)].map(()=>({x:box.cx+rr(-box.w*0.4,box.w*0.4), y:box.cy+rr(-box.h*0.4,box.h*0.4), r:rr(box.h*0.05,box.h*0.12)}));
    const brush=(x,y,w,h,t,horiz)=>{ ctx.save(); roundRect(x,y,w,h,Math.min(w,h)*0.3); ctx.clip(); ctx.fillStyle='#2E6FE0'; ctx.fillRect(x,y,w,h); ctx.fillStyle='#7FAAF6'; const sp=(horiz?w:h)/7; for(let i=-1;i<9;i++){ const off=((i*sp+t*sp*5)%((horiz?w:h)+sp)); if(horiz) ctx.fillRect(x+off-sp*0.5,y,sp*0.5,h); else ctx.fillRect(x,y+off-sp*0.5,w,sp*0.5); } ctx.restore(); ctx.strokeStyle=C.ink; ctx.lineWidth=5; roundRect(x,y,w,h,Math.min(w,h)*0.3); ctx.stroke(); };
    const star=(x,y,s,a)=>{ ctx.save(); ctx.translate(x,y); ctx.rotate(a); ctx.beginPath(); for(let i=0;i<8;i++){ const R=i%2? s*0.3 : s; const an=i*Math.PI/4; ctx.lineTo(Math.cos(an)*R,Math.sin(an)*R); } ctx.closePath(); ctx.fill(); ctx.restore(); };
    A.frame = t=>{
      // position: approach, crawl through, exit
      const x = t<1.0? -W*0.15 + (tx0+TW*0.1+W*0.15)*ease(t/1.0) : t<2.9? tx0+TW*0.1 + (tx1+W*0.05-tx0-TW*0.1)*((t-1.0)/1.9) : tx1+W*0.05 + (W*0.84-tx1-W*0.05)*easeOut((t-2.9)/0.8);
      const p = clamp01((x-(tx0+TW*0.15))/(TW*0.65)); const y=gy-box.h*sc*0.5-S*0.35;
      // floor + puddle
      ctx.fillStyle='rgba(140,138,132,.3)'; ctx.fillRect(0,gy,W,H-gy); ctx.strokeStyle=C.ink; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(0,gy); ctx.lineTo(W,gy); ctx.stroke();
      ctx.fillStyle='rgba(127,170,246,.45)'; ctx.beginPath(); ctx.ellipse(tx0+TW/2,gy+H*0.05,TW*0.7,H*0.03,0,0,7); ctx.fill();
      // tunnel back wall (light) so the state reads inside it
      ctx.fillStyle='rgba(187,208,245,.35)'; ctx.fillRect(tx0,roofY+roofH,TW,gy-roofY-roofH);
      // water spray at the entrance
      if(t>0.6 && t<3.2){ ctx.strokeStyle='#7FAAF6'; ctx.lineWidth=4; ctx.beginPath(); for(let i=0;i<14;i++){ const sx=tx0+TW*0.12+i*TW*0.03+Math.sin(t*9+i)*6; const sy=roofY+roofH+((t*700+i*97)%(gy-roofY-roofH)); ctx.moveTo(sx,sy); ctx.lineTo(sx,sy+26); } ctx.stroke(); }
      // the state on wheels
      const col = mix('#F0562A','#2E6FE0',p); const wob=Math.sin(t*14)*(p>0&&p<1? 0.02:0);
      drawState(st,path,box,x,y,sc,wob,col);
      if(p<1){ ctx.save(); ctx.translate(x,y); ctx.rotate(wob); ctx.scale(sc,sc); ctx.translate(-box.cx,-box.cy); ctx.clip(path); ctx.globalAlpha=1-p; ctx.fillStyle='#7A4A1E'; for(const m of mud){ ctx.beginPath(); ctx.arc(m.x,m.y,m.r,0,7); ctx.fill(); } ctx.restore(); }
      label(r.st,x,y,box.h*sc*0.3,'#fff');
      for(const wx of [-box.w*sc*0.3, box.w*sc*0.3]){ ctx.save(); ctx.translate(x+wx,gy-S*0.35); ctx.rotate(x/(S*0.35)); ctx.fillStyle=C.ink; ctx.beginPath(); ctx.arc(0,0,S*0.35,0,7); ctx.fill(); ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(0,0,S*0.14,0,7); ctx.fill(); ctx.fillRect(-S*0.03,-S*0.3,S*0.06,S*0.6); ctx.fillRect(-S*0.3,-S*0.03,S*0.6,S*0.06); ctx.restore(); }
      // foam while inside
      if(p>0.05 && p<0.95 && foam.length<90) for(let i=0;i<3;i++) foam.push({x:x+rr(-box.w*sc*0.5,box.w*sc*0.5), y:y+rr(-box.h*sc*0.5,box.h*sc*0.5), r:rr(10,30), vy:-rr(0.5,2), a:1});
      for(let i=foam.length-1;i>=0;i--){ const f=foam[i]; f.y+=f.vy; f.a-=0.012; if(f.a<=0){ foam.splice(i,1); continue; } ctx.globalAlpha=f.a; ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(f.x,f.y,f.r,0,7); ctx.fill(); ctx.strokeStyle=C.ink; ctx.lineWidth=2; ctx.stroke(); } ctx.globalAlpha=1;
      // brushes (in front of the state)
      const bw=TW*0.11; brush(tx0+TW*0.3-bw/2, roofY+roofH, bw, gy-roofY-roofH-S*0.2, t, false); brush(tx0+TW*0.68-bw/2, roofY+roofH, bw, gy-roofY-roofH-S*0.2, t, false); brush(tx0+TW*0.2, roofY+roofH, TW*0.6, bw*0.8, t, true);
      // roof + sign + posts
      ctx.fillStyle='#2E6FE0'; ctx.strokeStyle=C.ink; ctx.lineWidth=6; roundRect(tx0-W*0.02,roofY,TW+W*0.04,roofH,roofH*0.3); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#FFE34D'; ctx.font=`900 ${Math.round(roofH*0.55)}px Archivo, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('DONKEY WASH', tx0+TW/2, roofY+roofH*0.52);
      for(const px of [tx0,tx1]){ ctx.fillStyle='#F0562A'; ctx.fillRect(px-W*0.01,roofY+roofH,W*0.02,gy-roofY-roofH); ctx.strokeRect(px-W*0.01,roofY+roofH,W*0.02,gy-roofY-roofH); }
      // dryer blower at the exit
      const dx=tx1+W*0.035, dy=roofY+roofH; ctx.fillStyle='#8C8A84'; roundRect(dx-W*0.03,dy-roofH*0.3,W*0.06,roofH*0.8,12); ctx.fill(); ctx.stroke(); ctx.fillStyle=C.ink; ctx.beginPath(); ctx.moveTo(dx-W*0.02,dy+roofH*0.5); ctx.lineTo(dx+W*0.02,dy+roofH*0.5); ctx.lineTo(dx+W*0.035,dy+roofH*0.8); ctx.lineTo(dx-W*0.035,dy+roofH*0.8); ctx.closePath(); ctx.fill();
      if(t>2.5 && t<4.2){ ctx.strokeStyle='#7FAAF6'; ctx.lineWidth=5; ctx.lineCap='round'; ctx.beginPath(); for(let i=0;i<8;i++){ const wy=dy+roofH*0.9+((t*500+i*73)%(gy-dy-roofH)); const wx=dx+(i-4)*W*0.012+Math.sin(t*12+i)*10; ctx.moveTo(wx,wy); ctx.lineTo(wx+W*0.03,wy+40); } ctx.stroke(); }
      // attendant donkey up on the roof, jumps for joy when the state comes out clean
      const hop = A.struck? Math.abs(Math.sin((t-A.struckAt)*7))*S*0.5 : 0; donkey(tx0+TW*0.85, roofY-S*0.9-hop, S, {hat:'#F0562A', grin:A.struck, legs:A.struck? t*14:null, look:1});
      // sparkle once it's out
      if(A.struck){ if(sparks.length<14 && Math.random()<0.4) sparks.push({x:x+rr(-box.w*sc*0.5,box.w*sc*0.5), y:y+rr(-box.h*sc*0.5,box.h*sc*0.5), s:rr(14,34), a:0, life:rr(0.5,0.9)});
        for(let i=sparks.length-1;i>=0;i--){ const k=sparks[i]; k.a+=1/60; const u=k.a/k.life; if(u>=1){ sparks.splice(i,1); continue; } const sz=k.s*Math.sin(u*Math.PI); ctx.fillStyle='#FFE34D'; star(k.x,k.y,sz*1.3,u*2); ctx.fillStyle='#fff'; star(k.x,k.y,sz*0.8,u*2); } }
      if(!A.struck && x>=tx1+W*0.05){ A.struck=true; A.struckAt=t; hit('SQUEAKY!','squeaky'); } };
    return A;
  },

  /* popcorn — kernels pop blue in a pan; the state is the giant final kernel that blows the lid off */
  popcorn({W,H,r,hit,shake}){
    const A = {dur:9, struck:false, struckAt:0}; SFX.sizzle();
    const st=STATES[r.st]||STATES.TX, path=new Path2D(st.d), box=stBox(st);
    const px=W/2, PW=Math.min(W*0.5,900), PH=H*0.24, py=H*0.86, top=py-PH, floor=top+PH*0.6; const sc0=Math.min(PH*0.55/box.h, PW*0.4/box.w), sc1=Math.min(H*0.42/box.h, W*0.4/box.w);
    const kernels=[...Array(30)].map((_,i)=>({x:px+(i/29-0.5)*PW*0.86+rr(-8,8), y:floor-rr(6,16), popAt:0.3+Math.pow(Math.random(),0.7)*2.4, popped:false}));
    const pieces=[]; let lid={y:top-10, vy:0, a:0, va:0, off:false}; let lastPop=-1; let nPop=0;
    const piece=(x,y,s,a)=>{ ctx.translate(x,y); ctx.rotate(a); ctx.fillStyle='#2E6FE0'; ctx.strokeStyle=C.ink; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(0,0,s,0,7); ctx.arc(-s*0.7,-s*0.4,s*0.7,0,7); ctx.arc(s*0.7,-s*0.35,s*0.7,0,7); ctx.arc(0,-s*0.8,s*0.65,0,7); ctx.fill(); ctx.stroke(); ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(-s*0.3,-s*0.6,s*0.25,0,7); ctx.fill(); ctx.rotate(-a); ctx.translate(-x,-y); };
    A.frame = t=>{
      const heat = clamp01(t/2.9);
      // stove + flames
      ctx.fillStyle=C.ink; roundRect(px-PW*0.6,py+H*0.03,PW*1.2,H*0.03,8); ctx.fill();
      for(let i=0;i<9;i++){ const fx=px-PW*0.4+i*PW*0.1, fh=H*0.03+Math.abs(Math.sin(t*17+i*2.3))*H*0.05; ctx.fillStyle='#F0562A'; ctx.beginPath(); ctx.moveTo(fx-PW*0.035,py+H*0.03); ctx.lineTo(fx,py+H*0.03-fh); ctx.lineTo(fx+PW*0.035,py+H*0.03); ctx.fill(); ctx.fillStyle='#FFE34D'; ctx.beginPath(); ctx.moveTo(fx-PW*0.018,py+H*0.03); ctx.lineTo(fx,py+H*0.03-fh*0.55); ctx.lineTo(fx+PW*0.018,py+H*0.03); ctx.fill(); }
      // pan back wall + inside
      ctx.strokeStyle=C.ink; ctx.lineWidth=6; ctx.fillStyle='#5a5853'; ctx.beginPath(); ctx.moveTo(px-PW/2,top); ctx.lineTo(px-PW*0.46,py); ctx.lineTo(px+PW*0.46,py); ctx.lineTo(px+PW/2,top); ctx.closePath(); ctx.fill(); ctx.stroke();
      // kernels + pops
      let popNow=false; for(const k of kernels){ if(!k.popped && t>=k.popAt){ k.popped=true; popNow=true; nPop++; pieces.push({x:k.x,y:k.y,vx:rr(-5,5),vy:-rr(8,16),s:rr(12,20),a:rr(0,6),va:rr(-.2,.2),inPan:true}); } if(!k.popped){ ctx.fillStyle='#FFE34D'; ctx.strokeStyle=C.ink; ctx.lineWidth=2; ctx.beginPath(); ctx.ellipse(k.x,k.y+Math.sin(t*30+k.x)*heat*3,8,11,0.3,0,7); ctx.fill(); ctx.stroke(); } }
      if(popNow && t-lastPop>0.05){ lastPop=t; SFX.kpop(); }
      // the big kernel = the state, swelling and shaking
      if(!A.struck){ const sw=1+heat*0.3, sh=Math.sin(t*40)*heat*heat*0.06; drawState(st,path,box,px+Math.sin(t*37)*heat*8,floor-box.h*sc0*sw*0.5,sc0*sw,sh,'#FFE34D'); label(r.st,px,floor-box.h*sc0*sw*0.5,box.h*sc0*0.32); }
      else { const u=easeOut((t-A.struckAt)/0.45); const sy=floor-box.h*sc0*0.5 + (H*0.38-(floor-box.h*sc0*0.5))*u; const scN=sc0+(sc1-sc0)*u; const bob=Math.sin((t-A.struckAt)*3)*H*0.015;
        // puffy popcorn body behind the state
        ctx.fillStyle='#7FAAF6'; ctx.strokeStyle=C.ink; ctx.lineWidth=5; ctx.beginPath(); for(let i=0;i<8;i++){ const an=i/8*Math.PI*2; ctx.moveTo(px+Math.cos(an)*box.w*scN*0.42,sy+bob+Math.sin(an)*box.h*scN*0.42); ctx.arc(px+Math.cos(an)*box.w*scN*0.42,sy+bob+Math.sin(an)*box.h*scN*0.42,box.h*scN*0.2*u,0,7); } ctx.fill(); ctx.stroke();
        drawState(st,path,box,px,sy+bob,scN,Math.sin((t-A.struckAt)*2)*0.05,'#2E6FE0'); ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(px-box.w*scN*0.2,sy+bob-box.h*scN*0.2,box.h*scN*0.08*u,0,7); ctx.fill(); label(r.st,px,sy+bob,box.h*scN*0.3,'#fff'); }
      // popped pieces bounce inside the pan (until the lid blows), then erupt
      for(let i=pieces.length-1;i>=0;i--){ const p=pieces[i]; p.vy+=0.5; p.x+=p.vx; p.y+=p.vy; p.a+=p.va;
        if(p.inPan){ if(p.y>floor-p.s*0.5){ p.y=floor-p.s*0.5; p.vy=-rr(6,14); p.vx=rr(-5,5); } if(p.y<top+p.s+6 && !lid.off){ p.y=top+p.s+6; p.vy=Math.abs(p.vy)*0.5; } if(p.x<px-PW*0.44+p.s){ p.x=px-PW*0.44+p.s; p.vx=Math.abs(p.vx); } if(p.x>px+PW*0.44-p.s){ p.x=px+PW*0.44-p.s; p.vx=-Math.abs(p.vx); } }
        else if(p.y>H+60){ pieces.splice(i,1); continue; }
        piece(p.x,p.y,p.s,p.a); }
      // pan front wall + handle
      ctx.fillStyle='#8C8A84'; ctx.strokeStyle=C.ink; ctx.lineWidth=6; ctx.beginPath(); ctx.moveTo(px-PW/2-(floor-top)*0.1,floor); ctx.lineTo(px-PW*0.46,py); ctx.lineTo(px+PW*0.46,py); ctx.lineTo(px+PW/2+(floor-top)*0.1,floor); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#FFE34D'; ctx.font=`900 ${Math.round(PH*0.16)}px Archivo, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('MOVIE NIGHT', px, floor+(py-floor)*0.5);
      ctx.fillStyle=C.ink; roundRect(px+PW*0.46,top+PH*0.45,PW*0.3,PH*0.14,PH*0.07); ctx.fill();
      // lid: rattles with each pop, then blows off
      if(!lid.off){ const rat = Math.min(1,nPop/8)*heat; lid.y = top-10 - Math.abs(Math.sin(t*35))*rat*14; lid.a = Math.sin(t*33)*rat*0.05; }
      else { lid.vy+=0.6; lid.y+=lid.vy; lid.a+=lid.va; }
      if(lid.y>-H*0.3){ ctx.save(); ctx.translate(px,lid.y); ctx.rotate(lid.a); ctx.fillStyle='#BBD0F5'; ctx.strokeStyle=C.ink; ctx.lineWidth=6; roundRect(-PW*0.53,-PH*0.12,PW*1.06,PH*0.16,PH*0.08); ctx.fill(); ctx.stroke(); ctx.fillStyle=C.ink; roundRect(-PW*0.06,-PH*0.3,PW*0.12,PH*0.2,PH*0.06); ctx.fill(); ctx.restore(); }
      // steam puffs
      if(heat>0.3 && !lid.off){ ctx.fillStyle='rgba(255,255,255,.5)'; for(let i=0;i<4;i++){ const u=((t*0.8+i*0.25)%1); ctx.beginPath(); ctx.arc(px-PW*0.45+i*PW*0.3+Math.sin(u*6)*12, top-20-u*H*0.15, 10+u*18,0,7); ctx.fill(); } }
      if(!A.struck && t>=2.9){ A.struck=true; A.struckAt=t; hit('POP!','bigPop'); lid.off=true; lid.vy=-H*0.035; lid.va=rr(-0.25,0.25); shake();
        for(const p of pieces){ p.inPan=false; p.vy=-rr(10,30); p.vx=rr(-18,18); } for(let i=0;i<90;i++) pieces.push({x:px+rr(-PW*0.4,PW*0.4),y:top+rr(0,PH*0.5),vx:rr(-22,22),vy:-rr(12,34),s:rr(12,24),a:rr(0,6),va:rr(-.3,.3),inPan:false}); } };
    return A;
  },

  /* skydive — three donkeys jump from a plane, chutes open spelling the state code, they land on a bullseye */
  skydive({W,H,r,hit}){
    const A = {dur:9.5, struck:false, struckAt:0}; SFX.propPlane();
    const st=STATES[r.st]||STATES.TX, path=new Path2D(st.d), box=stBox(st); const S=Math.min(H*0.075,82); const sc=Math.min(S*1.6/box.h, S*2.6/box.w);
    const gy=H*0.74, cx=W/2; const PW=Math.min(W*0.26,500); const tOpen=1.9, tLand=3.7, yOpen=H*0.38;
    const letters=[r.st[0]||'D', r.st[1]||'!', '!']; const ccol=['#2E6FE0','#FFE34D','#F0562A']; const lcol=['#fff',C.ink,'#fff'];
    const jumpers=[0,1,2].map(i=>({drop:0.45+i*0.25, fx:cx+(i-1)*PW*0.95, land:tLand+i*0.12, done:false}));
    const clouds=[[W*0.12,H*0.22,1],[W*0.8,H*0.16,1.3],[W*0.55,H*0.3,0.8]]; let opened=false;
    const chute=(x,y,R,i,open,collapse)=>{ const sy=open*(1-collapse*0.85); ctx.save(); ctx.translate(x,y); ctx.scale(open,sy); ctx.fillStyle=ccol[i]; ctx.strokeStyle=C.ink; ctx.lineWidth=5/Math.max(0.3,open);
      ctx.beginPath(); ctx.arc(0,0,R,Math.PI,0); ctx.quadraticCurveTo(R*0.75,R*0.18,R*0.5,0); ctx.quadraticCurveTo(R*0.25,R*0.18,0,0); ctx.quadraticCurveTo(-R*0.25,R*0.18,-R*0.5,0); ctx.quadraticCurveTo(-R*0.75,R*0.18,-R,0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); for(const a of [0.35,0.7,1.05]){ ctx.moveTo(0,0); ctx.lineTo(Math.cos(Math.PI+a)*R,Math.sin(Math.PI+a)*R); ctx.moveTo(0,0); ctx.lineTo(Math.cos(-a)*R,Math.sin(-a)*R); } ctx.stroke();
      ctx.fillStyle=lcol[i]; ctx.font=`900 ${Math.round(R*0.8)}px Archivo, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(letters[i],0,-R*0.42); ctx.restore(); };
    A.frame = t=>{
      // clouds
      for(const [cxx,cy,k] of clouds){ const x=cxx+Math.sin(t*0.3+cy)*20; ctx.fillStyle='#BBD0F5'; ctx.strokeStyle=C.ink; ctx.lineWidth=4; ctx.beginPath(); ctx.arc(x,cy,S*0.7*k,0,7); ctx.arc(x+S*0.8*k,cy-S*0.3*k,S*0.85*k,0,7); ctx.arc(x+S*1.7*k,cy,S*0.65*k,0,7); ctx.fill(); ctx.stroke(); }
      // ground + bullseye
      ctx.fillStyle='rgba(140,138,132,.3)'; ctx.fillRect(0,gy,W,H-gy); ctx.strokeStyle=C.ink; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(0,gy); ctx.lineTo(W,gy); ctx.stroke();
      const bw=W*0.24, bh=H*0.065; for(let i=5;i>=1;i--){ ctx.fillStyle = i%2? '#F0562A':'#fff'; ctx.beginPath(); ctx.ellipse(cx,gy,bw*i/5,bh*i/5,0,0,7); ctx.fill(); ctx.stroke(); }
      // the plane
      const plx = -PW + (W+PW*2)*clamp01(t/2.2), ply=H*0.12; if(t<2.4){ ctx.save(); ctx.translate(plx,ply); ctx.fillStyle='#2E6FE0'; ctx.strokeStyle=C.ink; ctx.lineWidth=5;
        ctx.beginPath(); ctx.moveTo(-PW*0.5,-PW*0.05); ctx.lineTo(-PW*0.5,-PW*0.2); ctx.lineTo(-PW*0.35,-PW*0.05); ctx.closePath(); ctx.fill(); ctx.stroke();
        roundRect(-PW*0.5,-PW*0.09,PW,PW*0.18,PW*0.09); ctx.fill(); ctx.stroke(); ctx.fillStyle='#7FAAF6'; roundRect(-PW*0.2,-PW*0.03,PW*0.5,PW*0.08,PW*0.03); ctx.fill(); ctx.stroke();
        ctx.fillStyle='#fff'; for(let i=0;i<4;i++){ ctx.beginPath(); ctx.arc(-PW*0.25+i*PW*0.14,-PW*0.03,PW*0.025,0,7); ctx.fill(); } ctx.fillStyle=C.ink; ctx.fillRect(PW*0.05,-PW*0.02,PW*0.08,PW*0.11);
        ctx.fillStyle='#FFE34D'; ctx.save(); ctx.translate(PW*0.52,0); ctx.rotate(t*40); ctx.fillRect(-PW*0.015,-PW*0.14,PW*0.03,PW*0.28); ctx.restore(); ctx.restore(); }
      // jumpers
      let allDown=true;
      jumpers.forEach((j,i)=>{ if(t<j.drop){ allDown=false; return; }
        const dx = -PW + (W+PW*2)*clamp01(j.drop/2.2) + PW*0.09; // where they left the plane
        let x,y,rot=0,open=0,collapse=0,dang=t*9;
        if(t<tOpen){ const u=(t-j.drop)/(tOpen-j.drop); x=dx+(j.fx-dx)*ease(u); y=ply+(yOpen-ply)*(u*u*0.6+u*0.4); rot=u*Math.PI*2*(i%2?1:-1)+Math.sin(t*5)*0.2; allDown=false; }
        else { const u=clamp01((t-tOpen)/(j.land-tOpen)); open=easeOut(clamp01((t-tOpen)/0.35)); x=j.fx+Math.sin(t*2+i)*S*0.6*(1-u); y=yOpen+(gy-S*0.9-yOpen)*u; rot=Math.sin(t*2+i)*0.15*(1-u); if(u<1) allDown=false; else { collapse=clamp01((t-j.land)/0.8)*0.8; rot=0; dang=null; } }
        if(open>0){ const cy=y-S*2.3+collapse*S*2.0; ctx.strokeStyle=C.ink; ctx.lineWidth=3; ctx.beginPath(); for(const k of [-1,1]){ ctx.moveTo(x+k*S*0.6,y-S*0.3); ctx.lineTo(x+k*S*1.6*(1-collapse*0.7),cy); } ctx.stroke(); chute(x,cy,S*1.75,i,open,collapse); }
        donkey(x,y,S,{rot, dangle:dang, grin:A.struck, look:1});
        if(i===1){ const sx=x+Math.cos(rot-Math.PI/2)*S*0.75, sy=y+Math.sin(rot-Math.PI/2)*S*0.75; drawState(st,path,box,sx,sy,sc,rot,'#FFE34D'); label(r.st,sx,sy,box.h*sc*0.32); }
        if(t>=j.land && !j.done){ j.done=true; } });
      // judges' cards after the landing
      if(A.struck){ const u=easeOut((t-A.struckAt)/0.5); for(let i=0;i<2;i++){ const x=W*(0.12+i*0.76), y=H*0.96-(H*0.26)*u; ctx.fillStyle='#FFE34D'; ctx.strokeStyle=C.ink; ctx.lineWidth=4; roundRect(x-W*0.05,y,W*0.1,H*0.13,10); ctx.fill(); ctx.stroke(); label('10',x,y+H*0.065,H*0.08); } }
      if(t>=tOpen && !opened){ opened=true; SFX.chuteSnap(); }
      if(!A.struck && allDown){ A.struck=true; A.struckAt=t; hit('BULLSEYE!','bullseye'); } };
    return A;
  }
});
KINDS.push('zamboni','kaiju','carwash','popcorn','skydive');
})();


/* ===== round 3, part 7 ===== */
/* anims-extra/part7.js — meteor, laundry, tugofwar, jackinbox, limbo */
(function(){
const ease = u => u<=0? 0 : u>=1? 1 : u*u*(3-2*u);
const easeOut = u => u<=0? 0 : u>=1? 1 : 1-Math.pow(1-u,3);
const easeIn = u => u<=0? 0 : u>=1? 1 : u*u*u;
const clamp01 = u => u<0?0:u>1?1:u;
const lerp = (a,b,u)=>a+(b-a)*u;
// bounding box of a state's absolute-coordinate SVG path (viewBox 975x610)
const stBox = st => { const n=(st.d.match(/-?\d+(\.\d+)?/g)||[]).map(Number); let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9; for(let i=0;i+1<n.length;i+=2){ x0=Math.min(x0,n[i]); x1=Math.max(x1,n[i]); y0=Math.min(y0,n[i+1]); y1=Math.max(y1,n[i+1]); } if(x1<x0){ x0=st.c[0]-120; x1=st.c[0]+120; y0=st.c[1]-120; y1=st.c[1]+120; } return {w:x1-x0, h:y1-y0, cx:(x0+x1)/2, cy:(y0+y1)/2}; };
// draw the state silhouette centred on (x,y); optional outer glow stroke colour
const drawState = (st,path,box,x,y,sc,rot,fill,sx,sy,glow) => { ctx.save(); ctx.translate(x,y); ctx.rotate(rot||0); ctx.scale(sc*(sx||1),sc*(sy||1)); ctx.translate(-box.cx,-box.cy); if(glow){ ctx.strokeStyle=glow; ctx.lineWidth=16/sc; ctx.lineJoin='round'; ctx.stroke(path); } ctx.fillStyle=fill; ctx.strokeStyle=C.ink; ctx.lineWidth=4/sc; ctx.fill(path); ctx.stroke(path); ctx.restore(); };
const label = (txt,x,y,px,col) => { ctx.fillStyle=col||C.ink; ctx.font=`900 ${Math.round(px)}px Archivo, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(txt,x,y); };
const mixCol = (a,b,u) => { const p=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)]; const A=p(a),B=p(b); return `rgb(${Math.round(lerp(A[0],B[0],u))},${Math.round(lerp(A[1],B[1],u))},${Math.round(lerp(A[2],B[2],u))})`; };
const star4 = (x,y,r,col) => { ctx.fillStyle=col; ctx.beginPath(); for(let i=0;i<8;i++){ const a=i*Math.PI/4, rr_=i%2?r*0.4:r; ctx.lineTo(x+Math.cos(a)*rr_, y+Math.sin(a)*rr_); } ctx.closePath(); ctx.fill(); };

/* the blue donkey (copied from anims.js donkeyBase geometry), origin at body centre, faces right.
   o: {rot, flip, legs:[a0..a3]|gallop phase number, hat:'hard'|'party', eye:'wide'|'x'|'happy'|'shut', headTilt, mouth:0..1, noLegs, tail} */
const donkey=(x,y,s,o)=>{ o=o||{}; ctx.save(); ctx.translate(x,y); if(o.flip) ctx.scale(-1,1); ctx.rotate(o.rot||0);
  ctx.fillStyle='#2E6FE0'; ctx.strokeStyle=C.ink; ctx.lineWidth=Math.max(3,s*0.045); ctx.lineJoin='round';
  // tail
  ctx.lineWidth=Math.max(3,s*0.07); ctx.beginPath(); ctx.moveTo(-s*0.9,-s*0.3); ctx.quadraticCurveTo(-s*1.4,-s*0.1+(o.tail||0)*s,-s*1.2,s*0.3); ctx.stroke(); ctx.lineWidth=Math.max(3,s*0.045);
  // legs
  if(!o.noLegs){ const L=[-s*0.7,-s*0.3,s*0.3,s*0.7]; for(let i=0;i<4;i++){ const lx=L[i]; const a = Array.isArray(o.legs)? o.legs[i] : (typeof o.legs==='number'? Math.sin(o.legs+lx)*0.6*(i%2?-1:1) : 0); ctx.translate(lx,s*0.4); ctx.rotate(a); roundRect(-s*0.09,0,s*0.18,s*0.5,s*0.05); ctx.fill(); ctx.stroke(); ctx.rotate(-a); ctx.translate(-lx,-s*0.4); } }
  // body
  roundRect(-s*0.9,-s*0.45,s*1.8,s*0.9,s*0.3); ctx.fill(); ctx.stroke();
  // neck + head group (tilt about neck base)
  ctx.translate(s*0.95,-s*0.3); ctx.rotate(o.headTilt||0); ctx.translate(-s*0.95,s*0.3);
  ctx.beginPath(); ctx.moveTo(s*0.8,-s*0.4); ctx.lineTo(s*1.25,-s*0.95); ctx.lineTo(s*1.5,-s*0.8); ctx.lineTo(s*1.05,-s*0.2); ctx.closePath(); ctx.fill(); ctx.stroke();
  roundRect(s*1.15,-s*1.15,s*0.75,s*0.5,s*0.15); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#FFE34D'; for(const ex of [s*1.2,s*1.45]){ ctx.beginPath(); ctx.moveTo(ex,-s*1.1); ctx.lineTo(ex+s*0.1,-s*1.55); ctx.lineTo(ex+s*0.22,-s*1.1); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  // mouth
  if(o.mouth){ ctx.fillStyle=C.ink; ctx.beginPath(); ctx.ellipse(s*1.78,-s*0.72,s*0.1,s*0.1*o.mouth,0,0,7); ctx.fill(); }
  // eye
  const ey=-s*0.98, exx=s*1.7;
  if(o.eye==='x'){ ctx.strokeStyle=C.ink; ctx.lineWidth=s*0.05; ctx.beginPath(); ctx.moveTo(exx-s*0.09,ey-s*0.09); ctx.lineTo(exx+s*0.09,ey+s*0.09); ctx.moveTo(exx+s*0.09,ey-s*0.09); ctx.lineTo(exx-s*0.09,ey+s*0.09); ctx.stroke(); }
  else if(o.eye==='happy'||o.eye==='shut'){ ctx.strokeStyle=C.ink; ctx.lineWidth=s*0.05; ctx.beginPath(); ctx.arc(exx,ey+(o.eye==='happy'?s*0.04:-s*0.04),s*0.1,o.eye==='happy'?Math.PI:0,o.eye==='happy'?0:Math.PI); ctx.stroke(); }
  else { const R=o.eye==='wide'? s*0.15 : s*0.1; ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(exx,ey,R,0,7); ctx.fill(); ctx.strokeStyle=C.ink; ctx.lineWidth=s*0.03; ctx.stroke(); ctx.fillStyle=C.ink; ctx.beginPath(); ctx.arc(exx+s*0.03,ey+s*0.01,o.eye==='wide'?s*0.05:s*0.05,0,7); ctx.fill(); }
  // hats
  if(o.hat==='hard'){ ctx.fillStyle='#FFE34D'; ctx.strokeStyle=C.ink; ctx.lineWidth=s*0.045; ctx.beginPath(); ctx.ellipse(s*1.52,-s*1.18,s*0.5,s*0.1,0,0,7); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(s*1.52,-s*1.18,s*0.36,Math.PI,0); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  if(o.hat==='party'){ ctx.fillStyle='#F0562A'; ctx.strokeStyle=C.ink; ctx.lineWidth=s*0.045; ctx.beginPath(); ctx.moveTo(s*1.15,-s*1.15); ctx.lineTo(s*1.3,-s*1.75); ctx.lineTo(s*1.5,-s*1.15); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle='#FFE34D'; ctx.beginPath(); ctx.arc(s*1.3,-s*1.75,s*0.07,0,7); ctx.fill(); }
  ctx.restore(); };

/* ---------- sounds ---------- */
SFX.meteorIn = function(){ noise(0, 2.2, 0.25, 500); tone(1200, 0, 2.2, 'sawtooth', 0.08, 180); tone(1500, 0.1, 2.0, 'sine', 0.06, 160); };
SFX.impact = function(){ noise(0, 1.3, 1.0, 400); tone(50, 0, 1.6, 'sine', 0.9, 24); tone(130, 0, 0.5, 'square', 0.25, 40); for(let i=0;i<10;i++) noise(0.25+i*0.09, 0.15, 0.25, 1200); cheer(0.6); };
SFX.washer = function(){ tone(660, 0, 0.12, 'square', 0.12); tone(880, 0.14, 0.12, 'square', 0.12); for(let i=0;i<8;i++) tone(400+Math.random()*300, 0.5+i*0.1, 0.12, 'sine', 0.06, 700); };
SFX.clunk = function(){ noise(0, 0.15, 0.6, 700); tone(140, 0, 0.18, 'square', 0.3, 60); };
SFX.spincycle = function(){ noise(0, 2.4, 0.5, 900); tone(60, 0, 2.4, 'sawtooth', 0.25, 420); for(let i=0;i<18;i++){ noise(i*0.13, 0.08, 0.35, 300); tone(90, i*0.13, 0.08, 'square', 0.15, 50); } cheer(0.8); };
SFX.strain = function(){ for(let i=0;i<10;i++){ tone(150+Math.random()*40, i*0.22, 0.2, 'sawtooth', 0.1, 120); noise(i*0.22+0.1, 0.05, 0.1, 1800); } };
SFX.heave = function(){ tone(900, 0, 0.12, 'square', 0.3, 200); noise(0.05, 0.3, 0.8, 2500); for(let i=0;i<3;i++){ noise(0.45+i*0.2, 0.4, 0.8, 500); tone(80, 0.45+i*0.2, 0.3, 'sine', 0.5, 35); } cheer(0.7); };
SFX.crankTune = function(){ const m=[[523,0],[523,0.22],[587,0.44],[659,0.66],[523,0.88],[659,1.1],[587,1.32],[392,1.54],[523,1.76],[523,1.98],[587,2.2]]; for(const [f,t] of m){ tone(f*2, t, 0.2, 'sine', 0.16); tone(f*4, t, 0.12, 'triangle', 0.05); } for(let i=0;i<20;i++) noise(i*0.12, 0.03, 0.12, 3000); };
SFX.surprise = function(){ tone(180, 0, 0.5, 'sawtooth', 0.3, 1100); noise(0, 0.2, 0.5, 2500); for(let i=0;i<12;i++) tone(500+Math.sin(i)*200, 0.3+i*0.07, 0.1, 'square', 0.12, 350); [784,988,1175,1568].forEach((f,i)=>tone(f, 0.5+i*0.1, 0.5, 'triangle', 0.18)); cheer(0.5); };
SFX.calypso = function(){ const m=[523,659,784,659,523,659,784,880,784,659,523,587,659,587,523]; m.forEach((f,i)=>{ tone(f, i*0.16, 0.25, 'triangle', 0.12); tone(f*2, i*0.16, 0.08, 'sine', 0.05); }); for(let i=0;i<16;i++) noise(i*0.16, 0.04, 0.1, 5000); };
SFX.clackbar = function(){ noise(0, 0.08, 0.5, 2000); tone(300, 0, 0.1, 'square', 0.2, 120); };
SFX.howlow = function(){ tone(220, 0, 0.6, 'sawtooth', 0.2, 55); [523,659,784,1047].forEach((f,i)=>{ tone(f, 0.3+i*0.1, 0.6, 'triangle', 0.2); }); for(let i=0;i<10;i++) noise(0.5+i*0.09, 0.05, 0.15, 4000); cheer(0.4); };

Object.assign(ANIMS, {
  /* meteor — a state-shaped meteor streaks in, craters the ground, dust ring; hard-hat donkeys cheer from the rim */
  meteor({W,H,r,hit,shake}){
    const A = {dur:9, struck:false, struckAt:0}; SFX.meteorIn();
    const st=STATES[r.st]||STATES.TX, path=new Path2D(st.d), box=stBox(st);
    const sc=Math.min(H*0.34/box.h, W*0.24/box.w); const gy=H*0.74, ix=W*0.52, R=Math.min(W*0.15, H*0.3), hitT=2.2;
    const p0={x:-W*0.08, y:H*0.02}, p1={x:ix, y:gy-box.h*sc*0.25};
    const stars=[]; for(let i=0;i<60;i++) stars.push({x:rr(0,W), y:rr(0,H*0.65), r:rr(3,7), ph:rr(0,6)});
    const trail=[], puffs=[], rocks=[]; const ds=H*0.055; const dks=[];
    for(let i=0;i<6;i++){ const side=i%2?1:-1, k=Math.floor(i/2); dks.push({side, x: ix + side*(R*1.25 + k*ds*2.4 + ds*1.0), ph:rr(0,6)}); }
    A.frame = t=>{
      // night sky stars (ink-outlined so they read on cream too)
      ctx.strokeStyle=C.ink; ctx.lineWidth=1.5; for(const s of stars){ const a=0.5+0.5*Math.sin(t*3+s.ph); ctx.globalAlpha=0.35+0.65*a; star4(s.x,s.y,s.r,'#FFE34D'); ctx.stroke(); } ctx.globalAlpha=1;
      // ground
      ctx.fillStyle='rgba(140,138,132,0.35)'; ctx.fillRect(0,gy,W,H-gy); ctx.strokeStyle=C.ink; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(0,gy); ctx.lineTo(W,gy); ctx.stroke();
      const u = clamp01(t/hitT); const fu = easeIn(u)*0.35 + u*0.65; const mx=lerp(p0.x,p1.x,fu), my=lerp(p0.y,p1.y,fu);
      // crater (after impact)
      if(A.struck){ const k=easeOut((t-A.struckAt)/0.3);
        ctx.fillStyle='#8C8A84'; ctx.strokeStyle=C.ink; ctx.lineWidth=5; ctx.beginPath(); ctx.ellipse(ix,gy,R*1.15*k,R*0.42*k,0,0,7); ctx.fill(); ctx.stroke();
        ctx.fillStyle=C.ink; ctx.beginPath(); ctx.ellipse(ix,gy+R*0.02,R*0.95*k,R*0.3*k,0,0,7); ctx.fill(); }
      // trail puffs (fire) left behind in flight
      if(!A.struck){ for(let i=0;i<3;i++) trail.push({x:mx+rr(-20,20), y:my+rr(-20,20), r:rr(14,34), a:1, c:['#FFE34D','#F0562A','#F0562A'][i]}); }
      for(const p of trail){ p.a-=0.028; p.r+=0.6; p.y-=0.6; if(p.a<=0) continue; ctx.globalAlpha=Math.max(0,p.a); ctx.fillStyle=p.c; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,7); ctx.fill(); } ctx.globalAlpha=1; while(trail.length&&trail[0].a<=0) trail.shift();
      // the meteor in flight: fiery teardrop behind the state
      if(!A.struck){ const dx=p1.x-p0.x, dy=p1.y-p0.y, L=Math.hypot(dx,dy), nx=dx/L, ny=dy/L; const len=box.h*sc*2.2, wid=box.h*sc*0.6;
        for(const [col,k] of [['#F0562A',1],['#FFE34D',0.6]]){ ctx.fillStyle=col; ctx.beginPath(); ctx.moveTo(mx-ny*wid*k, my+nx*wid*k); ctx.lineTo(mx-nx*len*k+rr(-10,10), my-ny*len*k+rr(-10,10)); ctx.lineTo(mx+ny*wid*k, my-nx*wid*k); ctx.closePath(); ctx.fill(); }
        drawState(st,path,box,mx,my,sc,t*3,'#F0562A',1,1,'#FFE34D'); label(r.st,mx,my,H*0.05); }
      else { // landed: half-sunk in the crater, now blue and glowing
        const u2=t-A.struckAt; const sq = u2<0.3? 1-Math.sin(u2/0.3*Math.PI)*0.25 : 1; const glow = `rgba(255,227,77,${0.5+0.5*Math.sin(u2*6)})`;
        drawState(st,path,box,ix,p1.y,sc,0,'#2E6FE0',1/sq,sq,glow); label(r.st,ix,p1.y,H*0.05);
        // front rim of the crater over the state's foot
        ctx.fillStyle='#8C8A84'; ctx.strokeStyle=C.ink; ctx.lineWidth=5; ctx.beginPath(); ctx.ellipse(ix,gy,R*1.15,R*0.42,0,0,Math.PI); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle=C.ink; ctx.beginPath(); ctx.ellipse(ix,gy+R*0.02,R*0.95,R*0.3,0,0.15,Math.PI-0.15); ctx.fill();
        // dust rings + smoke wisps
        for(let i=0;i<3;i++){ const q=(u2-i*0.18)/1.4; if(q<=0||q>=1) continue; ctx.globalAlpha=(1-q)*0.7; ctx.strokeStyle='#9A978F'; ctx.lineWidth=28*(1-q)+4; ctx.beginPath(); ctx.ellipse(ix,gy,R*1.1+q*W*0.5,R*0.4+q*H*0.14,0,0,7); ctx.stroke(); } ctx.globalAlpha=1;
        if(u2<4 && Math.random()<0.6) puffs.push({x:ix+rr(-R*0.6,R*0.6), y:gy-R*0.1, r:rr(10,24), vx:rr(-1,1), vy:-rr(1,3), a:0.8});
      }
      for(const p of puffs){ p.x+=p.vx; p.y+=p.vy; p.r+=0.5; p.a-=0.012; if(p.a<=0) continue; ctx.globalAlpha=Math.max(0,p.a)*0.6; ctx.fillStyle='#9A978F'; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,7); ctx.fill(); } ctx.globalAlpha=1; for(let i=puffs.length-1;i>=0;i--) if(puffs[i].a<=0) puffs.splice(i,1);
      // rocks
      ctx.fillStyle=C.ink; for(const k of rocks){ k.vy+=0.7; k.x+=k.vx; k.y+=k.vy; k.a+=k.va; if(k.y>gy-4&&k.vy>0){ k.y=gy-4; k.vy*=-0.4; k.vx*=0.7; } ctx.beginPath(); ctx.moveTo(k.x+k.r,k.y); ctx.lineTo(k.x,k.y-k.r*1.2); ctx.lineTo(k.x-k.r,k.y-k.r*0.2); ctx.lineTo(k.x-k.r*0.5,k.y+k.r*0.8); ctx.closePath(); ctx.fill(); }
      // hard-hat donkeys
      for(let i=0;i<dks.length;i++){ const d=dks[i]; const faceR = d.side<0; let x=d.x, y=gy-ds*0.9, o={hat:'hard', flip:!faceR, headTilt:0, legs:[0.2,-0.2,0.2,-0.2]};
        if(!A.struck){ o.headTilt=-0.35; o.eye='wide'; o.mouth=0.6; if(t>1.4){ x+=rr(-3,3); } }
        else { const u2=t-A.struckAt; const kb=easeOut(Math.min(1,u2/0.35)); x+=d.side*ds*1.1*kb; if(u2<0.5){ o.rot=d.side*-0.8*(1-u2/0.5)*(faceR?1:-1); o.eye='x'; }
          else { const b=Math.abs(Math.sin((u2-0.5)*7+d.ph)); y-=b*ds*0.9; o.legs=[-0.5+b*0.3,0.5-b*0.3,-0.5+b*0.3,0.5-b*0.3]; o.eye='happy'; o.mouth=0.8; o.headTilt=-0.2; o.tail=-0.4;
            if(b>0.7){ label('!', x, gy-ds*2.9-b*ds*0.9, ds*0.9, '#FFE34D'); ctx.strokeStyle=C.ink; ctx.lineWidth=2; ctx.strokeText('!', x, gy-ds*2.9-b*ds*0.9); } } }
        donkey(x,y,ds,o); }
      // flash on impact
      if(A.struck && t-A.struckAt<0.25){ ctx.globalAlpha=0.6*(1-(t-A.struckAt)/0.25); ctx.fillStyle='#FFE34D'; ctx.fillRect(0,0,W,H); ctx.globalAlpha=1; }
      if(A.struck && t-A.struckAt<1.2 && Math.random()<0.2) shake();
      if(!A.struck && t>=hitT){ A.struck=true; A.struckAt=t; hit('IMPACT!','impact'); for(let i=0;i<45;i++) rocks.push({x:ix+rr(-R*0.5,R*0.5), y:gy, vx:rr(-22,22), vy:-rr(6,30), r:rr(5,14), a:0, va:0}); for(let i=0;i<22;i++) puffs.push({x:ix+rr(-R,R), y:gy, r:rr(16,40), vx:rr(-7,7), vy:-rr(2,7), a:0.8}); } };
    return A;
  },

  /* laundry — the red state goes in the washer with blue dye; the spin cycle shakes everything; it comes out blue on the clothesline */
  laundry({W,H,r,hit,shake}){
    const A = {dur:9.2, struck:false, struckAt:0}; SFX.washer();
    const st=STATES[r.st]||STATES.TX, path=new Path2D(st.d), box=stBox(st);
    const MW=Math.min(W*0.32, H*0.6), MH=MW*1.12, mx0=W*0.36, mbot=H*0.92, mtop=mbot-MH; const PR=MW*0.3, pcx0=mx0, pcy=mtop+MH*0.6; const hinge0=mx0-PR*1.12;
    const sc1=Math.min(PR*1.25/box.w, PR*1.25/box.h), sc2=Math.min(H*0.3/box.h, W*0.15/box.w);
    const lx1=W*0.58, lx2=W*0.965, lineY=H*0.3, hangX=W*0.8; const drips=[], suds=[]; let drum=0, lastShake=-1, spinT=2.3, spinEnd=4.7, outT=5.4, doorClunk=false;
    const doorOpen = t => t<1.15? 1 : t<1.55? 1-ease((t-1.15)/0.4) : t<spinEnd+0.4? 0 : ease((t-(spinEnd+0.4))/0.5);
    A.frame = t=>{
      const spinning = t>=spinT && t<spinEnd; const spd = spinning? Math.min(1,(t-spinT)/0.6) : (t>=spinEnd? Math.max(0,1-(t-spinEnd)/0.5) : 0); drum += spd*0.42;
      const jit = spinning? 9 : 0; const mx = mx0 + (spinning? Math.sin(t*35)*5 : 0) + rr(-jit,jit); const my = rr(-jit*0.5,jit*0.5); const pcx=pcx0+(mx-mx0), hinge=hinge0+(mx-mx0);
      if(spinning){ const k=Math.floor(t*2); if(k!==lastShake){ lastShake=k; shake(); } }
      // clothesline + poles + other laundry
      ctx.strokeStyle=C.ink; ctx.lineWidth=6; ctx.lineCap='round'; ctx.fillStyle='#8C8A84'; for(const px of [lx1,lx2]){ roundRect(px-11, lineY-H*0.06, 22, H*0.98-lineY, 8); ctx.fill(); ctx.stroke(); }
      ctx.lineWidth=5; ctx.beginPath(); ctx.moveTo(lx1,lineY-H*0.04); ctx.quadraticCurveTo((lx1+lx2)/2, lineY+H*0.03, lx2, lineY-H*0.04); ctx.stroke();
      const lineAt = x=>{ const q=(x-lx1)/(lx2-lx1); return (1-q)*(1-q)*(lineY-H*0.04) + 2*(1-q)*q*(lineY+H*0.03) + q*q*(lineY-H*0.04); };
      const peg=(x,y)=>{ ctx.fillStyle='#FFE34D'; ctx.strokeStyle=C.ink; ctx.lineWidth=3; roundRect(x-9,y-14,18,40,5); ctx.fill(); ctx.stroke(); ctx.fillStyle=C.ink; ctx.fillRect(x-2,y+4,4,18); };
      // a sock and a shirt already drying
      { const x=W*0.66, y=lineAt(x); ctx.fillStyle='#7FAAF6'; ctx.strokeStyle=C.ink; ctx.lineWidth=4; roundRect(x-22,y+14,44,H*0.14,16); ctx.fill(); ctx.stroke(); roundRect(x-22,y+H*0.12,80,44,20); ctx.fill(); ctx.stroke(); peg(x,y); }
      { const x=W*0.92, y=lineAt(x); ctx.fillStyle='#FFE34D'; ctx.strokeStyle=C.ink; ctx.lineWidth=4; roundRect(x-55,y+14,110,H*0.17,18); ctx.fill(); ctx.stroke(); roundRect(x-85,y+14,60,60,16); ctx.fill(); ctx.stroke(); roundRect(x+25,y+14,60,60,16); ctx.fill(); ctx.stroke(); peg(x-30,y); peg(x+30,y); }
      // machine body
      ctx.save(); ctx.translate(0,my);
      ctx.fillStyle='#BBD0F5'; ctx.strokeStyle=C.ink; ctx.lineWidth=6; roundRect(mx-MW/2, mtop, MW, MH, 26); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#2E6FE0'; roundRect(mx-MW/2, mtop, MW, MH*0.17, 26); ctx.fill(); ctx.stroke(); ctx.fillRect(mx-MW/2, mtop+MH*0.1, MW, MH*0.07);
      // dial + buttons + display
      ctx.fillStyle='#FFE34D'; ctx.beginPath(); ctx.arc(mx+MW*0.36, mtop+MH*0.085, MH*0.05,0,7); ctx.fill(); ctx.stroke(); ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(mx+MW*0.36, mtop+MH*0.085); const da = spinning? t*20 : -1; ctx.lineTo(mx+MW*0.36+Math.cos(da)*MH*0.04, mtop+MH*0.085+Math.sin(da)*MH*0.04); ctx.stroke();
      for(let i=0;i<3;i++){ ctx.fillStyle=['#F0562A','#FFE34D','#fff'][i]; ctx.beginPath(); ctx.arc(mx-MW*0.38+i*MW*0.09, mtop+MH*0.085, MH*0.022,0,7); ctx.fill(); ctx.stroke(); }
      ctx.fillStyle='#151412'; roundRect(mx-MW*0.16, mtop+MH*0.035, MW*0.36, MH*0.1, 8); ctx.fill();
      label(spinning? (Math.floor(t*6)%2? 'SPIN':'') : t<spinT? 'WASH' : t<spinEnd+0.4? 'RINSE' : 'DONE', mx+MW*0.02, mtop+MH*0.087, MH*0.07, spinning? '#F0562A' : '#7FAAF6');
      // dispenser drawer slot (top left)
      ctx.fillStyle='#7FAAF6'; ctx.strokeStyle=C.ink; ctx.lineWidth=4; roundRect(mx-MW*0.42, mtop-MH*0.03, MW*0.2, MH*0.05, 6); ctx.fill(); ctx.stroke();
      // porthole ring + drum interior
      ctx.fillStyle='#8C8A84'; ctx.lineWidth=6; ctx.beginPath(); ctx.arc(pcx,pcy,PR*1.18,0,7); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#2b2825'; ctx.beginPath(); ctx.arc(pcx,pcy,PR,0,7); ctx.fill();
      ctx.save(); ctx.beginPath(); ctx.arc(pcx,pcy,PR,0,7); ctx.clip();
      // drum paddles
      ctx.fillStyle='#8C8A84'; for(let i=0;i<3;i++){ const a=drum+i*Math.PI*2/3; ctx.save(); ctx.translate(pcx,pcy); ctx.rotate(a); ctx.fillRect(PR*0.72,-PR*0.08,PR*0.3,PR*0.16); ctx.restore(); }
      // water level
      const lvl = t<1.6? 0 : t<2.4? ease((t-1.6)/0.8)*0.55 : t<spinEnd? 0.55 : Math.max(0, 0.55-(t-spinEnd)*0.8);
      if(lvl>0){ const wy = pcy+PR*(1-lvl*2) + (spinning? Math.sin(t*25)*PR*0.08 : 0); ctx.globalAlpha=0.75; ctx.fillStyle='#2E6FE0'; ctx.beginPath(); ctx.moveTo(pcx-PR,wy); for(let i=0;i<=10;i++){ ctx.lineTo(pcx-PR+i*PR*0.2, wy+Math.sin(t*8+i)*PR*0.05); } ctx.lineTo(pcx+PR,pcy+PR); ctx.lineTo(pcx-PR,pcy+PR); ctx.closePath(); ctx.fill(); ctx.globalAlpha=1; }
      // the state inside (drops in, then tumbles)
      if(t<outT){ let sx=pcx, sy=pcy, rot=0, col='#F0562A';
        if(t<1.15){ const u=ease(t/1.0); sx=lerp(mx-MW*0.95, pcx, u); sy=lerp(pcy-H*0.45, pcy+PR*0.2, u) - Math.sin(u*Math.PI)*H*0.1; rot=u*2; }
        else { const dye = clamp01((t-spinT)/1.8); col = mixCol('#F0562A','#2E6FE0',dye); if(spd>0){ const a=drum*1.0; sx=pcx+Math.cos(a)*PR*0.45; sy=pcy+Math.sin(a)*PR*0.45; rot=a+Math.PI/2; } else { sy=pcy+PR*0.2; rot = t<spinT? Math.sin(t*3)*0.1 : 0; } }
        drawState(st,path,box,sx,sy,sc1,rot,col); }
      // suds while spinning
      if(spinning && Math.random()<0.9) suds.push({x:pcx+rr(-PR,PR), y:pcy+rr(-PR,PR), r:rr(5,16), vy:-rr(0.5,2), a:1});
      ctx.fillStyle='#fff'; for(const s of suds){ s.y+=s.vy; s.a-=0.02; if(s.a<=0) continue; ctx.globalAlpha=Math.max(0,s.a)*0.9; ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,7); ctx.fill(); } ctx.globalAlpha=1; for(let i=suds.length-1;i>=0;i--) if(suds[i].a<=0) suds.splice(i,1);
      ctx.restore();
      ctx.strokeStyle=C.ink; ctx.lineWidth=5; ctx.beginPath(); ctx.arc(pcx,pcy,PR,0,7); ctx.stroke();
      // door (hinged on the left)
      const o=doorOpen(t); if(o<0.02 && !doorClunk && t>1.3){ doorClunk=true; SFX.clunk(); } const dw=PR*1.18*(1-0.85*o), dcx=hinge+dw*(1-2*o);
      ctx.fillStyle='#8C8A84'; ctx.strokeStyle=C.ink; ctx.lineWidth=6; ctx.beginPath(); ctx.ellipse(dcx,pcy,dw,PR*1.18,0,0,7); ctx.ellipse(dcx,pcy,dw*0.85,PR,0,0,7); ctx.fill('evenodd'); ctx.beginPath(); ctx.ellipse(dcx,pcy,dw,PR*1.18,0,0,7); ctx.stroke();
      ctx.globalAlpha=0.22; ctx.fillStyle='#7FAAF6'; ctx.beginPath(); ctx.ellipse(dcx,pcy,dw*0.85,PR,0,0,7); ctx.fill(); ctx.globalAlpha=1; ctx.lineWidth=4; ctx.stroke();
      ctx.fillStyle=C.ink; ctx.beginPath(); ctx.arc(hinge, pcy, 10, 0, 7); ctx.fill();
      // dye bottle on top (tips over to pour into the dispenser between 1.5 and 2.5)
      const pour = clamp01((t-1.5)/0.5) * (t<2.5? 1 : 1-clamp01((t-2.5)/0.4)); const bx=mx-MW*0.1, by=mtop+2; const ba=-pour*1.35, BL=MH*0.27;
      ctx.save(); ctx.translate(bx, by); ctx.rotate(ba); ctx.fillStyle='#2E6FE0'; ctx.strokeStyle=C.ink; ctx.lineWidth=4; roundRect(-MW*0.07,-MH*0.2,MW*0.14,MH*0.2,10); ctx.fill(); ctx.stroke(); ctx.fillStyle='#FFE34D'; ctx.fillRect(-MW*0.05,-BL,MW*0.1,MH*0.07); ctx.strokeRect(-MW*0.05,-BL,MW*0.1,MH*0.07); label('DYE',0,-MH*0.1,MH*0.05,'#fff'); ctx.restore();
      if(pour>0.85){ const mxp=bx+Math.sin(ba)*BL, myp=by-Math.cos(ba)*BL; ctx.strokeStyle='#2E6FE0'; ctx.lineWidth=12; ctx.lineCap='round'; ctx.beginPath(); ctx.moveTo(mxp,myp); ctx.quadraticCurveTo(mxp-MW*0.03, myp+MH*0.02, mx-MW*0.32, mtop-MH*0.01); ctx.stroke(); }
      ctx.restore();
      // the state flies out onto the line, then hangs and drips
      if(t>=outT){ const u=clamp01((t-outT)/1.0); const hy=lineAt(hangX)+box.h*sc2*0.5+18; let sx=lerp(pcx, hangX, ease(u)), sy=lerp(pcy, hy, ease(u)) - Math.sin(u*Math.PI)*H*0.3; const sw = u>=1? Math.sin((t-outT-1)*3)*0.06 : u*3;
        const sc=lerp(sc1,sc2,ease(u)); drawState(st,path,box,sx,sy,sc,sw,'#2E6FE0'); label(r.st,sx,sy,H*0.05);
        if(u>=1){ peg(hangX-box.w*sc2*0.25, lineAt(hangX-box.w*sc2*0.25)); peg(hangX+box.w*sc2*0.25, lineAt(hangX+box.w*sc2*0.25));
          if(Math.random()<0.3) drips.push({x:hangX+rr(-box.w*sc2*0.4,box.w*sc2*0.4), y:hy+box.h*sc2*0.45, vy:2, a:1});
          for(let i=0;i<5;i++){ const q=((t-outT)*0.8+i*0.2)%1; star4(hangX+Math.cos(i*1.3+t)*box.w*sc2*0.7, hy+Math.sin(i*2.1+t*0.7)*box.h*sc2*0.7, (1-q)*18+4, '#FFE34D'); } } }
      ctx.fillStyle='#2E6FE0'; for(const d of drips){ d.vy+=0.4; d.y+=d.vy; ctx.beginPath(); ctx.arc(d.x,d.y,6,0,7); ctx.fill(); } for(let i=drips.length-1;i>=0;i--) if(drips[i].y>H) drips.splice(i,1);
      if(!A.struck && t>=spinT){ A.struck=true; A.struckAt=t; hit('SPIN CYCLE!','spincycle'); } };
    return A;
  },

  /* tugofwar — three donkeys vs three red elephant-ish blobs over a mud pit; the rope snaps the donkeys' way and the blobs go splat */
  tugofwar({W,H,r,hit}){
    const A = {dur:9, struck:false, struckAt:0}; SFX.strain();
    const st=STATES[r.st]||STATES.TX, path=new Path2D(st.d), box=stBox(st);
    const s=Math.min(H*0.075, W*0.045), gy=H*0.66, pitX=W/2, pitY=gy+H*0.05, prx=W*0.12, pry=H*0.06, snapT=2.5, PULL=W*0.07;
    const sc=Math.min(H*0.2/box.h, W*0.12/box.w); const splash=[], bubbles=[];
    const dkx=[W*0.4, W*0.4-s*2.4, W*0.4-s*4.8], blx=[W*0.61, W*0.61+s*2.7, W*0.61+s*5.4]; const blobs=blx.map((x,i)=>({x, y:gy, rot:0, landed:false, land:0.55+i*0.15}));
    const blob=(x,y,sz,rot,dizzy)=>{ ctx.save(); ctx.translate(x,y); ctx.rotate(rot); ctx.strokeStyle=C.ink; ctx.lineWidth=5; ctx.lineJoin='round'; ctx.lineCap='round';
      ctx.fillStyle='#F0562A'; for(const lx of [-sz*0.5,sz*0.4]){ roundRect(lx-sz*0.18,-sz*0.5,sz*0.36,sz*0.5,sz*0.1); ctx.fill(); ctx.stroke(); }
      ctx.beginPath(); ctx.ellipse(0,-sz*0.95,sz*1.05,sz*0.85,0,0,7); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(sz*0.35,-sz*1.1,sz*0.4,sz*0.5,0.2,0,7); ctx.fill(); ctx.stroke();
      // trunk
      ctx.lineWidth=sz*0.3+8; ctx.strokeStyle=C.ink; ctx.beginPath(); ctx.moveTo(-sz*0.85,-sz*0.9); ctx.quadraticCurveTo(-sz*1.6,-sz*0.3,-sz*1.7,-sz*1.1); ctx.stroke(); ctx.lineWidth=sz*0.3; ctx.strokeStyle='#F0562A'; ctx.stroke();
      ctx.fillStyle='#fff'; ctx.beginPath(); ctx.moveTo(-sz*0.9,-sz*0.6); ctx.lineTo(-sz*1.25,-sz*0.3); ctx.lineTo(-sz*0.95,-sz*0.45); ctx.closePath(); ctx.fill(); ctx.strokeStyle=C.ink; ctx.lineWidth=3; ctx.stroke();
      // eye
      const ex=-sz*0.45, ey=-sz*1.15; if(dizzy){ ctx.lineWidth=sz*0.06; ctx.beginPath(); ctx.moveTo(ex-sz*0.12,ey-sz*0.12); ctx.lineTo(ex+sz*0.12,ey+sz*0.12); ctx.moveTo(ex+sz*0.12,ey-sz*0.12); ctx.lineTo(ex-sz*0.12,ey+sz*0.12); ctx.stroke(); }
      else { ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(ex,ey,sz*0.16,0,7); ctx.fill(); ctx.lineWidth=3; ctx.stroke(); ctx.fillStyle=C.ink; ctx.beginPath(); ctx.arc(ex-sz*0.05,ey,sz*0.07,0,7); ctx.fill(); ctx.lineWidth=sz*0.06; ctx.beginPath(); ctx.moveTo(ex-sz*0.2,ey-sz*0.3); ctx.lineTo(ex+sz*0.15,ey-sz*0.2); ctx.stroke(); }
      ctx.restore(); };
    A.frame = t=>{
      const u = A.struck? t-A.struckAt : 0;
      // ground
      ctx.fillStyle='rgba(140,138,132,0.35)'; ctx.fillRect(0,gy,W,H-gy); ctx.strokeStyle=C.ink; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(0,gy); ctx.lineTo(W,gy); ctx.stroke();
      // mud pit (back half)
      ctx.fillStyle='#7a4a24'; ctx.strokeStyle=C.ink; ctx.lineWidth=5; ctx.beginPath(); ctx.ellipse(pitX,pitY,prx,pry,0,0,7); ctx.fill(); ctx.stroke();
      // rope offset / tension
      const off = A.struck? -PULL*easeOut(Math.min(1,u/0.45)) - snapT*W*0.01 : Math.sin(t*5)*W*0.012 - t*W*0.01;
      // donkeys (lean back, then fall over, then get up and hop)
      const mouths=[];
      dkx.forEach((bx,i)=>{ let x=bx+off, y=gy-s*0.9, o={legs:[-0.5,-0.25,0.35,0.6], rot:-0.32+Math.sin(t*5+i)*0.05, eye:'wide', mouth:0.5, tail:-0.5};
        if(A.struck){ if(u<0.45){ const k=easeIn(u/0.45); o.rot=lerp(-0.32,-2.7,k); x-=s*0.8*k; y+=s*0.35*k; o.legs=[-0.5+k,-0.25+k,0.35+k,0.6+k]; o.eye='x'; o.mouth=0.9; }
          else if(u<1.8){ o.rot=-2.7; x-=s*0.8; y+=s*0.35; const w=Math.sin((u-0.45)*14+i); o.legs=[0.6+w*0.3,0.4-w*0.3,0.7+w*0.3,0.5-w*0.3]; o.eye='x'; o.mouth=0.9; }
          else if(u<2.3){ const k=ease((u-1.8)/0.5); o.rot=lerp(-2.7,0,k)-(1-k)*0; x-=s*0.8*(1-k*0.3); y+=s*0.35*(1-k); o.legs=[0,0,0,0]; o.eye='happy'; o.mouth=0.6; }
          else { const b=Math.abs(Math.sin((u-2.3)*7+i*1.1)); x-=s*0.55; y-=b*s*0.8; o.legs=[-0.4+b*0.2,0.4-b*0.2,-0.4+b*0.2,0.4-b*0.2]; o.eye='happy'; o.mouth=0.8; o.tail=-0.6; o.headTilt=-0.25; } }
        // mouth position in world coords (rotation about body centre)
        const mxl=s*1.85, myl=-s*0.78; const ca=Math.cos(o.rot), sa=Math.sin(o.rot); mouths.push({x:x+mxl*ca-myl*sa, y:y+mxl*sa+myl*ca});
        donkey(x,y,s,o); });
      // blobs (lean, then launched into the pit)
      const trunks=[];
      blobs.forEach((b,i)=>{ let x=b.x+off, y=gy, rot=0.28+Math.sin(t*5+i)*0.05, dizzy=false;
        if(A.struck){ const k=clamp01(u/b.land); const tx=pitX+(i-1)*prx*0.5, ty=pitY+s*0.3; x=lerp(b.x+off,tx,k); y=lerp(gy,ty,k)-Math.sin(k*Math.PI)*H*0.35; rot=0.28+k*Math.PI*2*(i%2?1:-1); if(k>=1){ y=ty+Math.min(1,(u-b.land)/0.8)*s*0.9; rot=(i-1)*0.4; dizzy=true; if(!b.landed){ b.landed=true; for(let j=0;j<22;j++) splash.push({x:tx+rr(-prx*0.3,prx*0.3), y:pitY, vx:rr(-12,12), vy:-rr(6,22), r:rr(4,10)}); } } }
        { const sz=s*1.3, tx=-sz*1.7, ty=-sz*1.1, ca=Math.cos(rot), sa=Math.sin(rot); trunks.push({x:x+tx*ca-ty*sa, y:y+tx*sa+ty*ca}); blob(x,y,sz,rot,dizzy); } });
      // mud pit (front half) so landed blobs look sunk
      ctx.fillStyle='#7a4a24'; ctx.strokeStyle=C.ink; ctx.lineWidth=5; ctx.beginPath(); ctx.ellipse(pitX,pitY,prx,pry,0,0,Math.PI); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.ellipse(pitX,pitY,prx,pry,0,0,Math.PI); ctx.stroke();
      if(A.struck && Math.random()<0.3) bubbles.push({x:pitX+rr(-prx*0.7,prx*0.7), y:pitY+rr(-pry*0.3,pry*0.5), r:rr(4,12), a:1});
      ctx.strokeStyle=C.ink; ctx.lineWidth=3; for(const b of bubbles){ b.a-=0.03; b.r+=0.3; if(b.a<=0) continue; ctx.globalAlpha=b.a; ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,7); ctx.stroke(); } ctx.globalAlpha=1; for(let i=bubbles.length-1;i>=0;i--) if(bubbles[i].a<=0) bubbles.splice(i,1);
      // splash droplets
      ctx.fillStyle='#7a4a24'; for(const p of splash){ p.vy+=0.8; p.x+=p.vx; p.y+=p.vy; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,7); ctx.fill(); } for(let i=splash.length-1;i>=0;i--) if(splash[i].y>H+30) splash.splice(i,1);
      // rope: from the lead donkey's mouth to the lead blob's trunk (taut), or a slack snapped end after the heave
      const m0=mouths[0], tr0=trunks[0]; let endX, endY;
      if(!A.struck){ endX=tr0.x; endY=tr0.y; } else { const k=easeOut(Math.min(1,u/0.6)); endX=lerp(tr0.x, m0.x+s*1.4, k); endY=lerp(tr0.y, gy-6, k); }
      const sag = A.struck? 0 : 8; const midX=(m0.x+endX)/2, midY=(m0.y+endY)/2+sag + (A.struck? Math.sin(u*9)*s*0.5*Math.exp(-u) : 0);
      ctx.lineCap='round'; ctx.strokeStyle=C.ink; ctx.lineWidth=16; ctx.beginPath(); ctx.moveTo(m0.x,m0.y); for(let i=1;i<mouths.length;i++) ctx.lineTo(mouths[i].x,mouths[i].y); ctx.moveTo(m0.x,m0.y); ctx.quadraticCurveTo(midX,midY,endX,endY); ctx.stroke(); ctx.strokeStyle='#c98a4b'; ctx.lineWidth=10; ctx.stroke();
      // a short frayed stub stays with the blobs
      if(A.struck && u<1.2){ ctx.strokeStyle=C.ink; ctx.lineWidth=16; ctx.beginPath(); ctx.moveTo(tr0.x,tr0.y); ctx.lineTo(tr0.x-s*0.8,tr0.y+s*0.3*u); ctx.stroke(); ctx.strokeStyle='#c98a4b'; ctx.lineWidth=10; ctx.stroke(); }
      // the state flag hangs from the rope's middle
      const fk=easeOut(Math.min(1,u/0.6)); const fx = A.struck? lerp(midX, m0.x+s*1.0, fk) : midX; const fy = A.struck? lerp(midY+box.h*sc*0.5+12, gy-box.h*sc*0.5-4, fk) : midY + box.h*sc*0.5 + 12;
      ctx.strokeStyle=C.ink; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(fx-box.w*sc*0.3, fy-box.h*sc*0.5-12); ctx.lineTo(fx-box.w*sc*0.3, fy-box.h*sc*0.3); ctx.moveTo(fx+box.w*sc*0.3, fy-box.h*sc*0.5-12); ctx.lineTo(fx+box.w*sc*0.3, fy-box.h*sc*0.3); ctx.stroke();
      drawState(st,path,box,fx,fy,sc,A.struck? -0.4*easeOut(Math.min(1,u/0.6)) : Math.sin(t*5)*0.06,'#2E6FE0'); label(r.st,fx,fy,H*0.045);
      // "HEAVE" grunts before the snap
      if(!A.struck){ const g=Math.sin(t*5); if(g>0.6) label('HEAVE…', dkx[1]+off, gy-s*3.6, s*0.7, '#FFE34D'); if(g<-0.6) label('HO…', blx[1]+off, gy-s*3.6, s*0.7, '#F0562A'); }
      if(!A.struck && t>=snapT){ A.struck=true; A.struckAt=t; hit('HEAVE!','heave'); } };
    return A;
  },

  /* jackinbox — the crank turns to a music-box tune, the lid pops, a donkey on a spring boings out with the state */
  jackinbox({W,H,r,hit,shake}){
    const A = {dur:9, struck:false, struckAt:0}; SFX.crankTune();
    const st=STATES[r.st]||STATES.TX, path=new Path2D(st.d), box=stBox(st);
    const B=Math.min(H*0.3, W*0.24), bx=W/2, bbot=H*0.8, btop=bbot-B, popT=2.45; const ds=B*0.34; const sc=Math.min(ds*2.1/box.w, ds*1.6/box.h);
    const notes=[]; let lastNote=-1;
    A.frame = t=>{
      const u = A.struck? t-A.struckAt : 0; const pre = !A.struck && t>1.6? (t-1.6)/(popT-1.6) : 0; const jx = pre? rr(-1,1)*pre*10 : 0, jy = pre? rr(-1,1)*pre*6 : 0;
      ctx.save(); ctx.translate(jx,jy);
      // floor shadow
      ctx.fillStyle='rgba(140,138,132,0.35)'; ctx.beginPath(); ctx.ellipse(bx,bbot+10,B*0.75,B*0.09,0,0,7); ctx.fill();
      // box body
      ctx.fillStyle='#2E6FE0'; ctx.strokeStyle=C.ink; ctx.lineWidth=6; ctx.lineJoin='round'; roundRect(bx-B/2,btop,B,B,14); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#FFE34D'; ctx.fillRect(bx-B/2+6, btop+B*0.42, B-12, B*0.16);
      for(const [cx,cy] of [[bx-B*0.36,btop+B*0.14],[bx+B*0.36,btop+B*0.14],[bx-B*0.36,btop+B*0.86],[bx+B*0.36,btop+B*0.86]]) { star4(cx,cy,B*0.07,'#FFE34D'); ctx.lineWidth=3; ctx.stroke(); }
      label(A.struck? '!' : '?', bx, btop+B*0.5, B*0.5, '#151412'); label(A.struck? '!' : '?', bx-4, btop+B*0.5-4, B*0.5, '#F0562A');
      // crank on the right face
      const ca = A.struck? -2.0 : t*t*1.6; const ax=bx+B/2+B*0.04, ay=btop+B*0.6; ctx.fillStyle='#8C8A84'; ctx.beginPath(); ctx.arc(ax,ay,B*0.06,0,7); ctx.fill(); ctx.stroke();
      const hx=ax+Math.cos(ca)*B*0.22, hy=ay+Math.sin(ca)*B*0.22; ctx.strokeStyle=C.ink; ctx.lineWidth=14; ctx.lineCap='round'; ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(hx,hy); ctx.stroke(); ctx.strokeStyle='#8C8A84'; ctx.lineWidth=8; ctx.stroke();
      ctx.fillStyle='#F0562A'; ctx.strokeStyle=C.ink; ctx.lineWidth=4; ctx.beginPath(); ctx.arc(hx,hy,B*0.07,0,7); ctx.fill(); ctx.stroke();
      // music notes floating off the crank
      if(!A.struck){ const k=Math.floor(t*4.5); if(k!==lastNote){ lastNote=k; notes.push({x:ax+B*0.25, y:ay-B*0.2, vx:rr(0.5,2), a:1, s:rr(0.8,1.3)}); } }
      for(const n of notes){ n.x+=n.vx; n.y-=2.2; n.a-=0.012; if(n.a<=0) continue; ctx.globalAlpha=Math.max(0,n.a); label('♪', n.x+Math.sin(n.y*0.05)*10, n.y, B*0.16*n.s, '#F0562A'); } ctx.globalAlpha=1; while(notes.length&&notes[0].a<=0) notes.shift();
      // spring + donkey (after the pop) — drawn before the lid so the lid hinge sits in front
      if(A.struck){ const ext = Math.max(0, H*0.21*(1-Math.exp(-3.2*u)*Math.cos(u*9))); const sway=Math.sin(u*6.5)*Math.exp(-u*0.8)*0.4; const topX=bx+Math.sin(sway)*ext, topY=btop-Math.cos(sway)*ext;
        // spring coil
        const N=14; ctx.strokeStyle=C.ink; ctx.lineWidth=10; ctx.lineJoin='round'; ctx.beginPath(); ctx.moveTo(bx,btop+B*0.2); for(let i=1;i<=N;i++){ const q=i/N; const px=lerp(bx,topX,q)+Math.cos(sway)*(i%2?B*0.16:-B*0.16)*(i<N?1:0), py=lerp(btop+B*0.2,topY,q)+Math.sin(sway)*(i%2?B*0.16:-B*0.16)*(i<N?1:0); ctx.lineTo(px,py); } ctx.stroke(); ctx.strokeStyle='#8C8A84'; ctx.lineWidth=4; ctx.stroke();
        // jester collar
        ctx.save(); ctx.translate(topX,topY); ctx.rotate(sway*0.7); ctx.fillStyle='#FFE34D'; ctx.strokeStyle=C.ink; ctx.lineWidth=4; for(let i=0;i<7;i++){ ctx.beginPath(); ctx.arc(-ds*0.9+i*ds*0.3, ds*0.1, ds*0.2, 0, 7); ctx.fill(); ctx.stroke(); }
        // donkey upper body: half body, neck, head, ears, big eye, party hat; front legs hold the state
        ctx.translate(-ds*0.45,-ds*0.5); donkey(0,0,ds,{noLegs:true, hat:'party', eye:'wide', mouth:0.9, headTilt:-0.15+Math.sin(u*9)*0.08*Math.exp(-u*0.8), tail:-0.3});
        ctx.fillStyle='#2E6FE0'; ctx.strokeStyle=C.ink; ctx.lineWidth=4; for(const lx of [ds*0.35,ds*0.75]){ ctx.save(); ctx.translate(lx,ds*0.4); ctx.rotate(-0.9); roundRect(-ds*0.09,0,ds*0.18,ds*0.6,ds*0.05); ctx.fill(); ctx.stroke(); ctx.restore(); }
        drawState(st,path,box,ds*1.35,ds*1.25,sc,Math.sin(u*9)*0.1*Math.exp(-u*0.8),'#F0562A'); ctx.fillStyle='#2E6FE0'; for(const lx of [ds*0.35,ds*0.75]){ ctx.beginPath(); ctx.arc(lx+ds*0.5, ds*0.8, ds*0.11,0,7); ctx.fill(); ctx.stroke(); }
        label(r.st, ds*1.35, ds*1.25, H*0.05);
        ctx.restore(); }
      // lid (hinged at the back-left corner)
      const la = A.struck? -2.6*easeOut(Math.min(1,u/0.25)) + Math.sin(u*8)*0.1*Math.exp(-u*1.5) : (t>1.8? -0.06*Math.abs(Math.sin(t*35)) : 0);
      ctx.save(); ctx.translate(bx-B/2,btop); ctx.rotate(la); ctx.fillStyle='#F0562A'; ctx.strokeStyle=C.ink; ctx.lineWidth=6; roundRect(0,-B*0.12,B,B*0.12,8); ctx.fill(); ctx.stroke(); ctx.fillStyle='#FFE34D'; ctx.fillRect(B*0.1,-B*0.09,B*0.8,B*0.05); ctx.restore();
      ctx.restore();
      if(A.struck && u<0.5 && Math.random()<0.3) shake();
      if(!A.struck && t>=popT){ A.struck=true; A.struckAt=t; hit('SURPRISE!','surprise'); } };
    return A;
  },

  /* limbo — the bar drops lower and lower; the donkey (on its hind legs) bends ridiculously far back and shuffles under with the state on its belly */
  limbo({W,H,r,hit}){
    const A = {dur:9.2, struck:false, struckAt:0}; SFX.calypso(); setTimeout(()=>SFX.calypso(), 2500);
    const st=STATES[r.st]||STATES.TX, path=new Path2D(st.d), box=stBox(st);
    const s=Math.min(H*0.1, W*0.06), gy=H*0.73, px1=W*0.44, px2=W*0.56, ptop=H*0.17; const sc=Math.min(s*1.9/box.w, s*1.35/box.h);
    const levels=[gy-s*3.4, gy-s*2.9, gy-s*2.45, gy-s*2.0], levT=[0,0.6,1.1,1.6]; let lastLev=0; const hitT=2.8; const UP=-Math.PI/2+0.15, BENT=-2.95;
    const LEG=s*0.5; // each hind-leg segment
    // pose: hip at (hx, gy-hipH), body rotated th about the hip, feet at fl/fr (x offsets), front legs angle fa, head tilt ht
    const pose=(hx,hipH,th,fl,fr,fa,ht,withState,eye,mouth)=>{ const hy=gy-hipH;
      // hind legs (2-bone IK, knee forward)
      ctx.strokeStyle=C.ink; ctx.lineCap='round'; ctx.lineJoin='round';
      for(const [fx,fy] of [[fl.x,fl.y],[fr.x,fr.y]]){ const dx=fx-hx, dy=fy-hy; let d=Math.hypot(dx,dy); const dm=Math.min(d, LEG*1.98); const nx=dx/d, ny=dy/d; const h=Math.sqrt(Math.max(0,LEG*LEG-(dm/2)*(dm/2))); const kx=hx+nx*dm/2 + ny*h, ky=hy+ny*dm/2 - nx*h; const ex=hx+nx*dm, ey=hy+ny*dm;
        for(const [col,lw] of [[C.ink,s*0.2+8],['#2E6FE0',s*0.2]]){ ctx.strokeStyle=col; ctx.lineWidth=lw; ctx.beginPath(); ctx.moveTo(hx,hy); ctx.lineTo(kx,ky); ctx.lineTo(ex,ey); ctx.stroke(); }
        ctx.fillStyle=C.ink; ctx.beginPath(); ctx.ellipse(ex+s*0.05,ey,s*0.16,s*0.09,0,0,7); ctx.fill(); }
      // body + head (rotated about the hip)
      ctx.save(); ctx.translate(hx,hy); ctx.rotate(th); ctx.translate(s*0.5,-s*0.45);
      ctx.fillStyle='#2E6FE0'; ctx.strokeStyle=C.ink; ctx.lineWidth=5;
      for(const lx of [s*0.3,s*0.7]){ ctx.save(); ctx.translate(lx,s*0.4); ctx.rotate(fa+(lx>s*0.5?0.25:0)); roundRect(-s*0.09,0,s*0.18,s*0.5,s*0.05); ctx.fill(); ctx.stroke(); ctx.restore(); }
      donkey(0,0,s,{noLegs:true, headTilt:ht, eye, mouth, tail:0.3});
      if(withState){ const bend=clamp01((th-UP)/(BENT-UP)); const sy=lerp(1,0.6,bend), rot=-th*(1-bend); const cy=s*0.45+box.h*sc*0.5*sy; ctx.translate(s*0.15,cy); ctx.rotate(rot); drawState(st,path,box,0,0,sc,0,'#2E6FE0',1,sy); label(r.st,0,0,s*0.5); }
      ctx.restore(); };
    A.frame = t=>{
      // ground + poles with tiki flames
      ctx.fillStyle='rgba(140,138,132,0.35)'; ctx.fillRect(0,gy,W,H-gy); ctx.strokeStyle=C.ink; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(0,gy); ctx.lineTo(W,gy); ctx.stroke();
      for(const px of [px1,px2]){ ctx.fillStyle='#FFE34D'; ctx.strokeStyle=C.ink; ctx.lineWidth=5; roundRect(px-14,ptop,28,gy-ptop,8); ctx.fill(); ctx.stroke(); ctx.fillStyle=C.ink; for(let y=ptop+40;y<gy-20;y+=70) ctx.fillRect(px-14,y,28,7);
        const fl=1+Math.sin(t*23+px)*0.25; ctx.fillStyle='#F0562A'; ctx.beginPath(); ctx.moveTo(px-26,ptop); ctx.quadraticCurveTo(px-30,ptop-40*fl,px,ptop-85*fl); ctx.quadraticCurveTo(px+30,ptop-40*fl,px+26,ptop); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle='#FFE34D'; ctx.beginPath(); ctx.moveTo(px-12,ptop); ctx.quadraticCurveTo(px-14,ptop-25*fl,px,ptop-45*fl); ctx.quadraticCurveTo(px+14,ptop-25*fl,px+12,ptop); ctx.closePath(); ctx.fill(); }
      // bar height (steps down with a clack)
      let li=0; for(let i=0;i<levT.length;i++) if(t>=levT[i]) li=i; if(li!==lastLev){ lastLev=li; SFX.clackbar(); }
      const barY = li===0? levels[0] : lerp(levels[li-1], levels[li], easeOut((t-levT[li])/0.25)) + (t-levT[li]<0.4? Math.sin((t-levT[li])*40)*4*(1-(t-levT[li])/0.4) : 0);
      // sign
      const sw=W*0.26, sh=H*0.1, sy0=H*0.03; ctx.fillStyle='#FFE34D'; ctx.strokeStyle=C.ink; ctx.lineWidth=5; roundRect(W/2-sw/2,sy0,sw,sh,14); ctx.fill(); ctx.stroke(); label('HOW LOW CAN YOU GO?', W/2, sy0+sh*0.36, sh*0.3); label(`BAR: ${Math.round((gy-barY)/s*12)}"`, W/2, sy0+sh*0.72, sh*0.36, '#F0562A');
      // the donkey
      const x0=W*0.3, x1=W*0.74; let hx, hipH, th, fl, fr, fa, ht, eye='wide', mouth=0.3;
      if(t<1.9){ // walking in on hind legs
        const u=t/1.9; hx=lerp(-s*2.5,x0,u); const ph=t*11; hipH=s*0.95+Math.abs(Math.sin(ph))*s*0.05; th=UP+Math.sin(ph)*0.06; fa=-1.2+Math.sin(ph)*0.5; ht=1.1;
        fl={x:hx+Math.sin(ph)*s*0.4, y:gy-Math.max(0,Math.sin(ph))*s*0.25}; fr={x:hx-Math.sin(ph)*s*0.4, y:gy-Math.max(0,-Math.sin(ph))*s*0.25}; mouth=0.2; }
      else if(t<2.7){ // bending back
        const u=ease((t-1.9)/0.8); hx=x0; hipH=lerp(s*0.95,s*0.8,u); th=lerp(UP,BENT,u); fa=lerp(-1.2,-2.6,u); ht=lerp(1.1,1.5,u); fl={x:hx+s*0.45,y:gy}; fr={x:hx-s*0.25,y:gy}; mouth=0.6+u*0.4; }
      else if(t<4.1){ // shuffling under the bar
        const u=(t-2.7)/1.4; hx=lerp(x0,x1,ease(u)); hipH=s*0.8+Math.sin(t*18)*s*0.02; th=BENT+Math.sin(t*18)*0.03; fa=-2.6+Math.sin(t*18)*0.3; ht=1.5; const sh2=Math.sin(t*18); fl={x:hx+s*0.45+sh2*s*0.12,y:gy-Math.max(0,sh2)*s*0.08}; fr={x:hx-s*0.25-sh2*s*0.12,y:gy-Math.max(0,-sh2)*s*0.08}; mouth=1; }
      else if(t<4.7){ // straighten up
        const u=ease((t-4.1)/0.6); hx=x1; hipH=lerp(s*0.8,s*0.95,u); th=lerp(BENT,UP,u); fa=lerp(-2.6,-1.2,u); ht=lerp(1.5,1.1,u); fl={x:hx+s*0.45*(1-u)+s*0.3*u,y:gy}; fr={x:hx-s*0.25*(1-u)-s*0.3*u,y:gy}; eye='happy'; mouth=0.8; }
      else { // victory hops
        const u=t-4.7; const b=Math.abs(Math.sin(u*6)); hx=x1; hipH=s*0.95+b*s*0.5; th=UP+Math.sin(u*6)*0.1; fa=-1.2-b*1.6; ht=0.9; fl={x:hx+s*0.3,y:gy-b*s*0.5}; fr={x:hx-s*0.3,y:gy-b*s*0.5}; eye='happy'; mouth=0.9; }
      pose(hx,hipH,th,fl,fr,fa,ht,true,eye,mouth);
      // the bar (in front)
      ctx.fillStyle='#F0562A'; ctx.strokeStyle=C.ink; ctx.lineWidth=5; roundRect(px1-10,barY-9,px2-px1+20,18,9); ctx.fill(); ctx.stroke(); for(const px of [px1,px2]){ ctx.fillStyle='#8C8A84'; roundRect(px-22,barY-16,44,32,6); ctx.fill(); ctx.stroke(); }
      // sweat drops while bent
      if(t>2.2 && t<4.1){ ctx.fillStyle='#7FAAF6'; for(let i=0;i<3;i++){ const q=(t*1.5+i*0.33)%1; ctx.beginPath(); ctx.arc(hx-s*1.6+i*s*0.3, gy-s*1.3-q*s*0.8, 7*(1-q*0.5), 0, 7); ctx.fill(); } }
      if(!A.struck && t>=hitT){ A.struck=true; A.struckAt=t; hit('HOW LOW!','howlow'); } };
    return A;
  }
});
KINDS.push('meteor','laundry','tugofwar','jackinbox','limbo');
})();


/* ===== round 3, part 8 ===== */
/* anims-extra/part8.js — moonland, sumo, hotdog, parade, trampoline */
(function(){
const ease = u => u<=0? 0 : u>=1? 1 : u*u*(3-2*u);
const easeOut = u => u<=0? 0 : u>=1? 1 : 1-Math.pow(1-u,3);
// bounding box of a state's absolute-coordinate SVG path (viewBox 975x610)
const stBox = st => { const n=(st.d.match(/-?\d+(\.\d+)?/g)||[]).map(Number); let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9; for(let i=0;i+1<n.length;i+=2){ x0=Math.min(x0,n[i]); x1=Math.max(x1,n[i]); y0=Math.min(y0,n[i+1]); y1=Math.max(y1,n[i+1]); } if(x1<x0){ x0=st.c[0]-120; x1=st.c[0]+120; y0=st.c[1]-120; y1=st.c[1]+120; } return {w:x1-x0, h:y1-y0, cx:(x0+x1)/2, cy:(y0+y1)/2}; };
// draw the state silhouette centred on (x,y)
const drawState = (st,path,box,x,y,sc,rot,fill,sx,sy) => { ctx.save(); ctx.translate(x,y); ctx.rotate(rot||0); ctx.scale(sc*(sx||1),sc*(sy||1)); ctx.translate(-box.cx,-box.cy); ctx.fillStyle=fill; ctx.strokeStyle=C.ink; ctx.lineWidth=4/sc; ctx.fill(path); ctx.stroke(path); ctx.restore(); };
const label = (txt,x,y,px,col) => { ctx.fillStyle=col||C.ink; ctx.font=`900 ${Math.round(px)}px Archivo, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(txt,x,y); };
// outlined label: ink stroke under a coloured fill, readable on anything
const label2 = (txt,x,y,px,col) => { ctx.font=`900 ${Math.round(px)}px Archivo, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.lineJoin='round'; ctx.strokeStyle=C.ink; ctx.lineWidth=Math.max(3,px*0.12); ctx.strokeText(txt,x,y); ctx.fillStyle=col||'#FFE34D'; ctx.fillText(txt,x,y); };
const dot = (x,y,r,col) => { ctx.fillStyle=col; ctx.beginPath(); ctx.arc(x,y,r,0,7); ctx.fill(); };
/* the blue donkey (side profile, faces +x, origin at the body centre, scale s): body, neck, head, ears, eye — local copy, no shared helpers */
const donkeyBody = s => { ctx.fillStyle='#2E6FE0'; ctx.strokeStyle=C.ink; ctx.lineWidth=Math.max(3,s*0.035); ctx.lineJoin='round';
  roundRect(-s*0.9,-s*0.45,s*1.8,s*0.9,s*0.3); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(s*0.8,-s*0.4); ctx.lineTo(s*1.25,-s*0.95); ctx.lineTo(s*1.5,-s*0.8); ctx.lineTo(s*1.05,-s*0.2); ctx.closePath(); ctx.fill(); ctx.stroke();
  donkeyHead(s*1.15,-s*1.15,s); };
/* head + ears + eye with the head box's top-left at (x,y) */
const donkeyHead = (x,y,s) => { ctx.fillStyle='#2E6FE0'; ctx.strokeStyle=C.ink; ctx.lineWidth=Math.max(3,s*0.035); roundRect(x,y,s*0.75,s*0.5,s*0.15); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#FFE34D'; for(const ex of [x+s*0.05,x+s*0.3]){ ctx.beginPath(); ctx.moveTo(ex,y+s*0.05); ctx.lineTo(ex+s*0.1,y-s*0.4); ctx.lineTo(ex+s*0.22,y+s*0.05); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  dot(x+s*0.55,y+s*0.2,s*0.11,'#fff'); dot(x+s*0.58,y+s*0.21,s*0.05,C.ink); dot(x+s*0.68,y+s*0.38,s*0.035,C.ink); };
/* four legs (angle sin(ph+lx)*amp*d) on the main ctx; no per-leg save/restore */
const donkeyLegs = (s,ph,amp) => { amp = amp==null? 0.6 : amp; ctx.fillStyle='#2E6FE0'; ctx.strokeStyle=C.ink; ctx.lineWidth=Math.max(3,s*0.035);
  for(const [lx,d] of [[-s*0.7,1],[-s*0.3,-1],[s*0.3,1],[s*0.7,-1]]){ const a=Math.sin(ph+lx)*amp*d; ctx.translate(lx,s*0.4); ctx.rotate(a); ctx.fillRect(-s*0.09,0,s*0.18,s*0.5); ctx.strokeRect(-s*0.09,0,s*0.18,s*0.5); ctx.rotate(-a); ctx.translate(-lx,-s*0.4); } };
const donkeyTail = (s,ph) => { ctx.strokeStyle=C.ink; ctx.lineWidth=Math.max(3,s*0.06); ctx.lineCap='round'; ctx.beginPath(); ctx.moveTo(-s*0.9,-s*0.3); ctx.quadraticCurveTo(-s*1.45,-s*0.5+Math.sin(ph)*s*0.2,-s*1.3,s*0.15); ctx.stroke(); ctx.lineCap='butt'; };
/* grey dust puffs */
const puff = (list,x,y,n,sp,up) => { for(let i=0;i<n;i++) list.push({x,y,r:rr(6,20),vx:rr(-sp,sp),vy:-rr(0,up==null?2:up),a:1}); };
const dustStep = (list,col) => { for(const m of list){ m.x+=m.vx; m.y+=m.vy; m.vx*=0.95; m.r+=0.7; m.a-=0.02; ctx.globalAlpha=Math.max(0,m.a)*0.7; ctx.fillStyle=col||'#9A978F'; ctx.beginPath(); ctx.arc(m.x,m.y,m.r,0,7); ctx.fill(); } ctx.globalAlpha=1; for(let i=list.length-1;i>=0;i--) if(list[i].a<=0) list.splice(i,1); };

/* ---------- sounds ---------- */
SFX.lander = function(){ noise(0, 2.4, 0.25, 500); tone(60, 0, 2.4, 'sawtooth', 0.1, 45); };
SFX.landerBeep = function(){ tone(1200, 0, 0.07, 'square', 0.08); };
SFX.touchdown = function(){ noise(0, 0.5, 0.8, 400); tone(70, 0, 0.5, 'sine', 0.6, 30); [880,1109,1319].forEach((f,i)=>tone(f, 0.3+i*0.14, 0.4, 'square', 0.12)); tone(1760, 0.75, 0.9, 'sine', 0.2); cheer(0.5); };
SFX.taiko = function(){ for(let i=0;i<4;i++){ tone(90, i*0.45, 0.3, 'sine', 0.5, 40); noise(i*0.45, 0.15, 0.4, 600); } };
SFX.shiko = function(){ noise(0, 0.25, 0.8, 300); tone(55, 0, 0.3, 'sine', 0.6, 25); };
SFX.dosukoi = function(){ noise(0, 0.15, 1.0, 2500); tone(180, 0, 0.15, 'square', 0.4, 60); tone(300, 0.1, 0.8, 'sawtooth', 0.2, 1400); noise(0.1, 0.8, 0.3, 3000); tone(100, 0.15, 0.6, 'sine', 0.4, 40); cheer(0.4); };
SFX.chomp = function(){ noise(0, 0.08, 0.6, 1200); tone(150, 0, 0.08, 'square', 0.2, 60); };
SFX.tableBell = function(){ for(let i=0;i<2;i++) tone(2200, i*0.15, 0.3, 'sine', 0.2, 2100); };
SFX.champion = function(){ [523,659,784,1047,1319].forEach((f,i)=>{ tone(f, i*0.1, 0.5, 'square', 0.14); tone(f/2, i*0.1, 0.5, 'triangle', 0.1); }); tone(1319, 0.5, 1.2, 'square', 0.12); noise(0.5, 0.4, 0.3, 3000); cheer(0.3); };
SFX.oompah = function(){ for(let i=0;i<8;i++){ const b=i*0.4; tone(i%2?98:65, b, 0.18, 'triangle', 0.4, 50); tone(i%2?392:330, b+0.2, 0.12, 'sawtooth', 0.08); tone(i%2?494:415, b+0.2, 0.12, 'sawtooth', 0.08); noise(b, 0.05, 0.25, 1500); } };
SFX.paradehit = function(){ [523,659,784,1047].forEach((f,i)=>{ tone(f, i*0.09, 0.45, 'sawtooth', 0.12); tone(f*1.005, i*0.09, 0.45, 'square', 0.06); }); tone(1047, 0.36, 1.0, 'sawtooth', 0.12); tone(65, 0, 0.3, 'triangle', 0.4, 50); tone(65, 0.4, 0.3, 'triangle', 0.4, 50); noise(0.1, 0.5, 0.3, 3000); cheer(0.3); };
SFX.sproing = function(f){ f=f||260; tone(f, 0, 0.25, 'square', 0.14, f*2.2); tone(f*0.5, 0, 0.25, 'triangle', 0.14, f*1.1); };
SFX.boinghit = function(){ tone(180, 0, 0.5, 'square', 0.25, 900); tone(90, 0, 0.5, 'triangle', 0.25, 450); noise(0, 0.2, 0.6, 2500); for(let i=0;i<10;i++) tone(1400+Math.random()*1800, 0.15+i*0.05, 0.25, 'sine', 0.06); cheer(0.4); };

Object.assign(ANIMS, {
  /* moonland — a lunar module lands on a state-shaped moon, plants a flag, and the donkey hops around in low gravity */
  moonland({W,H,r,hit}){
    const A = {dur:9, struck:false, struckAt:0}; SFX.lander();
    const st=STATES[r.st]||STATES.TX, path=new Path2D(st.d), box=stBox(st);
    const msc=Math.min(W*0.62/box.w, H*0.5/box.h), mx=W*0.5, my=H*0.62;
    const L=Math.min(H*0.2,220), landY=my-box.h*msc*0.12, landT=2.6;
    const stars=[]; for(let i=0;i<70;i++) stars.push({x:rr(0,W),y:rr(0,H*0.7),r:rr(1.5,4),p:rr(0,6)});
    const craters=[]; for(let i=0;i<8;i++) craters.push({x:rr(-0.42,0.42),y:rr(-0.4,0.4),r:rr(0.04,0.1)});
    const dust=[]; let lastBeep=-1, lastHop=-1;
    A.frame = t=>{
      ctx.lineJoin='round';
      // stars + earth
      ctx.fillStyle='#FFE34D'; for(const s of stars){ ctx.globalAlpha=0.45+0.55*Math.abs(Math.sin(t*3+s.p)); ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,7); ctx.fill(); } ctx.globalAlpha=1;
      const ex=W*0.12, ey=H*0.2, er=H*0.08; ctx.strokeStyle=C.ink; ctx.lineWidth=5; dot(ex,ey,er,'#2E6FE0'); ctx.beginPath(); ctx.arc(ex,ey,er,0,7); ctx.stroke();
      ctx.save(); ctx.beginPath(); ctx.arc(ex,ey,er,0,7); ctx.clip(); ctx.fillStyle='#7FAAF6'; ctx.beginPath(); ctx.ellipse(ex-er*0.3,ey-er*0.25,er*0.4,er*0.28,0.5,0,7); ctx.fill(); ctx.beginPath(); ctx.ellipse(ex+er*0.4,ey+er*0.3,er*0.35,er*0.22,-0.4,0,7); ctx.fill(); ctx.restore();
      // the moon (it's the state)
      ctx.save(); ctx.translate(mx,my); ctx.scale(msc,msc); ctx.translate(-box.cx,-box.cy); ctx.fillStyle='#BFBBB2'; ctx.strokeStyle=C.ink; ctx.lineWidth=5/msc; ctx.fill(path);
      ctx.save(); ctx.clip(path); ctx.fillStyle='#8C8A84'; for(const c of craters){ ctx.beginPath(); ctx.arc(box.cx+c.x*box.w, box.cy+c.y*box.h, c.r*box.w, 0, 7); ctx.fill(); } ctx.restore(); ctx.stroke(path); ctx.restore();
      label2(r.st+' MOON BASE', W*0.2, H*0.6, H*0.05, '#fff');
      // lander descent
      const u=Math.min(1,t/landT); const ly = -L*1.6 + (landY+L*1.6)*easeOut(u); const lx = mx + Math.sin(t*1.7)*W*0.03*(1-u);
      if(!A.struck){ const b=Math.floor(t*3); if(b!==lastBeep){ lastBeep=b; SFX.landerBeep(); }
        // flame
        const fl=L*(0.5+Math.random()*0.45)*(1-u*0.7); ctx.fillStyle='#FFE34D'; ctx.beginPath(); ctx.moveTo(lx-L*0.17,ly-L*0.2); ctx.lineTo(lx+L*0.17,ly-L*0.2); ctx.lineTo(lx,ly-L*0.2+fl); ctx.closePath(); ctx.fill();
        ctx.fillStyle='#F0562A'; ctx.beginPath(); ctx.moveTo(lx-L*0.09,ly-L*0.2); ctx.lineTo(lx+L*0.09,ly-L*0.2); ctx.lineTo(lx,ly-L*0.2+fl*0.55); ctx.closePath(); ctx.fill();
        if(u>0.8) puff(dust, lx+rr(-L*0.3,L*0.3), landY, 1, 6, 1); }
      // altimeter HUD
      const alt=Math.max(0,Math.round((landY-ly)/(landY+L*1.6)*1200));
      ctx.textAlign='right'; ctx.font=`900 ${Math.round(H*0.04)}px Archivo, sans-serif`; ctx.textBaseline='middle'; ctx.strokeStyle=C.ink; ctx.lineWidth=5; ctx.strokeText(`ALT ${alt} m`, W*0.96, H*0.12); ctx.fillStyle = alt? '#FFE34D':'#7FAAF6'; ctx.fillText(`ALT ${alt} m`, W*0.96, H*0.12);
      ctx.strokeText(A.struck? 'THE EAGLE HAS LANDED' : 'DESCENT', W*0.96, H*0.17); ctx.fillText(A.struck? 'THE EAGLE HAS LANDED' : 'DESCENT', W*0.96, H*0.17); ctx.textAlign='center';
      dustStep(dust,'#F3EFE4');
      // flag (after landing)
      if(A.struck){ const f=Math.min(1,(t-A.struckAt-0.4)/0.5); if(f>0){ const fx=lx+L*0.95, ph=L*1.1; ctx.strokeStyle=C.ink; ctx.lineWidth=6; ctx.beginPath(); ctx.moveTo(fx,landY); ctx.lineTo(fx,landY-ph); ctx.stroke(); dot(fx,landY-ph,L*0.05,'#FFE34D');
          const fw=L*0.8*f, fh=L*0.45; ctx.fillStyle='#2E6FE0'; ctx.beginPath(); ctx.moveTo(fx,landY-ph); for(let i=0;i<=6;i++) ctx.lineTo(fx+fw*i/6, landY-ph+Math.sin(t*5+i)*fh*0.06*f); for(let i=6;i>=0;i--) ctx.lineTo(fx+fw*i/6, landY-ph+fh+Math.sin(t*5+i)*fh*0.06*f); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.fillStyle='#FFE34D'; ctx.fillRect(fx,landY-ph+fh*0.42,fw,fh*0.16); if(f>=1) label(r.st, fx+fw/2, landY-ph+fh*0.5, fh*0.5, '#fff'); } }
      // the lander
      ctx.save(); ctx.translate(lx,ly); ctx.strokeStyle=C.ink; ctx.lineCap='round';
      for(const d of [-1,1]){ ctx.lineWidth=L*0.07; ctx.beginPath(); ctx.moveTo(d*L*0.35,-L*0.55); ctx.lineTo(d*L*0.72,-L*0.02); ctx.stroke(); ctx.lineWidth=L*0.035; ctx.beginPath(); ctx.moveTo(d*L*0.4,-L*0.35); ctx.lineTo(d*L*0.6,-L*0.2); ctx.stroke(); ctx.fillStyle='#FFE34D'; ctx.lineWidth=4; roundRect(d*L*0.72-L*0.14,-L*0.06,L*0.28,L*0.08,L*0.03); ctx.fill(); ctx.stroke(); }
      ctx.lineWidth=5; ctx.fillStyle='#8C8A84'; ctx.beginPath(); ctx.moveTo(-L*0.15,-L*0.42); ctx.lineTo(L*0.15,-L*0.42); ctx.lineTo(L*0.24,-L*0.18); ctx.lineTo(-L*0.24,-L*0.18); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#FFE34D'; roundRect(-L*0.48,-L*0.78,L*0.96,L*0.38,L*0.08); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#8C8A84'; ctx.beginPath(); ctx.moveTo(-L*0.3,-L*1.32); ctx.lineTo(L*0.3,-L*1.32); ctx.lineTo(L*0.42,-L*1.18); ctx.lineTo(L*0.42,-L*0.9); ctx.lineTo(L*0.3,-L*0.78); ctx.lineTo(-L*0.3,-L*0.78); ctx.lineTo(-L*0.42,-L*0.9); ctx.lineTo(-L*0.42,-L*1.18); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(-L*0.25,-L*1.32); ctx.lineTo(-L*0.25,-L*1.6); ctx.stroke(); ctx.fillStyle='#BFBBB2'; ctx.beginPath(); ctx.arc(-L*0.25,-L*1.62,L*0.1,Math.PI*0.9,Math.PI*2.1); ctx.fill(); ctx.stroke();
      // porthole with the donkey looking out
      ctx.lineWidth=5; dot(L*0.06,-L*1.05,L*0.2,'#fff'); ctx.beginPath(); ctx.arc(L*0.06,-L*1.05,L*0.2,0,7); ctx.stroke();
      ctx.save(); ctx.beginPath(); ctx.arc(L*0.06,-L*1.05,L*0.2,0,7); ctx.clip(); donkeyHead(L*0.06-L*0.16,-L*1.15,L*0.42); ctx.restore();
      ctx.restore();
      // hopping astronaut donkey
      if(A.struck && t>A.struckAt+0.9){ const s=L*0.22, p=t-A.struckAt-0.9, hop=1.4, k=Math.floor(p/hop), q=(p%hop)/hop; const hx=lx-L*1.2-Math.sin(p*0.6)*L*0.6, hy=landY-s*0.9-Math.sin(q*Math.PI)*L*0.7;
        if(k!==lastHop){ lastHop=k; if(k>0) puff(dust,hx,landY,8,5,1.5); }
        ctx.save(); ctx.translate(hx,hy); ctx.scale(-1,1); donkeyBody(s); donkeyLegs(s,p*4,0.5); donkeyTail(s,p*3);
        // fishbowl helmet
        ctx.strokeStyle=C.ink; ctx.lineWidth=4; ctx.fillStyle='#7FAAF6'; ctx.globalAlpha=0.35; ctx.beginPath(); ctx.arc(s*1.52,-s*0.95,s*0.55,0,7); ctx.fill(); ctx.globalAlpha=1; ctx.stroke(); ctx.restore(); }
      if(!A.struck && t>=landT){ A.struck=true; A.struckAt=t; hit('TOUCHDOWN!','touchdown'); puff(dust,lx,landY,40,12,3); } };
    return A;
  },

  /* sumo — the donkey (blue mawashi) and a red blob square off on the dohyō; shiko stomps, charge, and the blob goes flying */
  sumo({W,H,r,hit,shake}){
    const A = {dur:8.5, struck:false, struckAt:0}; SFX.taiko();
    const cx=W*0.5, cy=H*0.74, rx=Math.min(W*0.3,600), ry=rx*0.36, S=Math.min(H*0.2,230), hitT=2.2, sep=rx*0.55;
    const dust=[], sweat=[]; let lastStomp=-1;
    const wrestler=(x,y,dir,kind,pose)=>{ ctx.save(); ctx.translate(x,y); ctx.scale(dir,1); if(pose.spin) ctx.rotate(pose.spin); ctx.rotate(pose.lean||0); ctx.scale(1,1-(pose.crouch||0)*0.18);
      const col = kind==='d'? '#2E6FE0':'#F0562A', belt = kind==='d'? '#1E2A44':'#8C8A84'; ctx.strokeStyle=C.ink; ctx.lineWidth=5; ctx.lineJoin='round';
      // legs (the back one lifts for shiko)
      for(const [lx,lift] of [[-S*0.3,pose.lift||0],[S*0.3,pose.liftR||0]]){ ctx.save(); ctx.translate(lx,-S*0.62); ctx.rotate(lift*1.3*(lx<0?1:-1)); ctx.fillStyle=col; roundRect(-S*0.15,0,S*0.3,S*0.55,S*0.1); ctx.fill(); ctx.stroke(); roundRect(-S*0.22,S*0.48,S*0.44,S*0.15,S*0.06); ctx.fill(); ctx.stroke(); ctx.restore(); }
      // belly
      ctx.fillStyle=col; ctx.beginPath(); ctx.ellipse(0,-S*1.05,S*0.7,S*0.6,0,0,7); ctx.fill(); ctx.stroke(); dot(S*0.1,-S*0.95,S*0.05,C.ink);
      // mawashi
      ctx.fillStyle=belt; roundRect(-S*0.72,-S*0.8,S*1.44,S*0.24,S*0.08); ctx.fill(); ctx.stroke(); roundRect(-S*0.13,-S*0.8,S*0.26,S*0.48,S*0.06); ctx.fill(); ctx.stroke();
      // arms
      ctx.fillStyle=col; for(const [ax,base] of [[-S*0.55,1],[S*0.55,-1]]){ const a = pose.arm!=null? pose.arm : pose.armsUp? base*2.6 : base*0.45; ctx.save(); ctx.translate(ax,-S*1.35); ctx.rotate(a); roundRect(-S*0.13,0,S*0.26,S*0.55,S*0.1); ctx.fill(); ctx.stroke(); dot(0,S*0.6,S*0.16,col); ctx.beginPath(); ctx.arc(0,S*0.6,S*0.16,0,7); ctx.stroke(); ctx.restore(); }
      if(kind==='d'){ ctx.fillStyle=col; ctx.fillRect(-S*0.18,-S*1.8,S*0.36,S*0.25); ctx.strokeRect(-S*0.18,-S*1.8,S*0.36,S*0.25); donkeyHead(-S*0.22,-S*2.1,S*0.85);
        ctx.lineWidth=5; ctx.beginPath(); ctx.moveTo(S*0.15,-S*2.02); ctx.lineTo(S*0.35,-S*1.96); ctx.stroke(); // determined brow
        ctx.fillStyle=C.ink; roundRect(-S*0.05,-S*2.22,S*0.3,S*0.1,S*0.04); ctx.fill(); } // chonmage
      else { ctx.fillStyle=col; ctx.fillRect(-S*0.2,-S*1.75,S*0.4,S*0.2); ctx.strokeRect(-S*0.2,-S*1.75,S*0.4,S*0.2); dot(0,-S*1.9,S*0.36,col); ctx.beginPath(); ctx.arc(0,-S*1.9,S*0.36,0,7); ctx.stroke();
        dot(S*0.14,-S*1.95,S*0.1,'#fff'); dot(-S*0.1,-S*1.95,S*0.1,'#fff'); dot(S*0.17,-S*1.95,S*0.045,C.ink); dot(-S*0.07,-S*1.95,S*0.045,C.ink);
        ctx.lineWidth=5; ctx.beginPath(); ctx.moveTo(-S*0.22,-S*2.12); ctx.lineTo(-S*0.02,-S*2.05); ctx.moveTo(S*0.26,-S*2.14); ctx.lineTo(S*0.06,-S*2.05); ctx.stroke();
        if(pose.spin){ dot(S*0.06,-S*1.7,S*0.1,C.ink); } else { ctx.beginPath(); ctx.arc(S*0.06,-S*1.68,S*0.12,Math.PI*1.15,Math.PI*1.85); ctx.stroke(); }
        ctx.fillStyle=C.ink; roundRect(-S*0.25,-S*2.36,S*0.4,S*0.12,S*0.05); ctx.fill(); ctx.beginPath(); ctx.arc(-S*0.05,-S*2.26,S*0.15,Math.PI,0); ctx.fill(); }
      ctx.restore(); };
    A.frame = t=>{
      ctx.lineJoin='round';
      // dohyō
      ctx.fillStyle='#D9B36A'; ctx.strokeStyle=C.ink; ctx.lineWidth=8; ctx.beginPath(); ctx.ellipse(cx,cy+ry*0.15,rx*1.2,ry*1.25,0,0,7); ctx.fill(); ctx.stroke();
      ctx.strokeStyle=C.ink; ctx.lineWidth=16; ctx.beginPath(); ctx.ellipse(cx,cy,rx,ry,0,0,7); ctx.stroke(); ctx.strokeStyle='#FFE34D'; ctx.lineWidth=8; ctx.setLineDash([26,18]); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle='#fff'; ctx.lineWidth=6; ctx.beginPath(); ctx.moveTo(cx-S*0.35,cy-ry*0.25); ctx.lineTo(cx-S*0.35,cy+ry*0.25); ctx.moveTo(cx+S*0.35,cy-ry*0.25); ctx.lineTo(cx+S*0.35,cy+ry*0.25); ctx.stroke();
      // gyōji (referee) behind
      const gx=cx, gy=cy-ry*0.8, gs=S*0.75; ctx.fillStyle='#7FAAF6'; ctx.strokeStyle=C.ink; ctx.lineWidth=5; ctx.beginPath(); ctx.moveTo(gx-gs*0.42,gy); ctx.lineTo(gx+gs*0.42,gy); ctx.lineTo(gx+gs*0.18,gy-gs*0.9); ctx.lineTo(gx-gs*0.18,gy-gs*0.9); ctx.closePath(); ctx.fill(); ctx.stroke();
      dot(gx,gy-gs*1.1,gs*0.24,'#F2C9A0'); ctx.beginPath(); ctx.arc(gx,gy-gs*1.1,gs*0.24,0,7); ctx.stroke(); ctx.fillStyle=C.ink; ctx.beginPath(); ctx.moveTo(gx-gs*0.2,gy-gs*1.25); ctx.lineTo(gx+gs*0.2,gy-gs*1.25); ctx.lineTo(gx,gy-gs*1.55); ctx.closePath(); ctx.fill();
      dot(gx-gs*0.07,gy-gs*1.12,gs*0.03,C.ink); dot(gx+gs*0.07,gy-gs*1.12,gs*0.03,C.ink);
      const fa = A.struck? -2.4 : -0.9 + Math.sin(t*2)*0.1; ctx.save(); ctx.translate(gx+gs*0.3,gy-gs*0.5); ctx.rotate(fa); ctx.lineWidth=5; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0,-gs*0.55); ctx.stroke(); ctx.fillStyle='#FFE34D'; ctx.beginPath(); ctx.moveTo(0,-gs*0.55); ctx.arc(0,-gs*0.55,gs*0.3,Math.PI*1.1,Math.PI*1.9); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
      // poses
      let dx=cx-sep, bx=cx+sep, by=cy, dpose={}, bpose={}, dy=cy;
      if(t<1.6){ const k=Math.floor(t/0.8), p=(t%0.8)/0.8; const lift = p<0.55? ease(p/0.55) : p<0.7? 1-ease((p-0.55)/0.15) : 0; dpose.lift=bpose.lift=lift;
        if(p>=0.7 && k!==lastStomp){ lastStomp=k; SFX.shiko(); shake(); puff(dust,dx-S*0.3,cy,10,6,1.5); puff(dust,bx+S*0.3,cy,10,6,1.5); } }
      else if(t<hitT){ const p=ease((t-1.6)/(hitT-1.6)); dpose.crouch=bpose.crouch=0.8*(1-p); dpose.lean=bpose.lean=0.18*p; dpose.arm=bpose.arm=-1.3+(1-p)*0.8; dx=cx-sep+(sep-S*0.72)*p; bx=cx+sep-(sep-S*0.72)*p; }
      else { const f=t-hitT; dx=cx-S*0.72+Math.min(1,f/0.4)*S*0.6; if(f<1.2){ dpose.lean=0.3; dpose.arm=-1.3; } else { dpose.armsUp=true; dy=cy-Math.abs(Math.sin((f-1.2)*7))*S*0.12; }
        bx=cx+S*0.72+f*W*0.17; by=cy-Math.sin(Math.min(f*0.95,Math.PI))*H*0.42+Math.max(0,f-3.3)*H*0.4; bpose.spin=f*4; bpose.lift=bpose.liftR=0.7; bpose.armsUp=true;
        if(f<2.5 && Math.random()<0.6) sweat.push({x:bx+rr(-S*0.3,S*0.3),y:by-S*1.8,vx:rr(-5,5),vy:rr(-7,-2),a:1}); }
      dustStep(dust);
      wrestler(dx,dy,1,'d',dpose);
      if(by<H+S*3) wrestler(bx,by,-1,'r',bpose);
      ctx.fillStyle='#7FAAF6'; for(const s of sweat){ s.x+=s.vx; s.y+=s.vy; s.vy+=0.4; s.a-=0.03; ctx.globalAlpha=Math.max(0,s.a); ctx.beginPath(); ctx.arc(s.x,s.y,7,0,7); ctx.fill(); } ctx.globalAlpha=1; for(let i=sweat.length-1;i>=0;i--) if(sweat[i].a<=0) sweat.splice(i,1);
      // impact burst
      if(A.struck && t<A.struckAt+0.35){ const f=(t-A.struckAt)/0.35; ctx.strokeStyle='#FFE34D'; ctx.lineWidth=8; ctx.beginPath(); for(let i=0;i<10;i++){ const a=i/10*Math.PI*2+0.3; ctx.moveTo(cx+Math.cos(a)*S*(0.6+f*0.6),cy-S*1.2+Math.sin(a)*S*(0.6+f*0.6)); ctx.lineTo(cx+Math.cos(a)*S*(1.0+f*1.2),cy-S*1.2+Math.sin(a)*S*(1.0+f*1.2)); } ctx.stroke(); }
      if(A.struck && t>A.struckAt+1.4) label2(r.st+' WINS', cx, H*0.16, H*0.07, '#FFE34D');
      if(!A.struck && t>=hitT){ A.struck=true; A.struckAt=t; hit('DOSUKOI!','dosukoi'); puff(dust,cx,cy,30,14,4); } };
    return A;
  },

  /* hotdog — a hot-dog eating contest: state-shaped dogs fly into the donkey, the scoreboard spins to 74, and a champion belt buckle drops */
  hotdog({W,H,r,hit}){
    const A = {dur:9, struck:false, struckAt:0}; SFX.tableBell();
    const st=STATES[r.st]||STATES.TX, path=new Path2D(st.d), box=stBox(st);
    const S=Math.min(H*0.17,190), tableY=H*0.74, tw=Math.min(W*0.72,1400), tx=W*0.5;
    const dx=W*0.66, dy=tableY-S*0.5, mouthX=dx-S*1.85, mouthY=dy-S*0.72, px=W*0.27, py=tableY-S*0.12;
    const hw=S*1.3, hh=S*0.45, hsc=Math.min(hw*0.85/box.w, hh*0.95/box.h); const P=0.32, T0=0.5, FL=0.45, hitT=3.05;
    const pile=[]; for(let i=0;i<6;i++) pile.push({x:px+(i<3? (i-1)*hw*0.55 : i<5? (i-3.5)*hw*0.55 : 0), y:py-(i<3?0:i<5?hh*0.9:hh*1.8), a:rr(-0.12,0.12)});
    const crumbs=[]; let eaten=0, lastChomp=-1;
    const hotdog=(x,y,rot,sc)=>{ ctx.save(); ctx.translate(x,y); ctx.rotate(rot||0); if(sc) ctx.scale(sc,sc); ctx.fillStyle='#E8B860'; ctx.strokeStyle=C.ink; ctx.lineWidth=4; ctx.lineJoin='round'; roundRect(-hw/2,-hh/2,hw,hh,hh/2); ctx.fill(); ctx.stroke();
      ctx.translate(0,-hh*0.08); ctx.scale(hsc,hsc); ctx.translate(-box.cx,-box.cy); ctx.fillStyle='#F0562A'; ctx.lineWidth=3/hsc; ctx.fill(path); ctx.stroke(path); ctx.setTransform(ctx.getTransform()); ctx.restore();
      ctx.save(); ctx.translate(x,y); ctx.rotate(rot||0); if(sc) ctx.scale(sc,sc); ctx.strokeStyle='#FFE34D'; ctx.lineWidth=hh*0.12; ctx.lineCap='round'; ctx.beginPath(); for(let i=0;i<=6;i++) ctx.lineTo(-hw*0.36+i*hw*0.12, -hh*0.1+(i%2?hh*0.14:-hh*0.14)); ctx.stroke(); ctx.restore(); };
    A.frame = t=>{
      ctx.lineJoin='round';
      // scoreboard
      const bw=Math.min(W*0.46,860), bh=H*0.2, bx=W*0.5-bw/2, by=H*0.07; ctx.fillStyle='#1E2A44'; ctx.strokeStyle=C.ink; ctx.lineWidth=8; roundRect(bx,by,bw,bh,18); ctx.fill(); ctx.stroke(); ctx.strokeStyle='#FFE34D'; ctx.lineWidth=5; roundRect(bx+10,by+10,bw-20,bh-20,12); ctx.stroke();
      const raw = A.struck? 74 : Math.min(74, t*t*8.2); const n=Math.floor(raw); label(r.st+' DOGS EATEN', W*0.5, by+bh*0.26, bh*0.2, '#FFE34D');
      ctx.save(); ctx.beginPath(); ctx.rect(bx,by+bh*0.4,bw,bh*0.55); ctx.clip(); const roll=(raw-n)*bh*0.5*(A.struck?0:1); label(String(n).padStart(2,'0'), W*0.5, by+bh*0.68+roll, bh*0.5, A.struck && Math.sin(t*12)>0? '#FFE34D':'#fff'); if(!A.struck) label(String(n+1).padStart(2,'0'), W*0.5, by+bh*0.68+roll-bh*0.5, bh*0.5, '#fff'); ctx.restore();
      // the donkey (faces left, sits behind the table)
      const bulge = A.struck? ease((t-A.struckAt)/0.8) : 0; const jiggle = A.struck? Math.sin((t-A.struckAt)*9)*0.04*Math.max(0,1-(t-A.struckAt)/2) : 0;
      ctx.save(); ctx.translate(dx,dy); ctx.scale(-1,1); donkeyLegs(S,0,0); donkeyBody(S); donkeyTail(S,t*4);
      ctx.fillStyle='#2E6FE0'; ctx.strokeStyle=C.ink; ctx.lineWidth=5; ctx.beginPath(); ctx.ellipse(-S*0.15,S*0.1,S*(0.85+0.45*bulge),S*(0.35+0.45*bulge)*(1+jiggle),0,0,7); ctx.fill(); ctx.stroke();
      // jaw
      let open=0; for(let i=0;i<40;i++){ const ta=T0+i*P+FL; if(ta>hitT+0.3) break; const p=(t-(ta-0.25))/0.35; if(p>0&&p<1) open=Math.max(open, p<0.7? ease(p/0.7) : 1-ease((p-0.7)/0.3)); }
      if(A.struck && t>A.struckAt+1.2) open=0.25+Math.sin(t*3)*0.05; // satisfied grin
      if(open>0.05){ const a=open*0.75; ctx.fillStyle=C.ink; ctx.beginPath(); ctx.moveTo(S*1.15,-S*0.68); ctx.lineTo(S*1.87,-S*0.68); ctx.lineTo(S*1.15+Math.cos(a)*S*0.72,-S*0.68+Math.sin(a)*S*0.72); ctx.closePath(); ctx.fill(); ctx.fillStyle='#F0562A'; ctx.beginPath(); ctx.ellipse(S*1.3+Math.cos(a)*S*0.2,-S*0.68+Math.sin(a)*S*0.35,S*0.16,S*0.1,a,0,7); ctx.fill(); }
      ctx.save(); ctx.translate(S*1.15,-S*0.68); ctx.rotate(open*0.75); ctx.fillStyle='#2E6FE0'; roundRect(0,0,S*0.72,S*0.2,S*0.07); ctx.fill(); ctx.stroke(); ctx.fillStyle='#fff'; ctx.fillRect(S*0.15,0,S*0.5,S*0.07); ctx.restore();
      // bib
      ctx.fillStyle='#fff'; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(S*0.95,-S*0.5); ctx.lineTo(S*1.3,-S*0.3); ctx.lineTo(S*1.1,S*0.3); ctx.lineTo(S*0.55,S*0.35); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle='#F0562A'; for(const [cxx,cyy] of [[S*0.95,-S*0.05],[S*1.05,S*0.15],[S*0.8,S*0.2]]) dot(cxx,cyy,S*0.045,'#F0562A');
      ctx.restore();
      // table + cloth + pile
      ctx.fillStyle='#F0562A'; ctx.strokeStyle=C.ink; ctx.lineWidth=6; ctx.fillRect(tx-tw/2,tableY,tw,H-tableY); ctx.strokeRect(tx-tw/2,tableY,tw,H-tableY+20); ctx.fillStyle='#fff'; for(let x=tx-tw/2+30;x<tx+tw/2-60;x+=140) ctx.fillRect(x,tableY+30,70,H);
      ctx.fillStyle='#A8713A'; roundRect(tx-tw/2-20,tableY-S*0.12,tw+40,S*0.2,10); ctx.fill(); ctx.stroke();
      for(const h of pile) hotdog(h.x,h.y-hh/2,h.a);
      // mustard bottle + cup
      const ox=tx+tw/2-S*1.3, cxp=tx+tw/2-S*0.7; ctx.fillStyle='#FFE34D'; roundRect(ox,tableY-S*0.75,S*0.3,S*0.65,S*0.08); ctx.fill(); ctx.stroke(); ctx.fillStyle=C.ink; ctx.beginPath(); ctx.moveTo(ox+S*0.08,tableY-S*0.75); ctx.lineTo(ox+S*0.22,tableY-S*0.75); ctx.lineTo(ox+S*0.15,tableY-S*0.95); ctx.closePath(); ctx.fill();
      ctx.fillStyle='#7FAAF6'; ctx.beginPath(); ctx.moveTo(cxp,tableY-S*0.7); ctx.lineTo(cxp+S*0.32,tableY-S*0.7); ctx.lineTo(cxp+S*0.27,tableY-S*0.12); ctx.lineTo(cxp+S*0.05,tableY-S*0.12); ctx.closePath(); ctx.fill(); ctx.stroke();
      // flying dogs
      for(let i=0;i<40;i++){ const t1=T0+i*P; if(t1>hitT) break; const q=(t-t1)/FL; if(q<0) break; if(q>=1){ if(i>lastChomp){ lastChomp=i; eaten++; SFX.chomp(); for(let k=0;k<6;k++) crumbs.push({x:mouthX,y:mouthY,vx:rr(-6,2),vy:rr(-6,-1),a:1,c:k%2?'#E8B860':'#F0562A'}); } continue; }
        const x=px+(mouthX-px)*q, y=py-hh*1.8+(mouthY-py+hh*1.8)*q-Math.sin(q*Math.PI)*H*0.25; hotdog(x,y,q*4,1-q*0.35); }
      for(const c of crumbs){ c.x+=c.vx; c.y+=c.vy; c.vy+=0.5; c.a-=0.02; ctx.globalAlpha=Math.max(0,c.a); ctx.fillStyle=c.c; ctx.fillRect(c.x,c.y,8,8); } ctx.globalAlpha=1; for(let i=crumbs.length-1;i>=0;i--) if(crumbs[i].a<=0) crumbs.splice(i,1);
      // champion belt buckle
      if(A.struck){ const f=t-A.struckAt-0.3; if(f>0){ const u=Math.min(1,f/0.8); const kx=dx-S*0.15, ky=-H*0.2+(dy+S*0.1+H*0.2)*easeOut(u)+Math.sin(Math.max(0,f-0.8)*6)*Math.exp(-(f-0.8)*2)*S*0.15; const kw=S*1.8, kh=S*1.0;
          ctx.save(); ctx.translate(kx,ky); ctx.rotate(Math.sin(f*4)*0.08*(1-u)+(u>=1? Math.sin(f*5)*0.03:0)); ctx.fillStyle='#FFE34D'; ctx.strokeStyle=C.ink; ctx.lineWidth=7; roundRect(-kw/2,-kh/2,kw,kh,S*0.2); ctx.fill(); ctx.stroke(); ctx.lineWidth=4; roundRect(-kw/2+S*0.1,-kh/2+S*0.1,kw-S*0.2,kh-S*0.2,S*0.14); ctx.stroke();
          for(const sx of [-kw*0.4,kw*0.4]){ ctx.fillStyle=C.ink; ctx.beginPath(); for(let i=0;i<10;i++){ const a=i*Math.PI/5-Math.PI/2, rad=i%2?S*0.05:S*0.11; ctx.lineTo(sx+Math.cos(a)*rad,kh*0.24+Math.sin(a)*rad); } ctx.closePath(); ctx.fill(); }
          label('CHAMP',0,-kh*0.14,S*0.26); label(r.st,0,kh*0.24,S*0.28,'#F0562A'); ctx.restore(); } }
      if(!A.struck && t>=hitT){ A.struck=true; A.struckAt=t; hit('CHAMPION!','champion'); } };
    return A;
  },

  /* parade — marching band and a giant inflatable state balloon pulled along by rope-wrangling donkeys */
  parade({W,H,r,hit,spawnConfetti}){
    const A = {dur:9, struck:false, struckAt:0}; SFX.oompah(); let bands=1;
    const st=STATES[r.st]||STATES.TX, path=new Path2D(st.d), box=stBox(st);
    const bsc=Math.min(W*0.36/box.w, H*0.36/box.h), bw=box.w*bsc/2, bhh=box.h*bsc/2, by0=H*0.36, gy=H*0.86, s=Math.min(H*0.07,78);
    const v=W*0.075, x0=W*0.5-v*2.5, offs=[-0.2,-0.07,0.07,0.2], notes=[]; let lastBeat=-1;
    const nflags=Math.ceil(W/70)+1, fcols=['#2E6FE0','#FFE34D','#F0562A'];
    const donkey=(x,y,s,ph)=>{ ctx.save(); ctx.translate(x,y+Math.abs(Math.sin(ph))*-s*0.06); donkeyBody(s); donkeyLegs(s,ph); donkeyTail(s,ph*0.5); ctx.restore(); };
    A.frame = t=>{
      ctx.lineJoin='round';
      const bx=x0+v*t, by=by0+Math.sin(t*1.5)*H*0.02, tilt=Math.sin(t*0.9)*0.06, bb=by+bhh;
      const beat=Math.floor(t*2.5); const onBeat = beat!==lastBeat; if(onBeat) lastBeat=beat;
      // street + bunting
      ctx.fillStyle='#8C8A84'; ctx.fillRect(0,gy,W,H-gy); ctx.strokeStyle=C.ink; ctx.lineWidth=5; ctx.beginPath(); ctx.moveTo(0,gy); ctx.lineTo(W,gy); ctx.stroke(); ctx.fillStyle='#FFE34D'; for(let x=20;x<W;x+=130) ctx.fillRect(x,gy+(H-gy)*0.5,70,10);
      ctx.strokeStyle=C.ink; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(0,H*0.05); ctx.quadraticCurveTo(W/2,H*0.13,W,H*0.05); ctx.stroke();
      for(let i=0;i<nflags;i++){ const u=i/(nflags-1), fx=u*W, fy=(1-u)*(1-u)*H*0.05+2*(1-u)*u*H*0.13+u*u*H*0.05; ctx.fillStyle=fcols[i%3]; ctx.beginPath(); ctx.moveTo(fx-26,fy); ctx.lineTo(fx+26,fy); ctx.lineTo(fx+Math.sin(t*3+i)*6,fy+46); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      // bass drum donkey (back of the line)
      const ddx=bx-W*0.56; if(ddx>-s*4 && ddx<W+s*4){ donkey(ddx,gy-s*0.9,s,t*8+2); const dr=s*0.95, dcx=ddx+s*2.4, dcy=gy-s*1.1; ctx.fillStyle='#F0562A'; ctx.strokeStyle=C.ink; ctx.lineWidth=5; ctx.beginPath(); ctx.arc(dcx,dcy,dr,0,7); ctx.fill(); ctx.stroke(); ctx.strokeStyle='#fff'; ctx.lineWidth=8; ctx.beginPath(); ctx.arc(dcx,dcy,dr*0.78,0,7); ctx.stroke(); label(r.st,dcx,dcy,dr*0.6,'#fff');
        const ma=-0.6+Math.abs(Math.sin(t*2.5*Math.PI))*0.9; ctx.strokeStyle=C.ink; ctx.lineWidth=6; ctx.lineCap='round'; ctx.beginPath(); ctx.moveTo(dcx+dr*1.3,dcy+dr*0.3); ctx.lineTo(dcx+dr*1.3-Math.cos(ma)*dr*1.1,dcy+dr*0.3-Math.sin(ma)*dr*1.1); ctx.stroke(); ctx.lineCap='butt'; dot(dcx+dr*1.3-Math.cos(ma)*dr*1.1,dcy+dr*0.3-Math.sin(ma)*dr*1.1,s*0.16,'#FFE34D'); }
      // tuba donkeys
      for(let k=0;k<2;k++){ const txx=bx-W*(0.33+k*0.1); if(txx<-s*4||txx>W+s*4) continue; donkey(txx,gy-s*0.9,s,t*8+k); const pulse=1+0.08*Math.abs(Math.sin(t*2.5*Math.PI)); ctx.strokeStyle=C.ink; ctx.lineWidth=s*0.16; ctx.beginPath(); ctx.moveTo(txx-s*0.2,gy-s*1.2); ctx.quadraticCurveTo(txx-s*1.2,gy-s*2.4,txx-s*0.1,gy-s*2.6); ctx.stroke(); ctx.strokeStyle='#FFE34D'; ctx.lineWidth=s*0.08; ctx.stroke();
        ctx.fillStyle='#FFE34D'; ctx.strokeStyle=C.ink; ctx.lineWidth=5; ctx.beginPath(); ctx.arc(txx-s*0.1,gy-s*2.75,s*0.75*pulse,0,7); ctx.fill(); ctx.stroke(); ctx.strokeStyle='#F0562A'; ctx.lineWidth=5; ctx.beginPath(); ctx.arc(txx-s*0.1,gy-s*2.75,s*0.45*pulse,0,7); ctx.stroke();
        if(onBeat && beat%2===k) notes.push({x:txx-s*0.1,y:gy-s*3.4,vx:rr(-1.5,1.5),vy:-rr(2,4),a:1,ph:rr(0,6)}); }
      // ropes → balloon → handlers
      ctx.strokeStyle=C.ink; ctx.lineWidth=4; ctx.beginPath(); for(let i=0;i<4;i++){ const hx=bx+offs[i]*W, hy=gy-s*0.9; ctx.moveTo(bx+offs[i]*W*0.45, bb-bhh*0.3); ctx.lineTo(hx+s*0.2, hy-s*0.3); } ctx.stroke();
      drawState(st,path,box,bx,by,bsc,tilt,'#2E6FE0'); ctx.globalAlpha=0.3; ctx.fillStyle='#fff'; ctx.beginPath(); ctx.ellipse(bx-bw*0.35,by-bhh*0.4,bw*0.22,bhh*0.16,-0.5,0,7); ctx.fill(); ctx.globalAlpha=1; label2(r.st,bx,by,H*0.1,'#fff');
      for(let i=0;i<4;i++) donkey(bx+offs[i]*W, gy-s*0.9, s, t*8+i*1.3);
      // baton twirlers ahead
      for(let k=0;k<2;k++){ const txx=bx+W*(0.27+k*0.1); if(txx>W+s*4) continue; donkey(txx,gy-s*0.9,s,t*8+k*2); const p=((t*0.85+k*0.5)%1), h=Math.sin(p*Math.PI)*H*0.3, cxx=txx+s*1.6, cyy=gy-s*2.2-h, ang=t*11+k; ctx.save(); ctx.translate(cxx,cyy); ctx.rotate(ang); ctx.strokeStyle=C.ink; ctx.lineWidth=s*0.1; ctx.beginPath(); ctx.moveTo(-s*0.8,0); ctx.lineTo(s*0.8,0); ctx.stroke(); dot(-s*0.8,0,s*0.17,'#F0562A'); dot(s*0.8,0,s*0.17,'#F0562A'); ctx.restore(); }
      // drum major with a tall shako and a spinning mace
      const mxx=bx+W*0.44; if(mxx<W+s*5){ donkey(mxx,gy-s*0.9,s,t*8); ctx.fillStyle='#F0562A'; ctx.strokeStyle=C.ink; ctx.lineWidth=4; roundRect(mxx+s*1.15,gy-s*0.9-s*1.85,s*0.7,s*0.75,s*0.08); ctx.fill(); ctx.stroke(); ctx.fillStyle='#FFE34D'; ctx.fillRect(mxx+s*1.15,gy-s*0.9-s*1.85,s*0.7,s*0.14); dot(mxx+s*1.5,gy-s*0.9-s*2.05,s*0.16,'#FFE34D');
        ctx.save(); ctx.translate(mxx+s*2.0,gy-s*1.9); ctx.rotate(t*9); ctx.strokeStyle=C.ink; ctx.lineWidth=s*0.1; ctx.beginPath(); ctx.moveTo(0,-s*0.9); ctx.lineTo(0,s*0.9); ctx.stroke(); dot(0,-s*0.9,s*0.22,'#FFE34D'); dot(0,s*0.9,s*0.14,'#FFE34D'); ctx.restore(); }
      // notes
      for(const n of notes){ n.x+=n.vx+Math.sin(t*4+n.ph); n.y+=n.vy; n.a-=0.012; ctx.globalAlpha=Math.max(0,n.a); ctx.fillStyle=C.ink; ctx.beginPath(); ctx.ellipse(n.x,n.y,s*0.15,s*0.11,-0.4,0,7); ctx.fill(); ctx.fillRect(n.x+s*0.1,n.y-s*0.55,s*0.05,s*0.55); } ctx.globalAlpha=1; for(let i=notes.length-1;i>=0;i--) if(notes[i].a<=0) notes.splice(i,1);
      if(A.struck && t<A.struckAt+2) spawnConfetti(2, bx+rr(-bw,bw), bb);
      if(t>=bands*3.3 && bands<3){ bands++; SFX.oompah(); }
      if(!A.struck && t>=2.5){ A.struck=true; A.struckAt=t; hit('PARADE!','paradehit'); } };
    return A;
  },

  /* trampoline — the donkey bounces higher each time until it headbutts the state hanging from the ceiling, which rains confetti */
  trampoline({W,H,r,hit,spawnConfetti}){
    const A = {dur:9, struck:false, struckAt:0};
    const st=STATES[r.st]||STATES.TX, path=new Path2D(st.d), box=stBox(st);
    const sc=Math.min(W*0.22/box.w, H*0.22/box.h), sx0=W*0.5, sy0=H*0.24, sh=box.h*sc/2, swd=box.w*sc/2;
    const S=Math.min(H*0.1,115), mx=W*0.5, my=H*0.76, mw=Math.min(W*0.28,560), mh=H*0.04;
    const D=(my-S*0.9)-(sy0+sh+S*1.15); const bounces=[{T:0.8,h:0.3},{T:1.0,h:0.6},{T:1.3,h:1.0}];
    const ball={x:sx0,y:sy0,vx:0,vy:0,rot:0,vr:0,free:false}; let lastB=-1;
    const bounceAt=t=>{ let acc=0; for(let i=0;i<bounces.length;i++){ if(t<acc+bounces[i].T) return {i,u:(t-acc)/bounces[i].T,h:bounces[i].h,flip:false}; acc+=bounces[i].T; } const T=1.1, k=Math.floor((t-acc)/T); return {i:bounces.length+k,u:((t-acc)%T)/T,h:0.55,flip:true}; };
    A.frame = t=>{
      ctx.lineJoin='round';
      const b=bounceAt(t); if(b.i!==lastB){ lastB=b.i; SFX.sproing(200+Math.min(b.i,5)*70); }
      const air=Math.sin(b.u*Math.PI), dy=my-S*0.9-b.h*D*air, near=Math.max(0,1-Math.min(b.u,1-b.u)/0.1), dip=near*S*0.5;
      // height meter
      const rx=W*0.16, top=sy0+sh; ctx.strokeStyle=C.ink; ctx.lineWidth=6; ctx.beginPath(); ctx.moveTo(rx,my); ctx.lineTo(rx,top); ctx.stroke(); for(let i=0;i<=10;i++){ const yy=my-(my-top)*i/10; ctx.lineWidth= i%5? 4:6; ctx.beginPath(); ctx.moveTo(rx-(i%5?14:26),yy); ctx.lineTo(rx,yy); ctx.stroke(); }
      label2('MAX',rx,top-H*0.035,H*0.035,'#F0562A'); const py=dy+S*0.9-S*2.05; ctx.fillStyle='#FFE34D'; ctx.strokeStyle=C.ink; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(rx+10,py); ctx.lineTo(rx+50,py-18); ctx.lineTo(rx+50,py+18); ctx.closePath(); ctx.fill(); ctx.stroke();
      // trampoline
      ctx.strokeStyle=C.ink; ctx.lineWidth=14; ctx.lineCap='round'; ctx.beginPath(); for(const d of [-1,1]){ ctx.moveTo(mx+d*mw*0.42,my+mh*0.3); ctx.lineTo(mx+d*mw*0.5,H*0.95); ctx.moveTo(mx+d*mw*0.5,H*0.95); ctx.lineTo(mx+d*mw*0.36,H*0.95); } ctx.stroke(); ctx.lineCap='butt';
      ctx.strokeStyle='#FFE34D'; ctx.lineWidth=5; ctx.beginPath(); for(let i=0;i<22;i++){ const a=i/22*Math.PI*2; ctx.moveTo(mx+Math.cos(a)*mw*0.48,my+Math.sin(a)*mh*0.9); ctx.lineTo(mx+Math.cos(a)*(mw*0.5+18),my+Math.sin(a)*(mh+14)); } ctx.stroke();
      ctx.strokeStyle=C.ink; ctx.lineWidth=12; ctx.beginPath(); ctx.ellipse(mx,my,mw/2+20,mh+16,0,0,7); ctx.stroke();
      ctx.fillStyle='#1E2A44'; ctx.lineWidth=5; ctx.beginPath(); ctx.ellipse(mx,my,mw/2,mh,0,0,7); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(mx-mw/2,my); ctx.quadraticCurveTo(mx,my+2*mh+dip*2,mx+mw/2,my); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle='#7FAAF6'; ctx.lineWidth=3; ctx.beginPath(); for(let i=-3;i<=3;i++){ ctx.moveTo(mx+i*mw*0.12,my-mh*Math.sqrt(1-Math.pow(i*0.24,2))); ctx.lineTo(mx+i*mw*0.12,my+(mh+dip)*Math.sqrt(1-Math.pow(i*0.24,2))); } ctx.stroke();
      // rope + hanging state
      let sx=ball.x, sy=ball.y; if(!ball.free){ sx=sx0+Math.sin(t*1.3)*W*0.01; ball.x=sx; ctx.strokeStyle='#FFE34D'; ctx.lineWidth=8; ctx.beginPath(); ctx.moveTo(mx,0); ctx.lineTo(sx,sy-sh); ctx.stroke(); ctx.strokeStyle=C.ink; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(mx-4,0); ctx.lineTo(sx-4,sy-sh); ctx.moveTo(mx+4,0); ctx.lineTo(sx+4,sy-sh); ctx.stroke(); }
      else { ctx.strokeStyle='#FFE34D'; ctx.lineWidth=8; ctx.beginPath(); ctx.moveTo(mx,0); ctx.quadraticCurveTo(mx+Math.sin(t*4)*40,H*0.08,mx+Math.sin(t*3)*25,H*0.13); ctx.stroke();
        ball.vy+=0.55; ball.x+=ball.vx; ball.y+=ball.vy; ball.rot+=ball.vr; const onMat=Math.abs(ball.x-mx)<mw/2; const floor= onMat? my : H*0.95; if(ball.y+sh>floor && ball.vy>0){ ball.y=floor-sh; ball.vy*=-0.5; ball.vx*=0.9; ball.vr=rr(-0.08,0.08); if(Math.abs(ball.vy)<1.5){ ball.vy=0; ball.vr*=0.5; } } sx=ball.x; sy=ball.y;
        if(t<A.struckAt+1.6) spawnConfetti(3, sx+rr(-swd,swd), sy+rr(-sh,sh)); }
      drawState(st,path,box,sx,sy,sc,ball.rot,'#FFE34D'); label(r.st,sx,sy,H*0.065);
      if(ball.free && t<A.struckAt+1.5){ for(const [ox,oy] of [[-swd*0.5,-sh*0.9],[swd*0.6,-sh*1.0],[0,-sh*1.3]]){ const q=((t-A.struckAt)*2+ox)%1; dot(sx+ox,sy+oy-q*40,8+(1-Math.abs(q-0.5))*6,'#fff'); } } // dazed stars
      // the donkey
      const rot = b.flip? b.u*Math.PI*2*(b.i%2?1:-1) : (A.struck? 0 : -0.15*air);
      ctx.save(); ctx.translate(mx,dy); ctx.rotate(rot); ctx.scale(1+near*0.3,1-near*0.3); donkeyBody(S); donkeyLegs(S,t*9,b.flip?0.9:0.5); donkeyTail(S,t*6);
      if(A.struck && t<A.struckAt+0.4){ ctx.strokeStyle='#FFE34D'; ctx.lineWidth=8; ctx.lineCap='round'; ctx.beginPath(); for(let i=0;i<8;i++){ const a=i/8*Math.PI*2; ctx.moveTo(S*1.5+Math.cos(a)*S*0.7,-S*0.95+Math.sin(a)*S*0.7); ctx.lineTo(S*1.5+Math.cos(a)*S*1.2,-S*0.95+Math.sin(a)*S*1.2); } ctx.stroke(); ctx.lineCap='butt'; }
      ctx.restore();
      if(!A.struck && b.i===2 && b.u>=0.5){ A.struck=true; A.struckAt=t; hit('BOING!','boinghit'); ball.free=true; ball.vy=-9; ball.vx=rr(2,4); ball.vr=rr(0.05,0.12); spawnConfetti(90,sx,sy); } };
    return A;
  },
});
KINDS.push('moonland','sumo','hotdog','parade','trampoline');
})();


/* ===== round 3, part 9 ===== */
/* anims-extra/part9.js — typewriter, magician, icecream, rocketcar, vending */
(function(){
const ease = u => u<=0? 0 : u>=1? 1 : u*u*(3-2*u);
const easeOut = u => u<=0? 0 : u>=1? 1 : 1-Math.pow(1-u,3);
const easeIn = u => u<=0? 0 : u>=1? 1 : u*u;
const clamp = (v,a,b) => v<a? a : v>b? b : v;
const DARK='#151412'; // fixed dark for text/lines drawn ON white paper (C.ink inverts in dark mode)
// bounding box of a state's absolute-coordinate SVG path (viewBox 975x610)
const stBox = st => { const n=(st.d.match(/-?\d+(\.\d+)?/g)||[]).map(Number); let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9; for(let i=0;i+1<n.length;i+=2){ x0=Math.min(x0,n[i]); x1=Math.max(x1,n[i]); y0=Math.min(y0,n[i+1]); y1=Math.max(y1,n[i+1]); } if(x1<x0){ x0=st.c[0]-120; x1=st.c[0]+120; y0=st.c[1]-120; y1=st.c[1]+120; } return {w:x1-x0, h:y1-y0, cx:(x0+x1)/2, cy:(y0+y1)/2}; };
// draw the state silhouette centred on (x,y); outline colour optional
const drawState = (st,path,box,x,y,sc,rot,fill,sx,sy,outline) => { ctx.save(); ctx.translate(x,y); ctx.rotate(rot||0); ctx.scale(sc*(sx||1),sc*(sy||1)); ctx.translate(-box.cx,-box.cy); ctx.fillStyle=fill; ctx.strokeStyle=outline||C.ink; ctx.lineWidth=4/sc; ctx.fill(path); ctx.stroke(path); ctx.restore(); };
const label = (txt,x,y,px,col,align) => { ctx.fillStyle=col||C.ink; ctx.font=`900 ${Math.round(px)}px Archivo, sans-serif`; ctx.textAlign=align||'center'; ctx.textBaseline='middle'; ctx.fillText(txt,x,y); };
const stateName = r => ((typeof NAMES!=='undefined' && NAMES[r.st]) || r.label || r.st || 'TEXAS');

/* the blue donkey, standing, facing right (o.flip mirrors). origin = body centre; ground is at y+0.9*s.
   o.legs[4] leg angles, o.headTilt, o.earUp, o.blink, o.eyeX/eyeY, o.mouth (0..1), o.tailWag, o.rot, o.before(s)/o.extra(s) hooks in local coords */
const donkey=(x,y,s,o)=>{ o=o||{}; ctx.save(); ctx.translate(x,y); if(o.rot) ctx.rotate(o.rot); if(o.flip) ctx.scale(-1,1);
  ctx.strokeStyle=C.ink; ctx.lineWidth=Math.max(3,s*0.035); ctx.lineJoin='round'; ctx.lineCap='round';
  if(o.before) o.before(s);
  // tail
  ctx.beginPath(); ctx.moveTo(-s*0.9,-s*0.3); ctx.quadraticCurveTo(-s*1.4,-s*0.1+(o.tailWag||0)*s*0.3,-s*1.2,s*0.3); ctx.stroke();
  // legs
  ctx.fillStyle='#2E6FE0'; const legs=o.legs||[0,0,0,0]; [-s*0.7,-s*0.3,s*0.3,s*0.7].forEach((lx,i)=>{ const a=legs[i]||0; ctx.translate(lx,s*0.4); ctx.rotate(a); roundRect(-s*0.09,0,s*0.18,s*0.5,s*0.06); ctx.fill(); ctx.stroke(); ctx.rotate(-a); ctx.translate(-lx,-s*0.4); });
  // body
  roundRect(-s*0.9,-s*0.45,s*1.8,s*0.9,s*0.3); ctx.fill(); ctx.stroke();
  // neck + head (tilt about the shoulder)
  ctx.save(); ctx.translate(s*0.8,-s*0.4); ctx.rotate(o.headTilt||0); ctx.translate(-s*0.8,s*0.4);
  ctx.beginPath(); ctx.moveTo(s*0.8,-s*0.4); ctx.lineTo(s*1.25,-s*0.95); ctx.lineTo(s*1.5,-s*0.8); ctx.lineTo(s*1.05,-s*0.2); ctx.closePath(); ctx.fill(); ctx.stroke();
  roundRect(s*1.15,-s*1.15,s*0.75,s*0.5,s*0.15); ctx.fill(); ctx.stroke();
  // ears
  ctx.fillStyle='#FFE34D'; for(const ex of [s*1.2,s*1.45]){ ctx.beginPath(); ctx.moveTo(ex,-s*1.1); ctx.lineTo(ex+s*0.1-(o.earUp||0)*s*0.08,-s*1.55-(o.earUp||0)*s*0.15); ctx.lineTo(ex+s*0.22,-s*1.1); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  // eye
  if(o.blink){ ctx.beginPath(); ctx.moveTo(s*1.6,-s*0.98); ctx.lineTo(s*1.8,-s*0.98); ctx.stroke(); }
  else { ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(s*1.7,-s*0.98,s*0.11,0,7); ctx.fill(); ctx.fillStyle=C.ink; ctx.beginPath(); ctx.arc(s*1.73+(o.eyeX||0)*s*0.04,-s*0.97+(o.eyeY||0)*s*0.04,s*0.05,0,7); ctx.fill(); }
  // mouth
  if(o.mouth){ ctx.fillStyle=C.ink; ctx.beginPath(); ctx.ellipse(s*1.78,-s*0.74,s*0.07,s*0.07*o.mouth,0,0,7); ctx.fill(); }
  if(o.extra) o.extra(s);
  ctx.restore(); ctx.restore(); };
/* a blue arm from (x1,y1) to a hoof at (x2,y2) */
const arm=(x1,y1,x2,y2,s)=>{ ctx.lineCap='round'; ctx.strokeStyle=C.ink; ctx.lineWidth=s*0.3; ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); ctx.strokeStyle='#2E6FE0'; ctx.lineWidth=s*0.2; ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); ctx.fillStyle='#2E6FE0'; ctx.strokeStyle=C.ink; ctx.lineWidth=Math.max(3,s*0.035); ctx.beginPath(); ctx.arc(x2,y2,s*0.17,0,7); ctx.fill(); ctx.stroke(); };
const star=(x,y,R,col)=>{ ctx.fillStyle=col; ctx.beginPath(); for(let i=0;i<10;i++){ const a=i*Math.PI/5-Math.PI/2, rad=i%2?R*0.45:R; ctx.lineTo(x+Math.cos(a)*rad,y+Math.sin(a)*rad); } ctx.closePath(); ctx.fill(); };

/* ---------- sounds ---------- */
SFX.typekey = function(){ tone(1600+Math.random()*600, 0, 0.03, 'square', 0.1, 700); noise(0, 0.035, 0.3, 5000); };
SFX.typeding = function(){ noise(0, 0.22, 0.3, 2500); tone(700, 0, 0.22, 'sawtooth', 0.08, 180); tone(2300, 0.2, 1.3, 'sine', 0.35); tone(4600, 0.2, 0.5, 'sine', 0.1); tone(3450, 0.22, 0.4, 'triangle', 0.06); cheer(0.5); };
SFX.wandtap = function(){ tone(1400, 0, 0.05, 'square', 0.12, 800); noise(0, 0.05, 0.2, 4000); for(let i=0;i<6;i++) tone(2000+i*350, 0.06+i*0.05, 0.25, 'sine', 0.06); };
SFX.tada = function(){ [523,659,784,1047].forEach((f,i)=>tone(f, i*0.09, 0.5, 'square', 0.14)); tone(1319, 0.36, 1.1, 'square', 0.14); for(let i=0;i<12;i++) tone(1800+Math.random()*2200, 0.3+i*0.06, 0.3, 'sine', 0.05); cheer(0.4); };
SFX.softserve = function(){ tone(70, 0, 2.2, 'sawtooth', 0.1, 95); noise(0, 2.2, 0.1, 500); for(let i=0;i<7;i++) tone(300+i*40, 0.3+i*0.3, 0.12, 'sine', 0.08, 200); };
SFX.sprinkles = function(){ for(let i=0;i<30;i++){ tone(2200+Math.random()*2800, i*0.03, 0.05, 'square', 0.05, 1200); } tone(440, 0.9, 0.12, 'sine', 0.25, 330); noise(0.9, 0.08, 0.3, 1500); cheer(0.6); };
SFX.rocketrev = function(){ tone(60, 0, 2.6, 'sawtooth', 0.16, 520); noise(0, 2.6, 0.12, 900); for(let i=0;i<10;i++) noise(i*0.26, 0.08, 0.12, 2500); };
SFX.sonic = function(){ noise(0, 1.3, 1.0, 800); tone(50, 0, 1.2, 'sine', 0.8, 25); tone(2400, 0, 0.5, 'sawtooth', 0.12, 150); tone(900, 0.05, 0.6, 'square', 0.08, 90); cheer(0.4); };
SFX.chute = function(){ noise(0, 0.5, 0.5, 1800); tone(500, 0, 0.5, 'sine', 0.1, 150); };
SFX.coin = function(){ tone(2400, 0, 0.08, 'square', 0.12); tone(3200, 0.08, 0.35, 'sine', 0.18); noise(0.1, 0.06, 0.2, 3000); };
SFX.beep = function(){ tone(1046, 0, 0.1, 'square', 0.1); };
SFX.vendwhir = function(){ tone(110, 0, 1.1, 'sawtooth', 0.08, 130); noise(0, 1.1, 0.08, 700); tone(130, 1.1, 0.15, 'sawtooth', 0.08, 40); };
SFX.vendrattle = function(){ for(let i=0;i<14;i++){ noise(i*0.09, 0.07, 0.35, 2200); tone(180+Math.random()*250, i*0.09, 0.05, 'square', 0.08, 110); } };
SFX.vendrop = function(){ noise(0, 0.6, 0.9, 900); tone(80, 0, 0.5, 'sine', 0.6, 32); for(let i=0;i<9;i++){ noise(0.1+i*0.08, 0.1, 0.3, 1200); tone(220+Math.random()*300, 0.1+i*0.08, 0.06, 'square', 0.1, 120); } cheer(0.4); };

Object.assign(ANIMS, {
  /* typewriter — a giant typewriter hammers out the state's name, the carriage returns with a DING, the page tears out and flies */
  typewriter({W,H,r,hit}){
    const A = {dur:9, struck:false, struckAt:0};
    const st=STATES[r.st]||STATES.TX, path=new Path2D(st.d), box=stBox(st);
    const text=(stateName(r)+' GOES BLUE').toUpperCase();
    const TW=Math.min(W*0.5,H*0.95), cx=W/2, ty=H*0.62, platenY=ty-TW*0.015, PW=TW*0.82, PH=H*0.56, margin=PW*0.07;
    ctx.font='900 100px Archivo, sans-serif'; const w100=ctx.measureText(text).width; const px=Math.min(H*0.07, (PW-2*margin)*100/w100);
    ctx.font=`900 ${Math.round(px)}px Archivo, sans-serif`; const textW=ctx.measureText(text).width;
    const stSc=Math.min(PW*0.5/box.w, PH*0.3/box.h);
    const rows=[['Q','W','E','R','T','Y','U','I','O','P'],['A','S','D','F','G','H','J','K','L'],['Z','X','C','V','B','N','M','!']]; const kr=TW*0.024;
    const t0=0.7, dt=Math.min(0.2, 2.3/text.length), tDone=t0+text.length*dt; let lastN=0, flyDone=false;
    const typedW = n => { ctx.font=`900 ${Math.round(px)}px Archivo, sans-serif`; return ctx.measureText(text.slice(0,n)).width; };
    A.frame = t=>{
      const n = clamp(Math.floor((t-t0)/dt)+ (t>=t0?1:0), 0, text.length); if(n!==lastN){ lastN=n; SFX.typekey(); }
      const sinceKey = t-(t0+(n-1)*dt); const press = n>0 && sinceKey<0.12 ? 1-sinceKey/0.12 : 0;
      // carriage: the strike point stays at cx; the paper walks left as letters appear, then zips home after the DING
      let carriage = typedW(n); if(A.struck){ carriage = typedW(text.length)*(1-easeOut((t-A.struckAt)/0.25)); }
      const rollIn = easeOut(t/0.5); const paperTop = platenY - PH*rollIn + PH*0.02;
      const paperX = cx - margin - carriage;
      // the fly-out: paper leaves the machine 1.3 s after the ding and hovers mid-screen, then exits upward at the end
      const fly = A.struck? easeOut((t-A.struckAt-1.3)/0.9) : 0; const exit = t>8.1? easeIn((t-8.1)/0.6) : 0;
      // ---- the donkey behind the machine (in front of the paper while typing, behind it once the page flies to centre)
      const S=H*0.13, dx=cx+TW*0.66, dy=ty-S*0.1;
      const drawDonkey=()=>donkey(dx, dy, S, {flip:true, eyeX:-1, eyeY:0.6, mouth:A.struck?1:0.3, earUp:A.struck?1:0, headTilt:A.struck? Math.sin((t-A.struckAt)*8)*0.1 : Math.sin(t*12)*0.03});
      if(fly>0) drawDonkey();
      // typebar basket (behind the paper)
      ctx.strokeStyle=C.ink; ctx.lineWidth=6; ctx.lineJoin='round'; ctx.fillStyle='#8C8A84'; ctx.beginPath(); ctx.arc(cx, platenY+TW*0.08, TW*0.2, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      // ---- paper (in local coords so it can be moved/rotated as one thing)
      const drawPaper=()=>{ ctx.fillStyle='#fff'; ctx.strokeStyle=DARK; ctx.lineWidth=3; ctx.fillRect(0,0,PW,PH); ctx.strokeRect(0,0,PW,PH);
        // letterhead: the state, blue, with the code
        drawState(st,path,box,PW/2,PH*0.3,stSc,0,'#2E6FE0',1,1,DARK); label(r.st, PW/2, PH*0.3, Math.min(px*1.1,box.h*stSc*0.45), '#fff');
        // typed line
        ctx.fillStyle=DARK; ctx.font=`900 ${Math.round(px)}px Archivo, sans-serif`; ctx.textAlign='left'; ctx.textBaseline='alphabetic';
        const ly=(platenY-paperTop)-TW*0.11; ctx.fillText(text.slice(0,n), margin, ly);
        // ribbon ink under-line + flashing cursor while typing
        if(!A.struck && t>t0-0.2 && Math.floor(t*4)%2===0){ ctx.fillRect(margin+typedW(n)+4, ly-px*0.8, px*0.12, px*0.9); } };
      ctx.save();
      if(fly>0){ const bounce = Math.sin(Math.min(1,fly)*Math.PI)*H*0.08; const tx = paperX + (W/2-PW/2 - paperX)*fly, tyy = paperTop + (H/2-PH*0.58 - paperTop)*fly - bounce - exit*H*1.4; const sc=1+fly*0.18;
        ctx.translate(tx+PW/2, tyy+PH/2); ctx.rotate(Math.sin(t*2.3)*0.04*fly + exit*0.5); ctx.scale(sc,sc); ctx.translate(-PW/2,-PH/2); }
      else ctx.translate(paperX, paperTop);
      drawPaper(); ctx.restore();
      if(fly<=0) drawDonkey();
      // ---- machine
      ctx.strokeStyle=C.ink; ctx.lineWidth=6; ctx.lineJoin='round';
      // the striking typebar (in front of the paper)
      if(press>0 && fly<=0){ const bx0 = cx + Math.sin(n*2.3)*TW*0.14; ctx.lineWidth=7; ctx.beginPath(); ctx.moveTo(bx0, platenY+TW*0.06); ctx.lineTo(cx+(bx0-cx)*(1-press)*0.3, platenY-TW*0.12*press); ctx.stroke(); ctx.fillStyle=C.ink; ctx.beginPath(); ctx.arc(cx+(bx0-cx)*(1-press)*0.3, platenY-TW*0.12*press, TW*0.012, 0, 7); ctx.fill(); }
      // platen (roller) + knobs
      ctx.fillStyle='#F0562A'; ctx.lineWidth=6; roundRect(cx-TW*0.46, platenY-TW*0.045, TW*0.92, TW*0.09, TW*0.045); ctx.fill(); ctx.stroke();
      ctx.fillStyle=C.ink; for(const kx of [cx-TW*0.5, cx+TW*0.5]){ roundRect(kx-TW*0.035, platenY-TW*0.03, TW*0.07, TW*0.06, TW*0.012); ctx.fill(); }
      // paper guide line on the platen
      ctx.strokeStyle='#fff'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(cx-TW*0.4, platenY); ctx.lineTo(cx+TW*0.4, platenY); ctx.stroke(); ctx.strokeStyle=C.ink;
      // body
      ctx.fillStyle='#2E6FE0'; ctx.lineWidth=6; roundRect(cx-TW/2, ty, TW, H*0.3, TW*0.05); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#7FAAF6'; roundRect(cx-TW*0.44, ty+H*0.02, TW*0.88, H*0.035, TW*0.01); ctx.fill(); ctx.stroke();
      // keys
      ctx.font=`900 ${Math.round(kr*1.1)}px Archivo, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
      let keyIdx=0; rows.forEach((row,ri)=>{ const ky=ty+H*0.1+ri*H*0.065, kx0=cx-(row.length-1)*kr*1.35; row.forEach((ch,ci)=>{ const isDown = press>0 && !A.struck && ((n-1)%27)===keyIdx; const kx=kx0+ci*kr*2.7, kyy=ky+(isDown?kr*0.35:0); ctx.fillStyle=C.ink; ctx.beginPath(); ctx.arc(kx,ky+kr*0.35,kr,0,7); ctx.fill(); ctx.fillStyle=isDown?'#FFE34D':'#fff'; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(kx,kyy,kr,0,7); ctx.fill(); ctx.stroke(); ctx.fillStyle=DARK; ctx.fillText(ch,kx,kyy+1); keyIdx++; }); });
      // space bar
      ctx.fillStyle='#fff'; ctx.lineWidth=4; roundRect(cx-TW*0.2, ty+H*0.25, TW*0.4, H*0.03, H*0.012); ctx.fill(); ctx.stroke();
      // the bell (rings on the DING)
      const ring = A.struck? Math.max(0, 1-(t-A.struckAt)/1.2) : 0; ctx.save(); ctx.translate(cx-TW*0.42, ty-TW*0.1); ctx.rotate(Math.sin(t*40)*0.3*ring); ctx.fillStyle='#FFE34D'; ctx.lineWidth=4; ctx.beginPath(); ctx.arc(0,0,TW*0.045,Math.PI,0); ctx.lineTo(TW*0.055,TW*0.025); ctx.lineTo(-TW*0.055,TW*0.025); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle=C.ink; ctx.beginPath(); ctx.arc(0,TW*0.03,TW*0.012,0,7); ctx.fill(); ctx.restore();
      if(ring>0){ ctx.strokeStyle='#FFE34D'; ctx.lineWidth=5; for(let i=1;i<=3;i++){ ctx.globalAlpha=ring*(1-i*0.25); ctx.beginPath(); ctx.arc(cx-TW*0.42, ty-TW*0.1, TW*(0.06+i*0.045)+(1-ring)*TW*0.1, -2.6, -0.5); ctx.stroke(); } ctx.globalAlpha=1; ctx.strokeStyle=C.ink; }
      // the donkey's hooves on the keys
      const h1 = press>0 && (n%2===0) ? kr*0.4 : 0, h2 = press>0 && (n%2===1) ? kr*0.4 : 0;
      if(fly<=0){ arm(dx-S*0.5, dy-S*0.3, cx+TW*0.12, ty+H*0.12+h1, S); arm(dx-S*0.6, dy-S*0.2, cx-TW*0.1, ty+H*0.17+h2, S); }
      else { // hooves up in the air celebrating
        const wv=Math.sin(t*9)*S*0.15; arm(dx-S*0.5, dy-S*0.3, dx-S*1.3, dy-S*1.9+wv, S); arm(dx-S*0.6, dy-S*0.2, dx-S*2.0, dy-S*1.6-wv, S); }
      if(!A.struck && t>=tDone+0.35){ A.struck=true; A.struckAt=t; hit('DING!','typeding'); } };
    return A;
  },
  /* magician — a caped donkey taps a top hat: a rabbit, then the state, then an entire donkey come out */
  magician({W,H,r,hit}){
    const A = {dur:9, struck:false, struckAt:0};
    const st=STATES[r.st]||STATES.TX, path=new Path2D(st.d), box=stBox(st);
    const S=H*0.12, tableY=H*0.78, HH=H*0.2, HW=HH*0.95, hx=W*0.42, hatTop=tableY-HH, dx=hx+S*2.45, dy=H*0.8-S*0.9;
    const stSc=Math.min(H*0.3/box.h, W*0.28/box.w); const TAPS=[0.9,2.4,3.9]; let tapped=0; const sparks=[];
    const taps = t => TAPS.filter(x=>t>=x).length;
    const burst=(x,y,n)=>{ for(let i=0;i<n;i++){ const a=rr(0,6.3), v=rr(2,9); sparks.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-3,age:0,life:rr(0.6,1.3),R:rr(6,16),c:i%3?'#FFE34D':'#fff'}); } };
    const rabbit=(x,y,s,hop)=>{ ctx.save(); ctx.translate(x,y); ctx.strokeStyle=C.ink; ctx.lineWidth=Math.max(3,s*0.05); ctx.fillStyle='#fff';
      // ears
      for(const ex of [-s*0.35,s*0.1]){ roundRect(ex,-s*1.9,s*0.3,s*1.1,s*0.15); ctx.fill(); ctx.stroke(); ctx.fillStyle='#F7A8C4'; roundRect(ex+s*0.08,-s*1.8,s*0.14,s*0.8,s*0.07); ctx.fill(); ctx.fillStyle='#fff'; }
      // body + head
      ctx.beginPath(); ctx.ellipse(0,s*0.1,s*0.75,s*0.6,0,0,7); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(0,-s*0.55,s*0.5,0,7); ctx.fill(); ctx.stroke();
      // eyes, nose, teeth
      ctx.fillStyle=C.ink; ctx.beginPath(); ctx.arc(-s*0.2,-s*0.62,s*0.07,0,7); ctx.arc(s*0.2,-s*0.62,s*0.07,0,7); ctx.fill(); ctx.fillStyle='#F7A8C4'; ctx.beginPath(); ctx.arc(0,-s*0.42,s*0.07,0,7); ctx.fill();
      ctx.fillStyle='#fff'; ctx.lineWidth=2; ctx.fillRect(-s*0.1,-s*0.35,s*0.09,s*0.16); ctx.strokeRect(-s*0.1,-s*0.35,s*0.09,s*0.16); ctx.fillRect(s*0.01,-s*0.35,s*0.09,s*0.16); ctx.strokeRect(s*0.01,-s*0.35,s*0.09,s*0.16);
      // feet
      ctx.lineWidth=Math.max(3,s*0.05); ctx.beginPath(); ctx.ellipse(-s*0.4,s*0.6,s*0.3,s*0.14,0,0,7); ctx.ellipse(s*0.4,s*0.6,s*0.3,s*0.14,0,0,7); ctx.fill(); ctx.stroke();
      ctx.restore(); };
    A.frame = t=>{
      const k=taps(t); if(k!==tapped){ tapped=k; if(k<3) SFX.wandtap(); burst(hx, hatTop, 30); }
      const since = k>0? t-TAPS[k-1] : -1; const tapPose = since>=0 && since<0.35 ? 1-since/0.35 : 0;
      // ---- floor line + table
      ctx.strokeStyle=C.ink; ctx.lineWidth=5; ctx.lineJoin='round';
      const tw=W*0.42, tx0=hx-tw*0.55; ctx.fillStyle='#8C8A84'; for(const lx of [tx0+tw*0.08, tx0+tw*0.86]){ ctx.fillRect(lx, tableY, tw*0.06, H*0.12); ctx.strokeRect(lx, tableY, tw*0.06, H*0.12); }
      ctx.fillStyle='#F0562A'; roundRect(tx0, tableY-H*0.02, tw, H*0.06, H*0.01); ctx.fill(); ctx.stroke(); ctx.fillStyle='#FFE34D'; for(let i=0;i<Math.floor(tw/(H*0.04));i++) ctx.fillRect(tx0+i*H*0.04+H*0.006, tableY+H*0.04, H*0.028, H*0.035);
      // the magician's step box
      ctx.fillStyle='#FFE34D'; roundRect(dx-S*1.3, H*0.8, S*2.6, H*0.12, S*0.1); ctx.fill(); ctx.stroke(); star(dx, H*0.86, S*0.35, '#F0562A');
      // ---- things coming out of the hat (drawn before the hat so the hat hides them until they rise above the brim top)
      // 1 rabbit
      if(k>=1){ const u=easeOut((t-TAPS[0])/0.7); let rx=hx, ry=hatTop+S*1.2-(S*1.2+S*1.3)*u, rs=S*0.75; const hopT=t-TAPS[0]-0.9; if(hopT>0){ rx=hx-hopT*W*0.22; ry=tableY-S*0.2-Math.abs(Math.sin(hopT*7))*S*0.9; } if(rx>-S*2) rabbit(rx,ry,rs,hopT>0); }
      // 2 the state
      if(k>=2){ const u=easeOut((t-TAPS[1])/1.1); const sy=hatTop+H*0.05-(H*0.05+H*0.36)*u + Math.sin(t*2.5)*H*0.015; const sc=stSc*(0.25+0.75*u); drawState(st,path,box,hx,sy,sc,(1-u)*6,'#FFE34D'); if(u>0.5) label(r.st,hx,sy,Math.min(H*0.06,box.h*sc*0.45),C.ink); }
      // 3 the second donkey, launched up and landing left of the hat, then bowing
      if(k>=3){ const u=t-TAPS[2]; const s2=S*0.8; const lx=hx-HW*1.35, ly=tableY-H*0.02-s2*0.9; let x,y,rot=0,tilt=0; if(u<0.9){ const p=u/0.9; x=hx+(lx-hx)*p; y=hatTop+s2*0.5 + (ly-hatTop-s2*0.5)*p - Math.sin(p*Math.PI)*H*0.32; rot=-p*Math.PI*2; } else { x=lx; y=ly; tilt=u<2.4? Math.sin((u-0.9)*2.1)*0.5 : 0; } donkey(x,y,s2,{rot, headTilt:tilt, mouth:1, earUp:1, legs:u<0.9?[0.5,-0.5,0.5,-0.5]:[0,0,0,0]}); }
      // ---- the hat
      ctx.lineWidth=5; ctx.fillStyle='#2E6FE0'; roundRect(hx-HW/2, hatTop, HW, HH, HW*0.04); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#FFE34D'; ctx.fillRect(hx-HW/2+3, tableY-HH*0.28, HW-6, HH*0.14); ctx.strokeRect(hx-HW/2+3, tableY-HH*0.28, HW-6, HH*0.14);
      ctx.fillStyle='#2E6FE0'; ctx.beginPath(); ctx.ellipse(hx, tableY-H*0.01, HW*0.85, HW*0.1, 0, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle=C.ink; ctx.beginPath(); ctx.ellipse(hx, hatTop, HW/2, HW*0.07, 0, 0, Math.PI); ctx.fill(); // the dark opening
      // ---- the magician (cape, bow tie, wand)
      const swish = A.struck? Math.sin(clamp((t-A.struckAt)/1.2,0,1)*Math.PI) : 0; const wandA = -1.25 + (0.8*tapPose) + (A.struck? -0.4*swish : 0);
      donkey(dx, dy, S, {flip:true, mouth:A.struck?1:0.4, eyeX:-1, eyeY:0.3, earUp:tapPose, headTilt:tapPose*0.2,
        before:s=>{ // cape behind the body, flaring on the swish
          ctx.fillStyle='#F0562A'; ctx.beginPath(); ctx.moveTo(s*0.9,-s*0.6); ctx.quadraticCurveTo(-s*1.2-swish*s*1.0,-s*1.0-swish*s*1.2,-s*1.9-swish*s*1.2, s*0.9-swish*s*0.8); ctx.lineTo(s*0.2, s*0.9); ctx.closePath(); ctx.fill(); ctx.stroke(); },
        extra:s=>{ // bow tie + top hat of his own
          ctx.fillStyle='#FFE34D'; ctx.beginPath(); ctx.moveTo(s*1.0,-s*0.5); ctx.lineTo(s*1.3,-s*0.68); ctx.lineTo(s*1.3,-s*0.32); ctx.closePath(); ctx.moveTo(s*1.0,-s*0.5); ctx.lineTo(s*0.7,-s*0.68); ctx.lineTo(s*0.7,-s*0.32); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.fillStyle='#2E6FE0'; roundRect(s*1.15,-s*1.95,s*0.6,s*0.5,s*0.04); ctx.fill(); ctx.stroke(); ctx.fillRect(s*0.98,-s*1.5,s*0.95,s*0.08); ctx.strokeRect(s*0.98,-s*1.5,s*0.95,s*0.08); } });
      // wand arm (screen coords; the magician faces left, so the arm reaches toward -x)
      const shx=dx-S*0.6, shy=dy-S*0.3, L=S*1.0; // wandA=-1.25 points up-left, ~ -0.45 points at the hat top
      const ax=Math.cos(wandA), ay=Math.sin(wandA); const handX=shx-ax*L, handY=shy+ay*L; arm(shx,shy,handX,handY,S);
      ctx.strokeStyle=C.ink; ctx.lineWidth=S*0.09; ctx.beginPath(); ctx.moveTo(handX,handY); ctx.lineTo(handX-ax*S*1.2, handY+ay*S*1.2); ctx.stroke(); ctx.strokeStyle='#fff'; ctx.lineWidth=S*0.09; ctx.beginPath(); ctx.moveTo(handX-ax*S*0.95,handY+ay*S*0.95); ctx.lineTo(handX-ax*S*1.2, handY+ay*S*1.2); ctx.stroke();
      // ---- sparkles
      for(const p of sparks){ p.age+=1/60; p.x+=p.vx; p.y+=p.vy; p.vy+=0.08; p.vx*=0.97; const a=1-p.age/p.life; if(a<=0) continue; ctx.globalAlpha=a; star(p.x,p.y,p.R*a,p.c); } ctx.globalAlpha=1; for(let i=sparks.length-1;i>=0;i--) if(sparks[i].age>sparks[i].life) sparks.splice(i,1);
      if(!A.struck && t>=TAPS[2]){ A.struck=true; A.struckAt=t; hit('TA-DA!','tada'); burst(hx,hatTop,60); } };
    return A;
  },
  /* icecream — a soft-serve machine swirls blue onto a state-shaped cone; sprinkles rain, a cherry lands, the donkey licks */
  icecream({W,H,r,hit}){
    const A = {dur:9, struck:false, struckAt:0}; SFX.softserve();
    const st=STATES[r.st]||STATES.TX, path=new Path2D(st.d), box=stBox(st);
    const cx=W*0.46, MW=Math.min(W*0.34,H*0.6), MB=H*0.3, nozY=MB+H*0.06; const coneH=H*0.25, coneSc=coneH/box.h; const SW=Math.min(box.w*coneSc*1.05, H*0.3), BH=H*0.06, N=6;
    const sprinkles=[], stuck=[]; const cols=['#F0562A','#FFE34D','#fff','#7FAAF6']; let lastSp=0; const S=H*0.13, dx=cx+H*0.38, dy=H*0.95-S*0.9;
    const pour = t => clamp((t-0.6)/2.0, 0, 1);
    const blobW = i => SW*(1-i/N*0.72);
    A.frame = t=>{
      const p=pour(t); const count=Math.min(N, Math.floor(p*(N+0.999))); const swirlH = count*BH*0.72; const coneTop = nozY + H*0.02 + swirlH; // the cone is lowered as the swirl grows
      const lean = A.struck? Math.sin((t-A.struckAt)*3)*0.03 : 0;
      const lick = A.struck? clamp((t-A.struckAt-1.4)/0.6,0,1) * (t<A.struckAt+3.2? 1 : Math.max(0,1-(t-A.struckAt-3.2)/0.6)) : 0;
      // ---- machine
      ctx.strokeStyle=C.ink; ctx.lineWidth=6; ctx.lineJoin='round'; ctx.fillStyle='#BBD0F5'; roundRect(cx-MW/2, -20, MW, MB+20, H*0.03); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#fff'; roundRect(cx-MW*0.42, H*0.04, MW*0.84, MB*0.55, H*0.02); ctx.fill(); ctx.stroke();
      label('SOFT SERVE', cx, H*0.11, Math.min(MW*0.09,H*0.055), '#2E6FE0'); label('BLUE RASPBERRY', cx, H*0.17, Math.min(MW*0.055,H*0.035), DARK);
      for(const [lx,c] of [[cx-MW*0.3,'#F0562A'],[cx-MW*0.2,p<1?'#FFE34D':'#7FAAF6']]){ ctx.fillStyle=c; ctx.beginPath(); ctx.arc(lx, MB*0.78, H*0.018, 0, 7); ctx.fill(); ctx.stroke(); }
      // lever
      const lv = t<0.4? 0 : t<0.7? ease((t-0.4)/0.3) : p<1? 1 : Math.max(0,1-(t-2.6)/0.3); ctx.save(); ctx.translate(cx+MW*0.36, MB*0.6); ctx.rotate(-0.4+lv*1.5); ctx.fillStyle=C.ink; roundRect(-H*0.012,0,H*0.024,H*0.14,H*0.01); ctx.fill(); ctx.fillStyle='#F0562A'; ctx.beginPath(); ctx.arc(0,H*0.14,H*0.03,0,7); ctx.fill(); ctx.stroke(); ctx.restore();
      // nozzle
      ctx.fillStyle='#8C8A84'; ctx.beginPath(); ctx.moveTo(cx-SW*0.3, MB); ctx.lineTo(cx+SW*0.3, MB); ctx.lineTo(cx+SW*0.17, nozY); ctx.lineTo(cx-SW*0.17, nozY); ctx.closePath(); ctx.fill(); ctx.stroke();
      // ---- the cone (state silhouette), the swirl and the stream, as one leaning group
      ctx.save(); ctx.translate(cx, coneTop); ctx.rotate(lean); ctx.translate(-cx, -coneTop);
      drawState(st,path,box,cx,coneTop+coneH/2,coneSc,0,'#E0A458'); // waffle lines, clipped to the state
      ctx.save(); ctx.translate(cx,coneTop+coneH/2); ctx.scale(coneSc,coneSc); ctx.translate(-box.cx,-box.cy); ctx.clip(path); ctx.strokeStyle='#B8803A'; ctx.lineWidth=3/coneSc; ctx.beginPath(); for(let i=-10;i<10;i++){ ctx.moveTo(box.cx+i*box.w*0.12-box.w, box.cy-box.h); ctx.lineTo(box.cx+i*box.w*0.12+box.w, box.cy+box.h); ctx.moveTo(box.cx+i*box.w*0.12+box.w, box.cy-box.h); ctx.lineTo(box.cx+i*box.w*0.12-box.w, box.cy+box.h); } ctx.stroke(); ctx.restore();
      label(r.st, cx, coneTop+coneH*0.55, Math.min(H*0.06, box.w*coneSc*0.4), C.ink);
      // swirl blobs, bottom to top
      ctx.fillStyle='#2E6FE0'; ctx.strokeStyle=C.ink; ctx.lineWidth=5;
      for(let i=0;i<count;i++){ const age=clamp((p*(N+0.999)-i)/1,0,1); const w=blobW(i)*(0.6+0.4*age), y=coneTop-i*BH*0.72, ox=(i%2?1:-1)*SW*0.04; ctx.beginPath(); ctx.ellipse(cx+ox, y, w/2, BH*0.5, 0, 0, 7); ctx.fill(); ctx.stroke(); }
      if(count>=N && p>=1){ const ty=coneTop-(N-1)*BH*0.72-BH*0.3; ctx.beginPath(); ctx.moveTo(cx-SW*0.1, ty); ctx.quadraticCurveTo(cx+SW*0.02, ty-BH*0.9, cx+SW*0.12, ty-BH*1.1); ctx.quadraticCurveTo(cx+SW*0.14, ty-BH*0.3, cx+SW*0.1, ty); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      // stream from the nozzle while pouring
      if(p>0 && p<1){ const top=count>0? coneTop-(count-1)*BH*0.72 : coneTop; roundRect(cx-SW*0.1, nozY-4, SW*0.2, top-nozY+6, SW*0.05); ctx.fill(); ctx.stroke(); }
      // highlights
      ctx.fillStyle='#fff'; for(let i=0;i<count;i++){ const w=blobW(i), y=coneTop-i*BH*0.72, ox=(i%2?1:-1)*SW*0.04; ctx.beginPath(); ctx.ellipse(cx+ox-w*0.25, y-BH*0.12, w*0.1, BH*0.1, 0, 0, 7); ctx.fill(); }
      // stuck sprinkles (local to the swirl)
      for(const s of stuck){ ctx.fillStyle=s.c; ctx.save(); ctx.translate(cx+s.x, coneTop+s.y); ctx.rotate(s.a); ctx.fillRect(-s.w/2,-s.h/2,s.w,s.h); ctx.restore(); }
      // the cherry
      const chT = t-3.1; if(chT>0){ const tipY=coneTop-(N-1)*BH*0.72-BH*0.6; const yy = chT<0.8? -H*0.1 + (tipY+H*0.1)*easeIn(chT/0.8) : tipY + (A.struck? Math.abs(Math.sin((t-A.struckAt)*9))*Math.max(0,1-(t-A.struckAt))*-H*0.03 : 0); const sq = A.struck && t-A.struckAt<0.25? 1-(t-A.struckAt)/0.25 : 0;
        ctx.strokeStyle=C.ink; ctx.lineWidth=5; ctx.beginPath(); ctx.moveTo(cx, yy-H*0.02); ctx.quadraticCurveTo(cx+H*0.03, yy-H*0.07, cx+H*0.05, yy-H*0.1); ctx.stroke(); ctx.fillStyle='#F0562A'; ctx.beginPath(); ctx.ellipse(cx, yy, H*0.03*(1+sq*0.4), H*0.03*(1-sq*0.4), 0, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(cx-H*0.01, yy-H*0.01, H*0.008, 0, 7); ctx.fill(); }
      ctx.restore();
      // ---- falling sprinkles (spawned from a shaker, stick when they reach the swirl)
      const shake = t>2.6 && t<3.5; if(shake && t-lastSp>0.02){ lastSp=t; for(let i=0;i<7;i++) sprinkles.push({x:cx+rr(-SW*0.55,SW*0.55), y:nozY-H*0.02+rr(-20,0), vx:rr(-1,1), vy:rr(2,6), w:rr(12,20), h:rr(5,8), a:rr(0,6), c:cols[i%4]}); }
      ctx.save(); ctx.translate(cx+SW*0.75, nozY-H*0.1); ctx.rotate(shake? -0.9+Math.sin(t*30)*0.15 : -0.2); ctx.fillStyle='#FFE34D'; ctx.lineWidth=4; ctx.strokeStyle=C.ink; roundRect(-H*0.035,-H*0.1,H*0.07,H*0.14,H*0.01); ctx.fill(); ctx.stroke(); ctx.fillStyle='#F0562A'; roundRect(-H*0.03,-H*0.13,H*0.06,H*0.035,H*0.008); ctx.fill(); ctx.stroke(); ctx.fillStyle=DARK; for(let i=0;i<3;i++) ctx.fillRect(-H*0.02+i*H*0.017, -H*0.12, 4, 4); ctx.restore();
      for(let i=sprinkles.length-1;i>=0;i--){ const s=sprinkles[i]; s.x+=s.vx; s.y+=s.vy; s.vy+=0.35; s.a+=0.2; const rel=(coneTop-s.y)/(BH*0.72); const bi=Math.floor(rel+0.5); if(bi>=0 && bi<count && Math.abs(s.x-cx)<blobW(bi)/2*0.95){ stuck.push({x:s.x-cx, y:s.y-coneTop, w:s.w, h:s.h, a:s.a, c:s.c}); sprinkles.splice(i,1); continue; } if(s.y>H+20){ sprinkles.splice(i,1); continue; } ctx.fillStyle=s.c; ctx.save(); ctx.translate(s.x,s.y); ctx.rotate(s.a); ctx.fillRect(-s.w/2,-s.h/2,s.w,s.h); ctx.restore(); }
      // ---- counter + cone holder
      ctx.fillStyle='#F0562A'; ctx.strokeStyle=C.ink; ctx.lineWidth=6; roundRect(cx-W*0.2, H*0.9, W*0.4, H*0.12, H*0.015); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#8C8A84'; ctx.fillRect(cx-H*0.012, coneTop+coneH*0.92, H*0.024, H*0.9-coneTop-coneH*0.92+4); ctx.strokeRect(cx-H*0.012, coneTop+coneH*0.92, H*0.024, H*0.9-coneTop-coneH*0.92+4);
      // ---- the customer donkey (bib, tongue when licking, blue nose afterwards)
      const lickX = lick*H*0.2; donkey(dx-lickX, dy, S, {flip:true, eyeX:-1, eyeY:-0.3*(1-lick), mouth:lick>0?0:0.9, earUp:A.struck?1:0, headTilt:lick*0.35+(A.struck?Math.sin(t*10)*0.03:0),
        extra:s=>{ ctx.fillStyle='#fff'; ctx.beginPath(); ctx.moveTo(s*0.5,-s*0.45); ctx.lineTo(s*1.1,-s*0.45); ctx.lineTo(s*1.0,s*0.2); ctx.lineTo(s*0.6,s*0.2); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle='#F0562A'; ctx.beginPath(); ctx.arc(s*0.8,-s*0.12,s*0.12,0,7); ctx.fill();
          if(lick>0){ ctx.fillStyle='#F0562A'; roundRect(s*1.85, -s*0.78, s*0.6*lick, s*0.16, s*0.08); ctx.fill(); ctx.stroke(); }
          if(A.struck && t>A.struckAt+2.6){ ctx.fillStyle='#2E6FE0'; ctx.beginPath(); ctx.arc(s*1.86,-s*0.95,s*0.12,0,7); ctx.fill(); ctx.stroke(); } } });
      if(!A.struck && t>=3.9){ A.struck=true; A.struckAt=t; hit('SPRINKLES!','sprinkles'); } };
    return A;
  },
  /* rocketcar — a rocket car tows the state across the salt flats, breaks the sound barrier, then comes back under a parachute */
  rocketcar({W,H,r,hit,shake}){
    const A = {dur:9, struck:false, struckAt:0}; SFX.rocketrev();
    const st=STATES[r.st]||STATES.TX, path=new Path2D(st.d), box=stBox(st);
    const gy=H*0.8, CL=Math.min(W*0.3,H*0.55), BW=CL*0.75, BHt=CL*0.4, stSc=Math.min(BW*0.7/box.w, BHt*0.8/box.h); const dust=[], rings=[]; let chuted=false, lastShake=0;
    const cracks=[]; for(let i=0;i<14;i++) cracks.push({x:rr(0,W), y:rr(gy+10,H), l:rr(40,140), a:rr(-0.4,0.4)});
    const car=(x,y,dir,speed,t,standing)=>{ ctx.save(); ctx.translate(x,y); ctx.scale(dir,1); ctx.strokeStyle=C.ink; ctx.lineWidth=5; ctx.lineJoin='round';
      // exhaust
      if(speed>0.02){ const fl=CL*(0.25+speed*0.9)*(0.85+Math.random()*0.3); ctx.fillStyle='#F0562A'; ctx.beginPath(); ctx.moveTo(-CL*0.5,-CL*0.1); ctx.lineTo(-CL*0.5-fl,0); ctx.lineTo(-CL*0.5,CL*0.1); ctx.closePath(); ctx.fill(); ctx.fillStyle='#FFE34D'; ctx.beginPath(); ctx.moveTo(-CL*0.5,-CL*0.05); ctx.lineTo(-CL*0.5-fl*0.55,0); ctx.lineTo(-CL*0.5,CL*0.05); ctx.closePath(); ctx.fill(); }
      // tail fin
      ctx.fillStyle='#F0562A'; ctx.beginPath(); ctx.moveTo(-CL*0.45,-CL*0.08); ctx.lineTo(-CL*0.38,-CL*0.36); ctx.lineTo(-CL*0.18,-CL*0.36); ctx.lineTo(-CL*0.05,-CL*0.08); ctx.closePath(); ctx.fill(); ctx.stroke();
      // body + nose
      ctx.fillStyle='#2E6FE0'; roundRect(-CL*0.5,-CL*0.12,CL*0.8,CL*0.24,CL*0.08); ctx.fill(); ctx.stroke(); ctx.fillStyle='#FFE34D'; ctx.beginPath(); ctx.moveTo(CL*0.28,-CL*0.12); ctx.lineTo(CL*0.55,0); ctx.lineTo(CL*0.28,CL*0.12); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#fff'; ctx.fillRect(-CL*0.42,-CL*0.03,CL*0.6,CL*0.06); ctx.strokeRect(-CL*0.42,-CL*0.03,CL*0.6,CL*0.06); ctx.save(); ctx.scale(dir,1); label('D', -dir*CL*0.12, 0, CL*0.055, '#F0562A'); ctx.restore();
      // canopy + driver
      ctx.fillStyle='#7FAAF6'; ctx.beginPath(); ctx.arc(0,-CL*0.12,CL*0.12,Math.PI,0); ctx.closePath(); ctx.fill(); ctx.stroke();
      const hy = standing? -CL*0.42 : -CL*0.2; ctx.fillStyle='#2E6FE0'; roundRect(-CL*0.07,hy-CL*0.06,CL*0.16,CL*0.1,CL*0.03); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(-CL*0.01,hy-CL*0.06,CL*0.07,Math.PI,0); ctx.closePath(); ctx.fill(); ctx.stroke(); // helmet
      ctx.fillStyle='#FFE34D'; for(const ex of [-CL*0.06,-CL*0.02]){ const flap=Math.sin(t*40+ex)*speed*CL*0.05; ctx.beginPath(); ctx.moveTo(ex,hy-CL*0.08); ctx.lineTo(ex-CL*0.06-flap*1.5,hy-CL*0.17-Math.abs(flap)); ctx.lineTo(ex+CL*0.02,hy-CL*0.1); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(CL*0.05,hy-CL*0.03,CL*0.025,0,7); ctx.fill(); ctx.fillStyle=C.ink; ctx.beginPath(); ctx.arc(CL*0.058,hy-CL*0.03,CL*0.012,0,7); ctx.fill();
      if(standing){ arm(-CL*0.03,hy+CL*0.02,-CL*0.2,hy-CL*0.2,CL*0.25); arm(CL*0.05,hy+CL*0.02,CL*0.22,hy-CL*0.2,CL*0.25); }
      // wheels
      ctx.fillStyle=C.ink; for(const wx of [-CL*0.32,CL*0.2]){ ctx.beginPath(); ctx.arc(wx,CL*0.12,CL*0.1,0,7); ctx.fill(); ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(wx,CL*0.12,CL*0.04,0,7); ctx.fill(); ctx.fillStyle=C.ink; }
      ctx.restore(); };
    const bannerAt=(x,y,dir,speed,t)=>{ // towed banner with the state on it; waves with speed
      ctx.save(); ctx.translate(x,y); ctx.scale(dir,1); ctx.strokeStyle=C.ink; ctx.lineWidth=5; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-CL*0.25,0); ctx.stroke();
      ctx.translate(-CL*0.25,0); ctx.rotate(Math.sin(t*14)*0.05*speed); ctx.fillStyle='#FFE34D'; ctx.beginPath(); const pts=10; ctx.moveTo(0,-BHt/2); for(let i=1;i<=pts;i++){ const u=i/pts; ctx.lineTo(-u*BW, -BHt/2+Math.sin(u*6-t*18)*BHt*0.06*speed); } for(let i=pts;i>=0;i--){ const u=i/pts; ctx.lineTo(-u*BW, BHt/2+Math.sin(u*6-t*18)*BHt*0.06*speed); } ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.scale(dir,1); drawState(st,path,box,-dir*BW*0.55,0,stSc,0,'#2E6FE0'); label(r.st,-dir*BW*0.55,0,Math.min(BHt*0.4,box.w*stSc*0.4),'#fff'); ctx.restore(); };
    A.frame = t=>{
      // ---- scenery: mountains, salt flat, cracks
      ctx.fillStyle='#BBD0F5'; ctx.strokeStyle=C.ink; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(0,gy); for(let i=0;i<=8;i++){ ctx.lineTo(i*W/8, gy-(i%2? H*0.1+Math.sin(i*2.1)*H*0.05 : H*0.02)); } ctx.lineTo(W,gy); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#fff'; ctx.globalAlpha=0.85; ctx.fillRect(0,gy,W,H-gy); ctx.globalAlpha=1; ctx.beginPath(); ctx.moveTo(0,gy); ctx.lineTo(W,gy); ctx.stroke();
      ctx.lineWidth=2; ctx.strokeStyle='#8C8A84'; ctx.beginPath(); for(const c of cracks){ ctx.moveTo(c.x,c.y); ctx.lineTo(c.x+Math.cos(c.a)*c.l, c.y+Math.sin(c.a)*c.l*0.3); ctx.lineTo(c.x+Math.cos(c.a)*c.l*1.5, c.y-Math.sin(c.a)*c.l*0.2); } ctx.stroke();
      // ---- motion
      let x, speed, dir=1, standing=false, chute=0;
      if(t<2.6){ const u=t/2.6; x=CL*0.3+(W*0.5-CL*0.3)*Math.pow(u,1.7); speed=u; }
      else if(t<4.4){ const u=(t-2.6); x=W*0.5+u*W*0.35+u*u*W*0.45; speed=1.3; }
      else { dir=-1; const u=clamp((t-4.6)/2.2,0,1); x=W+CL*1.3-(W+CL*1.3-W*0.5)*easeOut(u); speed=(1-u)*0.7; chute=clamp((t-4.6)/0.5,0,1); standing=t>7.2; if(t>=4.6 && !chuted){ chuted=true; SFX.chute(); } }
      const y=gy-CL*0.12;
      // dust
      if(speed>0.1 && x>-CL && x<W+CL && Math.random()<0.9) dust.push({x:x-dir*CL*0.45, y:gy+rr(-5,10), r:rr(12,30), vx:-dir*rr(2,8)*speed, vy:-rr(0.5,2), a:0.7});
      for(const d of dust){ d.x+=d.vx; d.y+=d.vy; d.r+=1.5; d.a-=0.018; } for(let i=dust.length-1;i>=0;i--) if(dust[i].a<=0) dust.splice(i,1);
      ctx.fillStyle='#8C8A84'; for(const d of dust){ ctx.globalAlpha=d.a*0.5; ctx.beginPath(); ctx.arc(d.x,d.y,d.r,0,7); ctx.fill(); } ctx.globalAlpha=1;
      // the banner (behind the car), parachute, car
      if(x>-CL*2 && x<W+CL*2.5){ bannerAt(x-dir*CL*0.5, y, dir, Math.min(1,speed), t);
        if(chute>0){ const R=CL*0.45*chute; const px=x+CL*0.55, py=y-R*1.5; ctx.strokeStyle=C.ink; ctx.lineWidth=3; ctx.beginPath(); for(let i=-2;i<=2;i++){ ctx.moveTo(x+CL*0.45,y-CL*0.05); ctx.lineTo(px+i*R*0.45, py); } ctx.stroke(); ctx.lineWidth=5; for(let i=0;i<5;i++){ ctx.fillStyle=i%2?'#F0562A':'#fff'; ctx.beginPath(); ctx.moveTo(px,py); ctx.arc(px,py,R,Math.PI+i*Math.PI/5,Math.PI+(i+1)*Math.PI/5); ctx.closePath(); ctx.fill(); ctx.stroke(); } }
        car(x,y,dir,speed,t,standing); }
      // sonic boom rings + mach cone
      for(const g of rings){ g.r+=W*0.03; g.a-=0.03; } for(let i=rings.length-1;i>=0;i--) if(rings[i].a<=0) rings.splice(i,1);
      ctx.strokeStyle='#fff'; for(const g of rings){ ctx.globalAlpha=g.a; ctx.lineWidth=14*g.a+4; ctx.beginPath(); ctx.arc(g.x,g.y,g.r,0,7); ctx.stroke(); ctx.strokeStyle=C.ink; ctx.lineWidth=3; ctx.stroke(); ctx.strokeStyle='#fff'; } ctx.globalAlpha=1;
      if(A.struck && t<4.4){ const k=t-A.struckAt; ctx.fillStyle='#fff'; ctx.globalAlpha=0.5*Math.max(0,1-k/1.5); ctx.beginPath(); ctx.moveTo(x+CL*0.55,y); ctx.lineTo(x-CL*0.6-k*W*0.4, y-CL*0.9-k*H*0.4); ctx.lineTo(x-CL*0.6-k*W*0.4, y+CL*0.5+k*H*0.2); ctx.closePath(); ctx.fill(); ctx.globalAlpha=1; if(t-lastShake>0.3){ lastShake=t; shake(); } }
      // ---- timing board
      const mph = t<2.6? Math.round(speed*speed*1088) : t<4.4? 1088+Math.round((t-2.6)*430) : Math.round(1088*Math.max(0,speed));
      const bx=W*0.8, by=H*0.1, bw=Math.min(W*0.3,H*0.5), bh=H*0.17; ctx.fillStyle=C.ink; ctx.lineWidth=5; roundRect(bx-bw/2,by,bw,bh,H*0.015); ctx.fill(); ctx.strokeStyle='#FFE34D'; ctx.lineWidth=4; roundRect(bx-bw/2+8,by+8,bw-16,bh-16,H*0.01); ctx.stroke();
      const flash = A.struck && t<4.4 && Math.floor(t*6)%2===0; label(flash? 'SOUND BARRIER' : 'SALT FLATS · MPH', bx, by+bh*0.27, bh*0.17, flash?'#F0562A':'#7FAAF6'); label(flash? 'BROKEN!' : String(mph).padStart(4,'0'), bx, by+bh*0.68, bh*0.42, '#FFE34D');
      if(!A.struck && t>=2.6){ A.struck=true; A.struckAt=t; hit('WARP SPEED!','sonic'); for(let i=0;i<3;i++) rings.push({x:x+CL*0.55,y, r:i*W*0.07, a:0.9-i*0.2}); } };
    return A;
  },
  /* vending — coin in, B4, nothing drops; the donkey rocks the machine until the state falls out with everything else */
  vending({W,H,r,hit,shake}){
    const A = {dur:9.5, struck:false, struckAt:0};
    const st=STATES[r.st]||STATES.TX, path=new Path2D(st.d), box=stBox(st);
    const MW=Math.min(W*0.34,H*0.62), MH=H*0.84, mx=W*0.36-MW/2, my=H*0.08, wx=mx+MW*0.05, wy=my+MH*0.06, ww=MW*0.6, wh=MH*0.6, trayY=wy+wh; const cell=ww/4, rowH=wh/3;
    const sc=Math.min(cell*0.95/box.w, rowH*0.8/box.h), liftSc=Math.min(H*0.3/box.h, W*0.22/box.w); const items=[]; const cols=['#F0562A','#fff','#7FAAF6','#F0562A','#fff','#7FAAF6'];
    for(let rI=0;rI<3;rI++) for(let c=0;c<4;c++){ const isSt=(rI===1&&c===3); items.push({x:wx+cell*(c+0.5), y:wy+rowH*(rI+1)-rowH*0.1, w:cell*0.62, h:rowH*0.55, c:cols[(rI*4+c)%6], code:'ABC'[rI]+(c+1), st:isSt, vx:0, vy:0, a:0, va:0, falling:false, rest:false}); }
    const S=H*0.13, dx=mx+MW+S*2.2, floor=H*0.92, dy=floor-S*0.9; let keyed='', lastShake=0, coinDone=false, b1=false, b2=false, whir=false, rattle=false;
    const panelX=mx+MW*0.7, slotY=my+MH*0.12, padY=my+MH*0.25;
    const btnPos = ch => { const i='123456789B4A'.indexOf(ch); return [panelX+MW*0.07+(i%3)*MW*0.075, padY+Math.floor(i/3)*MW*0.075]; };
    A.frame = t=>{
      // ---- script
      let armT=null; // [x,y] the reaching hoof target in screen coords
      if(t<0.9){ const u=ease(t/0.6); armT=[dx-S*1.2+( (panelX+MW*0.06) - (dx-S*1.2))*u, dy-S*0.9+(slotY-(dy-S*0.9))*u]; if(t>0.75 && !coinDone){ coinDone=true; SFX.coin(); } }
      else if(t<1.5){ armT=btnPos('B'); if(t>1.2 && !b1){ b1=true; keyed='B'; SFX.beep(); } }
      else if(t<2.0){ armT=btnPos('4'); if(t>1.7 && !b2){ b2=true; keyed='B4'; SFX.beep(); whir=true; SFX.vendwhir(); } }
      const spin = clamp((t-1.9)/1.1,0,1);
      const stuckT = t>3.0 && t<3.6; if(stuckT) keyed = Math.floor(t*3)%2? 'B4' : '';
      const rockT = clamp((t-3.6)/1.2,0,1); const rocking = t>=3.6 && !A.struck; if(rocking && !rattle){ rattle=true; SFX.vendrattle(); }
      let rot = 0; if(rocking){ rot = Math.sin((t-3.6)*15)*0.07*rockT; if(t-lastShake>0.4){ lastShake=t; shake(); } } else if(A.struck){ rot = Math.sin((t-A.struckAt)*15)*0.07*Math.max(0,1-(t-A.struckAt)/0.6); }
      // ---- physics after the drop (machine-local, upright coords)
      if(A.struck){ for(const it of items){ if(it.rest) continue; it.vy+=0.9; it.x+=it.vx; it.y+=it.vy; it.a+=it.va; const fl=trayY+MH*0.1-it.h*0.3; if(it.y>fl){ it.y=fl; it.vy*=-0.35; it.vx*=0.7; it.va*=0.5; if(Math.abs(it.vy)<1.5){ it.rest=true; it.vy=0; } } if(it.x<wx+it.w*0.4){ it.x=wx+it.w*0.4; it.vx*=-0.5; } if(it.x>wx+ww-it.w*0.4){ it.x=wx+ww-it.w*0.4; it.vx*=-0.5; } } }
      // ---- the machine (rocks about its bottom centre)
      ctx.save(); ctx.translate(mx+MW/2, my+MH); ctx.rotate(rot); ctx.translate(-(mx+MW/2), -(my+MH));
      ctx.strokeStyle=C.ink; ctx.lineWidth=6; ctx.lineJoin='round'; ctx.fillStyle='#2E6FE0'; roundRect(mx,my,MW,MH,MW*0.04); ctx.fill(); ctx.stroke();
      // window glass + shelves + items
      ctx.fillStyle='#BBD0F5'; ctx.fillRect(wx,wy,ww,wh+MH*0.12); ctx.strokeRect(wx,wy,ww,wh+MH*0.12);
      ctx.fillStyle='#fff'; ctx.globalAlpha=0.5; ctx.fillRect(wx,wy,ww,wh+MH*0.12); ctx.globalAlpha=1;
      ctx.fillStyle='#8C8A84'; for(let rI=1;rI<=3;rI++){ ctx.fillRect(wx, wy+rowH*rI-rowH*0.08, ww, rowH*0.08); ctx.strokeRect(wx, wy+rowH*rI-rowH*0.08, ww, rowH*0.08); }
      // tray divider
      ctx.fillStyle=C.ink; ctx.fillRect(wx, trayY+MH*0.1, ww, MH*0.02);
      const stateIt = items.find(i=>i.st); const leanA = A.struck? 0 : spin*0.45;
      for(const it of items){ let a=it.a, x=it.x, y=it.y; if(it.st && !A.struck){ a=leanA; x+=spin*cell*0.1; y-=spin*rowH*0.03; }
        ctx.save(); ctx.translate(x,y); ctx.rotate(a);
        if(it.st){ drawState(st,path,box,0,-rowH*0.3,sc,0,'#FFE34D'); label(r.st,0,-rowH*0.3,Math.min(rowH*0.3,box.w*sc*0.45),C.ink); }
        else { ctx.fillStyle=it.c; ctx.lineWidth=4; roundRect(-it.w/2,-it.h,it.w,it.h,it.h*0.15); ctx.fill(); ctx.stroke(); ctx.fillStyle=it.c==='#fff'?'#F0562A':'#fff'; roundRect(-it.w*0.35,-it.h*0.7,it.w*0.7,it.h*0.3,it.h*0.08); ctx.fill(); label(it.code,0,-it.h*0.55,it.h*0.22,it.c==='#fff'?'#fff':DARK); }
        ctx.restore();
        // coil in front (spins for B4)
        if(!it.falling){ const sp = it.st? spin*Math.PI*4 : 0; ctx.strokeStyle=C.ink; ctx.lineWidth=3; ctx.beginPath(); for(let i=0;i<=8;i++){ const u=i/8, px=it.x-it.w*0.5+u*it.w, py=it.y-it.h*0.18+Math.sin(u*Math.PI*4+sp)*it.h*0.1; i?ctx.lineTo(px,py):ctx.moveTo(px,py); } ctx.stroke(); } }
      // column numbers / row letters
      for(let c=0;c<4;c++) label(String(c+1), wx+cell*(c+0.5), wy+MH*0.025, rowH*0.16, DARK); for(let rI=0;rI<3;rI++) label('ABC'[rI], wx+ww*0.035, wy+rowH*(rI+0.4), rowH*0.16, DARK);
      // the pickup flap
      ctx.fillStyle=C.ink; roundRect(wx+ww*0.2, trayY+MH*0.13, ww*0.6, MH*0.07, MH*0.01); ctx.fill(); label('PUSH', wx+ww*0.5, trayY+MH*0.165, MH*0.03, '#FFE34D');
      // side panel: display, coin slot, keypad
      ctx.fillStyle=C.ink; roundRect(panelX, my+MH*0.04, MW*0.26, MH*0.06, 6); ctx.fill(); label(keyed||(t<1.2?'$1.25':''), panelX+MW*0.13, my+MH*0.07, MH*0.038, '#FFE34D');
      ctx.fillStyle='#FFE34D'; roundRect(panelX+MW*0.02, slotY-MW*0.02, MW*0.08, MW*0.04, 4); ctx.fill(); ctx.stroke(); ctx.fillStyle=C.ink; ctx.fillRect(panelX+MW*0.04, slotY-MW*0.004, MW*0.04, MW*0.008);
      '123456789B4A'.split('').forEach(ch=>{ const [bxp,byp]=btnPos(ch); const lit=(keyed.includes(ch) && (ch==='B'||ch==='4')); ctx.fillStyle=lit?'#FFE34D':'#fff'; ctx.lineWidth=3; roundRect(bxp-MW*0.03,byp-MW*0.03,MW*0.06,MW*0.06,6); ctx.fill(); ctx.stroke(); label(ch,bxp,byp+1,MW*0.035,DARK); });
      // the sign on top
      ctx.fillStyle='#FFE34D'; roundRect(mx+MW*0.08, my-H*0.06, MW*0.84, H*0.07, H*0.01); ctx.fill(); ctx.stroke(); label('SNACKS', mx+MW/2, my-H*0.025, H*0.045, DARK);
      ctx.restore();
      // ---- the coin in flight
      if(t<0.8){ const u=ease(t/0.75); const cxp=(dx-S*1.2)+(panelX+MW*0.06-(dx-S*1.2))*u, cyp=(dy-S*0.9)+(slotY-(dy-S*0.9))*u; ctx.fillStyle='#FFE34D'; ctx.strokeStyle=C.ink; ctx.lineWidth=4; ctx.beginPath(); ctx.ellipse(cxp,cyp,S*0.2*Math.abs(Math.cos(t*12))+2,S*0.2,0,0,7); ctx.fill(); ctx.stroke(); }
      // ---- the donkey
      const grab = rocking || (A.struck && t<A.struckAt+0.5); const lift = A.struck? clamp((t-A.struckAt-1.3)/0.8,0,1) : 0;
      const bob = rocking? Math.sin((t-3.6)*15)*S*0.08*rockT : 0; const mad = stuckT || rocking;
      donkey(dx+bob, dy, S, {flip:true, eyeX:-1, eyeY:mad?0.2:-0.4, mouth: A.struck? 1 : mad? 0.2 : 0.6, earUp:A.struck?1:0, headTilt: rocking? Math.sin((t-3.6)*15)*0.15*rockT : lift? -0.3*lift : 0, legs: rocking? [0.3,-0.3,0.2,-0.2] : [0,0,0,0], tailWag: rocking? Math.sin(t*20) : 0,
      });
      if(stuckT){ ctx.fillStyle='#fff'; ctx.strokeStyle=C.ink; ctx.lineWidth=4; ctx.beginPath(); ctx.arc(dx-S*1.9,dy-S*2.2,S*0.5,0,7); ctx.fill(); ctx.stroke(); label('?!', dx-S*1.9, dy-S*2.2, S*0.55, DARK); }
      const shx=dx-S*0.6+bob, shy=dy-S*0.3;
      if(armT && t<2.0) arm(shx,shy,armT[0],armT[1],S);
      else if(t>=2.0 && t<3.6){ const tap=Math.abs(Math.sin(t*9))*S*0.1; arm(shx,shy,dx-S*1.5+bob,dy+S*0.85-tap,S); }
      else if(grab){ arm(shx,shy,mx+MW+8,my+MH*0.3+bob*0.5,S); arm(shx-S*0.2,shy+S*0.1,mx+MW+8,my+MH*0.55+bob*0.5,S); }
      else if(A.struck){ // reach into the tray, then hoist the state overhead
        const reachX=wx+ww*0.5, reachY=trayY+MH*0.17; const upX=dx-S*0.3, upY=dy-S*2.4; const hx2=reachX+(upX-reachX)*lift, hy2=reachY+(upY-reachY)*lift; if(t>A.struckAt+0.9){ arm(shx,shy,hx2,hy2,S); const ls=sc+(liftSc-sc)*lift, sy2=hy2-box.h*ls*0.55; if(lift>0){ drawState(st,path,box,hx2,sy2,ls,Math.sin(t*4)*0.08*lift,'#FFE34D'); label(r.st,hx2,sy2,Math.min(H*0.07,box.w*ls*0.4),C.ink); } } }
      // the state vanishes from the tray once lifted
      if(stateIt && A.struck && t>A.struckAt+1.3) stateIt.rest=true, stateIt.y=H*2;
      if(!A.struck && t>=4.8){ A.struck=true; A.struckAt=t; hit('B4!','vendrop'); for(const it of items){ it.falling=true; it.vx=rr(-3,3); it.vy=rr(-4,2); it.va=rr(-0.2,0.2); } } };
    return A;
  },
});
KINDS.push('typewriter','magician','icecream','rocketcar','vending');
})();


/* ===== round 3, part 10 ===== */
/* anims-extra/part10.js — dominoes, conga, clawmachine, skateboard, barbecue */
(function(){
const ease = u => u<=0? 0 : u>=1? 1 : u*u*(3-2*u);
const easeOut = u => u<=0? 0 : u>=1? 1 : 1-Math.pow(1-u,3);
const clamp01 = u => u<0? 0 : u>1? 1 : u;
const BLUE='#2E6FE0', YEL='#FFE34D', RED='#F0562A', LB='#7FAAF6', PB='#BBD0F5', GREY='#8C8A84', DARK='#4a4744';
// bounding box of a state's absolute-coordinate SVG path (viewBox 975x610)
const stBox = st => { const n=(st.d.match(/-?\d+(\.\d+)?/g)||[]).map(Number); let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9; for(let i=0;i+1<n.length;i+=2){ x0=Math.min(x0,n[i]); x1=Math.max(x1,n[i]); y0=Math.min(y0,n[i+1]); y1=Math.max(y1,n[i+1]); } if(x1<x0){ x0=st.c[0]-120; x1=st.c[0]+120; y0=st.c[1]-120; y1=st.c[1]+120; } return {w:x1-x0, h:y1-y0, cx:(x0+x1)/2, cy:(y0+y1)/2}; };
// draw the state silhouette centred on (x,y); optional extra(sc) paints on top of the fill, clipped to the state
const drawState = (st,path,box,x,y,sc,rot,fill,sx,sy,extra) => { ctx.save(); ctx.translate(x,y); ctx.rotate(rot||0); ctx.scale(sc*(sx||1),sc*(sy||1)); ctx.translate(-box.cx,-box.cy); ctx.fillStyle=fill; ctx.strokeStyle=C.ink; ctx.lineWidth=4/sc; ctx.fill(path); if(extra){ ctx.save(); ctx.clip(path); extra(sc); ctx.restore(); } ctx.stroke(path); ctx.restore(); };
const label = (txt,x,y,px,col) => { ctx.fillStyle=col||C.ink; ctx.font=`900 ${Math.round(px)}px Archivo, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(txt,x,y); };
/* the blue donkey (facing right, origin = body centre, scale s) — body/neck/head/ears/eye; legs drawn separately so they can move */
const donkeyBody = (s, eye) => { ctx.fillStyle=BLUE; ctx.strokeStyle=C.ink; ctx.lineWidth=4; roundRect(-s*0.9,-s*0.45,s*1.8,s*0.9,s*0.3); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(s*0.8,-s*0.4); ctx.lineTo(s*1.25,-s*0.95); ctx.lineTo(s*1.5,-s*0.8); ctx.lineTo(s*1.05,-s*0.2); ctx.closePath(); ctx.fill(); ctx.stroke();
  roundRect(s*1.15,-s*1.15,s*0.75,s*0.5,s*0.15); ctx.fill(); ctx.stroke();
  ctx.fillStyle=YEL; for(const ex of [s*1.2,s*1.45]){ ctx.beginPath(); ctx.moveTo(ex,-s*1.1); ctx.lineTo(ex+s*0.1,-s*1.55); ctx.lineTo(ex+s*0.22,-s*1.1); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  if(eye!=='none'){ ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(s*1.7,-s*0.98,s*0.11,0,7); ctx.fill(); if(eye==='happy'){ ctx.strokeStyle=C.ink; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(s*1.7,-s*0.95,s*0.08,Math.PI*1.15,Math.PI*1.85); ctx.stroke(); } else { ctx.fillStyle=C.ink; ctx.beginPath(); ctx.arc(s*1.73,-s*0.97,s*0.05,0,7); ctx.fill(); } } };
/* four legs; angles given per leg (array of 4) — no per-leg save/restore */
const donkeyLegs = (s, angs) => { ctx.fillStyle=BLUE; ctx.strokeStyle=C.ink; ctx.lineWidth=4; const xs=[-s*0.7,-s*0.3,s*0.3,s*0.7]; for(let i=0;i<4;i++){ const a=angs[i]; ctx.translate(xs[i],s*0.4); ctx.rotate(a); ctx.fillRect(-s*0.09,0,s*0.18,s*0.5); ctx.strokeRect(-s*0.09,0,s*0.18,s*0.5); ctx.rotate(-a); ctx.translate(-xs[i],-s*0.4); } };
const walkLegs = (s, ph, amp) => donkeyLegs(s, [Math.sin(ph-s*0.7)*amp, -Math.sin(ph-s*0.3)*amp, Math.sin(ph+s*0.3)*amp, -Math.sin(ph+s*0.7)*amp]);
const donkeyTail = (s, t) => { ctx.strokeStyle=C.ink; ctx.lineWidth=6; ctx.beginPath(); ctx.moveTo(-s*0.9,-s*0.3); ctx.quadraticCurveTo(-s*1.5,-s*0.6+Math.sin(t*10)*s*0.3,-s*1.3,s*0.1); ctx.stroke(); };
/* a thick limb from (x0,y0) to (x1,y1): ink outline + blue core, with a hoof at the end */
const limb = (x0,y0,x1,y1,w) => { ctx.lineCap='round'; ctx.strokeStyle=C.ink; ctx.lineWidth=w+6; ctx.beginPath(); ctx.moveTo(x0,y0); ctx.lineTo(x1,y1); ctx.stroke(); ctx.strokeStyle=BLUE; ctx.lineWidth=w; ctx.stroke(); ctx.fillStyle=C.ink; ctx.beginPath(); ctx.arc(x1,y1,w*0.6,0,7); ctx.fill(); ctx.lineCap='butt'; };

/* ---------- sounds ---------- */
SFX.domTick = function(){ tone(1500, 0, 0.03, 'square', 0.07, 800); noise(0, 0.03, 0.18, 4500); };
SFX.topple = function(){ noise(0, 0.5, 0.8, 900); tone(140, 0, 0.35, 'square', 0.4, 50); for(let i=0;i<10;i++) tone(1200+Math.random()*1800, 0.05+i*0.05, 0.2, 'sine', 0.06); cheer(0.3); };
SFX.congaBeat = function(){ for(let b=0;b<20;b++){ const kick=b%4===3; tone(kick?110:170, b*0.42, 0.12, 'triangle', kick?0.4:0.28, 70); tone(kick?330:260, b*0.42, 0.06, 'square', 0.05, 200); for(let k=0;k<3;k++) noise(b*0.42+k*0.14, 0.04, 0.1, 7000); } };
SFX.conga = function(){ [392,523,659,784].forEach((f,i)=>{ tone(f, i*0.09, 0.35, 'sawtooth', 0.12); tone(f*0.5, i*0.09, 0.35, 'square', 0.05); }); tone(784, 0.4, 0.6, 'sawtooth', 0.14, 1047); cheer(0.3); };
SFX.clawWhir = function(){ noise(0, 1.4, 0.08, 700); tone(130, 0, 1.4, 'triangle', 0.08, 150); for(let i=0;i<6;i++) tone(880, 0.1+i*0.22, 0.04, 'square', 0.03); };
SFX.gotit = function(){ [880,1175,1568,2093].forEach((f,i)=>tone(f, i*0.12, 0.3, 'square', 0.16)); tone(2093, 0.5, 0.8, 'sine', 0.2); noise(0.1, 0.3, 0.2, 3000); cheer(0.4); };
SFX.skate = function(){ noise(0, 1.6, 0.16, 1100); tone(60, 0, 1.6, 'sawtooth', 0.05, 90); };
SFX.kickflip = function(){ noise(0, 0.35, 0.5, 2600); tone(500, 0, 0.5, 'sawtooth', 0.14, 1500); for(let i=0;i<6;i++){ tone(1500, 0.3+i*0.13, 0.08, 'square', 0.12, 2400); tone(2600, 0.36+i*0.13, 0.1, 'sawtooth', 0.08, 1100); } cheer(0.4); };
SFX.sizzle = function(){ noise(0, 2.6, 0.14, 6000); for(let i=0;i<18;i++) noise(0.2+i*0.14+Math.random()*0.08, 0.06, 0.18, 7000); };
SFX.welldone = function(){ noise(0, 0.5, 0.7, 2500); tone(220, 0, 0.25, 'square', 0.3, 70); tone(70, 0, 0.6, 'sawtooth', 0.25, 40); [523,659,784,1047].forEach((f,i)=>tone(f, 0.2+i*0.1, 0.5, 'triangle', 0.18)); cheer(0.4); };

Object.assign(ANIMS, {
  /* dominoes — a winding domino run topples across the screen; the last domino is the state, which flips to blue */
  dominoes({W,H,r,hit}){
    const A = {dur:9, struck:false, struckAt:0};
    const st=STATES[r.st]||STATES.TX, path=new Path2D(st.d), box=stBox(st);
    const h=Math.min(H*0.115,125), w=h*0.46, gap=h*0.52; const x0=W*0.2, x1=W*0.72; const N=Math.max(8,Math.floor((x1-x0)/gap));
    const P=[]; for(let i=0;i<N;i++){ const u=i/(N-1); P.push({x:x0+u*(x1-x0), y:H*0.6+Math.sin(u*Math.PI*2.2+0.5)*H*0.17}); }
    const T0=1.0, DT=0.055; const fallAt=i=>T0+i*DT; const tEnd=fallAt(N-1)+0.22; // the state gets hit here
    const sc=Math.min(H*0.32/box.h, W*0.2/box.w); const sx=x1+gap*0.5+box.w*sc*0.5, sy=P[N-1].y-box.h*sc*0.5;
    const pips=[[[0,0]],[[-1,-1],[1,1]],[[-1,-1],[0,0],[1,1]],[[-1,-1],[1,-1],[-1,1],[1,1]],[[-1,-1],[1,-1],[0,0],[-1,1],[1,1]],[[-1,-1],[1,-1],[-1,0],[1,0],[-1,1],[1,1]]];
    const S=Math.min(H*0.1,110); let lastTick=-1;
    const domino=(i,x,y,ang)=>{ ctx.save(); ctx.translate(x+w/2,y); ctx.rotate(ang); ctx.fillStyle='#fff'; ctx.strokeStyle=C.ink; ctx.lineWidth=4; roundRect(-w,-h,w,h,w*0.14); ctx.fill(); ctx.stroke();
      ctx.fillStyle=C.ink; ctx.fillRect(-w*0.85,-h/2-2,w*0.7,4); const pr=w*0.09; for(const [half,n] of [[-1,i%6],[1,(i*5+2)%6]]){ const cy=half<0? -h*0.75 : -h*0.25; for(const [px,py] of pips[n]){ ctx.beginPath(); ctx.arc(-w/2+px*w*0.24, cy+py*h*0.12, pr, 0, 7); ctx.fill(); } } ctx.restore(); };
    A.frame = t=>{
      // ground shadow under the run
      ctx.strokeStyle=C.ink; ctx.globalAlpha=0.12; ctx.lineWidth=10; ctx.beginPath(); for(let i=0;i<N;i++){ const p=P[i]; i? ctx.lineTo(p.x,p.y+4) : ctx.moveTo(p.x,p.y+4); } ctx.lineTo(sx,P[N-1].y+4); ctx.stroke(); ctx.globalAlpha=1;
      // the state: the last domino, standing on end; gets knocked, hops and flips over to its blue side
      const fs=t-tEnd; let flip=0, hop=0, rot=0; if(fs>0){ const p=clamp01(fs/0.7); flip=p; hop=Math.sin(p*Math.PI)*h*0.5; rot=Math.sin(p*Math.PI)*0.25; }
      const sxs = fs>0? Math.cos(flip*Math.PI) : 1; const blue = flip>=0.5; const wob = fs<0 && t>tEnd-0.5? Math.sin(t*40)*0.03 : 0;
      drawState(st,path,box,sx,sy-hop,sc,rot+wob,blue?BLUE:RED,Math.max(0.06,Math.abs(sxs)),1);
      if(Math.abs(sxs)>0.3) label(r.st,sx,sy-hop,H*0.06, blue? '#fff' : C.ink);
      // dominoes, drawn last-to-first so each fallen one lies on top of the next
      for(let i=N-1;i>=0;i--){ const f=t-fallAt(i); let ang=0; if(f>0){ ang=Math.min(1.22, easeOut(f/0.22)*1.22); if(f>0.22) ang+=Math.sin((f-0.22)*22)*0.04*Math.exp(-(f-0.22)*6); } domino(i,P[i].x-w/2,P[i].y,ang); }
      const k=Math.floor((t-T0)/DT); if(k!==lastTick && k>=0 && k<N){ lastTick=k; if(k%2===0) SFX.domTick(); }
      // the donkey that flicks the first domino
      const dx=P[0].x-S*2.3, dy=P[0].y-S*0.9; ctx.save(); ctx.translate(dx,dy); donkeyBody(S, t>tEnd? 'happy':'dot'); donkeyLegs(S,[0.1,-0.1,0.1,-0.1]); donkeyTail(S,t); ctx.restore();
      const reach=ease((t-0.25)/0.7); const hx=dx+S*1.0+reach*(P[0].x-w*0.1-(dx+S*1.0)), hy=dy-S*0.3-reach*(h*0.55); limb(dx+S*0.6,dy-S*0.2,hx,hy,S*0.22);
      if(!A.struck && fs>=0.35){ A.struck=true; A.struckAt=t; hit('TOPPLED!','topple'); } };
    return A;
  },
  /* conga — a conga line of donkeys snakes across, the state held aloft at the front; every 4th beat is a kick */
  conga({W,H,r,hit}){
    const A = {dur:9, struck:false, struckAt:0}; SFX.congaBeat(); setTimeout(()=>SFX.congaBeat(), 8400);
    const st=STATES[r.st]||STATES.TX, path=new Path2D(st.d), box=stBox(st);
    const S=Math.min(H*0.1,108), n=7, spacing=S*2.75, BEAT=0.42; const sc=Math.min(S*2.6/box.w, S*2.0/box.h);
    const V=(W+spacing*n+S*5)/8.8; const yOf=x=>H*0.56+Math.sin(x/W*Math.PI*2.2)*H*0.15; const notes=[]; let lastBeat=-1;
    const hats=[RED,YEL,LB,RED,YEL,LB,RED];
    A.frame = t=>{
      const beat=t/BEAT, bi=Math.floor(beat), kick=bi%4===3, ph=beat-bi; const bounce=Math.abs(Math.sin(beat*Math.PI))*S*0.1; const hop=kick? Math.sin(ph*Math.PI)*S*0.35 : 0;
      if(bi!==lastBeat){ lastBeat=bi; for(let k=0;k<2;k++) notes.push({x:rr(W*0.1,W*0.9), y:H*0.3, vy:-rr(1,2.5), a:1, s:rr(0.8,1.4), c:[RED,YEL,BLUE][bi%3]}); }
      // floating notes
      for(const m of notes){ m.y+=m.vy; m.a-=0.008; m.x+=Math.sin(m.y*0.05)*1.2; } for(let i=notes.length-1;i>=0;i--) if(notes[i].a<=0) notes.splice(i,1);
      for(const m of notes){ ctx.globalAlpha=Math.max(0,m.a); label('♪',m.x,m.y,H*0.06*m.s,m.c); } ctx.globalAlpha=1;
      const pos=[]; for(let k=0;k<n;k++){ const x=-S*3-k*spacing+t*V; pos.push({x,y:yOf(x)-bounce-hop}); }
      // donkeys back-to-front
      for(let k=n-1;k>=0;k--){ const p=pos[k]; if(p.x<-S*3 || p.x>W+S*3) continue; ctx.save(); ctx.translate(p.x,p.y);
        donkeyTail(S,t*1.4); donkeyBody(S,'dot');
        const wph=t*(Math.PI/BEAT); const amp=0.5; const legs=[Math.sin(wph)*amp, -Math.sin(wph)*amp*0.6, Math.sin(wph+1)*amp*0.6, -Math.sin(wph+1)*amp];
        if(kick){ legs[0]=-0.9-Math.sin(ph*Math.PI)*0.9; legs[1]=-0.2; } donkeyLegs(S,legs);
        // party hat
        ctx.fillStyle=hats[k]; ctx.strokeStyle=C.ink; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(S*1.2,-S*1.15); ctx.lineTo(S*1.5,-S*1.85); ctx.lineTo(S*1.78,-S*1.15); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle=YEL; ctx.beginPath(); ctx.arc(S*1.5,-S*1.85,S*0.09,0,7); ctx.fill(); ctx.stroke();
        // mouth open singing
        ctx.fillStyle=C.ink; ctx.beginPath(); ctx.ellipse(S*1.82,-S*0.72,S*0.07,S*0.05+Math.abs(Math.sin(beat*Math.PI*2))*S*0.05,0,0,7); ctx.fill();
        if(k===n-1){ // maracas on the last donkey
          const sh=Math.sin(t*28)*0.5; for(const [ox,d] of [[-S*0.3,-1],[S*0.1,1]]){ ctx.save(); ctx.translate(ox,-S*0.5); ctx.rotate(-0.6*d+sh); ctx.fillStyle=C.ink; ctx.fillRect(-S*0.04,-S*0.55,S*0.08,S*0.55); ctx.fillStyle=d>0?RED:YEL; ctx.strokeStyle=C.ink; ctx.beginPath(); ctx.ellipse(0,-S*0.7,S*0.18,S*0.22,0,0,7); ctx.fill(); ctx.stroke(); ctx.restore(); } }
        ctx.restore(); }
      // hooves on the shoulders of the donkey in front
      for(let k=1;k<n;k++){ const p=pos[k], q=pos[k-1]; if(p.x<-S*3 || p.x>W+S*3) continue; limb(p.x+S*0.9,p.y-S*0.4,q.x-S*0.55,q.y-S*0.5,S*0.2); }
      // the leader holds the state aloft
      const L=pos[0]; if(L.x>-S*4 && L.x<W+S*4){ const sway=Math.sin(beat*Math.PI)*0.12; const tx=L.x+S*1.1, ty=L.y-S*1.9-box.h*sc*0.45; limb(L.x+S*0.6,L.y-S*0.35,tx-S*0.45,ty+box.h*sc*0.4,S*0.2); limb(L.x+S*0.9,L.y-S*0.3,tx+S*0.45,ty+box.h*sc*0.4,S*0.2);
        drawState(st,path,box,tx,ty,sc,sway,BLUE); label(r.st,tx,ty,S*0.7,'#fff'); }
      if(!A.struck && L.x>=W*0.5){ A.struck=true; A.struckAt=t; hit('CONGA!','conga'); } };
    return A;
  },
  /* clawmachine — the claw descends, grabs the state and (miracle) actually holds; it drops into the prize chute */
  clawmachine({W,H,r,hit}){
    const A = {dur:9, struck:false, struckAt:0}; SFX.clawWhir(); setTimeout(()=>SFX.clawWhir(), 1400); setTimeout(()=>SFX.clawWhir(), 3400);
    const st=STATES[r.st]||STATES.TX, path=new Path2D(st.d), box=stBox(st);
    const MH=Math.min(H*0.9,980), MW=Math.min(MH*0.8,W*0.5), mx=W*0.47, mtop=H*0.5-MH/2+H*0.02, mbot=mtop+MH; const fr=MW*0.06;
    const gx0=mx-MW/2+fr, gx1=mx+MW/2-fr, gtop=mtop+MH*0.13, gbot=mtop+MH*0.7; // glass box
    const sc=Math.min(MW*0.3/box.w, MH*0.19/box.h); const sx0=mx+MW*0.12, sy0=gbot-box.h*sc*0.5-MH*0.02;
    const chuteX=gx0+MW*0.12; const S=Math.min(H*0.09,100); const dX=mx+MW/2+S*1.7, dY=mbot-S*1.0; let outAt=0;
    const prizes=[]; const cols=[RED,YEL,LB,PB,'#fff']; for(let i=0;i<13;i++){ prizes.push({x:gx0+MW*0.08+Math.random()*(gx1-gx0-MW*0.16), y:gbot-rr(MW*0.03,MW*0.2), r:rr(MW*0.06,MW*0.09), c:cols[i%cols.length], ph:Math.random()*6}); }
    // claw timeline
    const clawAt = t => { const cxStart=mx-MW*0.2, top=gtop+MH*0.04, low=sy0-box.h*sc*0.45;
      if(t<1.2) return {x:cxStart+(sx0-cxStart)*ease(t/1.2), y:top, open:1};
      if(t<1.4) return {x:sx0, y:top, open:1};
      if(t<2.1) return {x:sx0, y:top+(low-top)*ease((t-1.4)/0.7), open:1};
      if(t<2.5) return {x:sx0, y:low, open:1-ease((t-2.1)/0.4)};
      if(t<3.4) return {x:sx0, y:low+(top-low)*ease((t-2.5)/0.9), open:0, hold:true, got:t>2.65};
      if(t<4.5) return {x:sx0+(chuteX-sx0)*ease((t-3.4)/1.1), y:top, open:0, hold:true, got:true};
      if(t<4.9) return {x:chuteX, y:top, open:ease((t-4.5)/0.4), hold:false, rel:true, got:true};
      return {x:chuteX, y:top, open:1, rel:true, got:true}; };
    const claw=(x,y,open,wob)=>{ const L=MW*0.13; ctx.strokeStyle=C.ink; ctx.lineWidth=6; ctx.beginPath(); ctx.moveTo(x,mtop+MH*0.06); ctx.lineTo(x,y); ctx.stroke();
      ctx.save(); ctx.translate(x,y); ctx.rotate(wob||0); const spread=0.25+open*0.75;
      for(const d of [-1,0,1]){ const a=d*spread; ctx.lineCap='round'; for(const [col,lw] of [[C.ink,L*0.26],[GREY,L*0.16]]){ ctx.strokeStyle=col; ctx.lineWidth=lw; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(Math.sin(a)*L*0.9, Math.cos(a)*L*0.9); ctx.lineTo(Math.sin(a)*L*0.9 - d*L*0.35*(1-open*0.4), Math.cos(a)*L*0.9+L*0.5); ctx.stroke(); } }
      ctx.lineCap='butt'; ctx.fillStyle=GREY; ctx.strokeStyle=C.ink; ctx.lineWidth=5; ctx.beginPath(); ctx.arc(0,0,L*0.3,0,7); ctx.fill(); ctx.stroke(); ctx.fillStyle=RED; ctx.beginPath(); ctx.arc(0,0,L*0.12,0,7); ctx.fill(); ctx.restore(); };
    let outY=0, outVy=0, outX=chuteX, outRot=0;
    A.frame = t=>{
      const c=clawAt(t);
      // cabinet body
      ctx.fillStyle=RED; ctx.strokeStyle=C.ink; ctx.lineWidth=6; roundRect(mx-MW/2,mtop,MW,MH,18); ctx.fill(); ctx.stroke();
      // marquee
      ctx.fillStyle=YEL; roundRect(mx-MW/2+fr*0.6,mtop+fr*0.5,MW-fr*1.2,MH*0.08,10); ctx.fill(); ctx.stroke(); label('PRIZES',mx,mtop+fr*0.5+MH*0.04,MH*0.05,C.ink);
      for(let i=0;i<12;i++){ ctx.fillStyle=((i+Math.floor(t*5))%3===0)? '#fff' : (i%2? BLUE : RED); ctx.beginPath(); ctx.arc(mx-MW/2+fr*0.8+i*(MW-fr*1.6)/11, mtop+fr*0.5+MH*0.08+MH*0.015, MH*0.011, 0, 7); ctx.fill(); }
      // glass interior
      ctx.fillStyle=PB; ctx.fillRect(gx0,gtop,gx1-gx0,gbot-gtop); ctx.fillStyle=C.ink; ctx.globalAlpha=0.08; ctx.fillRect(gx0,gbot-MH*0.02,gx1-gx0,MH*0.02); ctx.globalAlpha=1;
      // prizes (plush blobs with faces)
      for(const p of prizes){ ctx.fillStyle=p.c; ctx.strokeStyle=C.ink; ctx.lineWidth=4; ctx.beginPath(); ctx.ellipse(p.x,p.y,p.r,p.r*0.85,0,0,7); ctx.fill(); ctx.stroke(); ctx.fillStyle=C.ink; ctx.beginPath(); ctx.arc(p.x-p.r*0.3,p.y-p.r*0.15,p.r*0.09,0,7); ctx.arc(p.x+p.r*0.3,p.y-p.r*0.15,p.r*0.09,0,7); ctx.fill(); ctx.lineWidth=3; ctx.beginPath(); ctx.arc(p.x,p.y+p.r*0.1,p.r*0.25,0.2,Math.PI-0.2); ctx.stroke(); }
      // the state (in the pile, in the claw, or dropping to the chute)
      let sx=sx0, sy=sy0, srot=0, show=true;
      if(c.hold){ sx=c.x; sy=c.y+box.h*sc*0.45+MH*0.01; srot=Math.sin(t*9)*0.06; }
      else if(c.rel){ outVy+=1.1; outY+=outVy; sx=chuteX; sy=c.y+box.h*sc*0.45+MH*0.01+outY; srot+=0.02; if(sy>gbot+box.h*sc){ show=false; } }
      if(show){ ctx.save(); ctx.beginPath(); ctx.rect(gx0,gtop,gx1-gx0,gbot-gtop+ (c.rel? MH*0.1 : 0)); ctx.clip(); drawState(st,path,box,sx,sy,sc,srot,BLUE); label(r.st,sx,sy,S*0.6,'#fff'); ctx.restore(); }
      // chute hole in the floor + glass frame + shine
      ctx.fillStyle=C.ink; ctx.fillRect(chuteX-MW*0.11,gbot-MH*0.025,MW*0.22,MH*0.025);
      ctx.strokeStyle=C.ink; ctx.lineWidth=5; ctx.strokeRect(gx0,gtop,gx1-gx0,gbot-gtop); ctx.fillStyle='#fff'; ctx.globalAlpha=0.35; ctx.beginPath(); ctx.moveTo(gx1-MW*0.1,gtop); ctx.lineTo(gx1-MW*0.02,gtop); ctx.lineTo(gx1-MW*0.16,gbot); ctx.lineTo(gx1-MW*0.24,gbot); ctx.closePath(); ctx.fill(); ctx.globalAlpha=1;
      // the claw (over the glass)
      claw(c.x,c.y,c.open, c.hold? Math.sin(t*9)*0.05 : (t<1.4? Math.sin(t*6)*0.08 : 0));
      // control panel: joystick + button + prize flap
      const py=gbot+MH*0.06; ctx.fillStyle=DARK; ctx.strokeStyle=C.ink; ctx.lineWidth=5; roundRect(gx0,py,gx1-gx0,MH*0.07,8); ctx.fill(); ctx.stroke();
      const jx=gx1-MW*0.18, jlean = t<1.4? 0.5 : t<3.9? 0 : t<5.2? -0.5 : 0; ctx.strokeStyle=C.ink; ctx.lineWidth=8; ctx.beginPath(); ctx.moveTo(jx,py); ctx.lineTo(jx+Math.sin(jlean)*MH*0.05, py-Math.cos(jlean)*MH*0.06); ctx.stroke(); ctx.fillStyle=RED; ctx.beginPath(); ctx.arc(jx+Math.sin(jlean)*MH*0.05, py-Math.cos(jlean)*MH*0.06, MH*0.022,0,7); ctx.fill(); ctx.stroke();
      ctx.fillStyle=(t>2.5&&t<3.0)? '#fff' : YEL; ctx.lineWidth=4; ctx.beginPath(); ctx.arc(jx-MW*0.16,py+MH*0.035,MH*0.02,0,7); ctx.fill(); ctx.stroke();
      // prize flap
      const fw=MW*0.26, fh=MH*0.15, fx=chuteX-fw/2, fy=mbot-fh-MH*0.03; ctx.fillStyle=C.ink; ctx.fillRect(fx,fy,fw,fh); label('PRIZE',chuteX,fy+MH*0.022,MH*0.03,'#fff'); if(!show && !outAt) outAt=t; ctx.fillStyle=GREY; ctx.strokeStyle=C.ink; ctx.lineWidth=4; const flapOpen = outAt? Math.min(1,(t-outAt)*2) : 0; roundRect(fx+6,fy+MH*0.045,fw-12,(fh-MH*0.05)*(1-flapOpen*0.7),6); ctx.fill(); ctx.stroke();
      // the prize slides out of the flap and lands in front
      if(outAt){ const p=clamp01((t-outAt-0.1)/0.8); const ex=mx-MW/2-S*2.1, ey=H*0.86 - Math.sin(p*Math.PI)*H*0.2; const bx = chuteX + (ex-chuteX)*p, by = fy+fh*0.6 + (ey-(fy+fh*0.6))*p; const esc=sc*(1+p*0.9); drawState(st,path,box,bx,by,esc,Math.sin(p*Math.PI)*0.6 + (p>=1? Math.sin(t*3)*0.05:0),BLUE); if(p>0.3) label(r.st,bx,by,S*0.8,'#fff'); }
      // the donkey at the joystick
      ctx.save(); ctx.translate(dX,dY); ctx.scale(-1,1); donkeyBody(S, A.struck? 'happy':'dot'); donkeyLegs(S,[0.05,-0.05,0.05,-0.05]); donkeyTail(S,t*0.8); ctx.restore();
      limb(dX-S*0.6,dY-S*0.3, jx+Math.sin(jlean)*MH*0.05, py-Math.cos(jlean)*MH*0.06-MH*0.02, S*0.2);
      // sweat drop while it's tense, then relief
      if(t>1.7 && !A.struck){ ctx.fillStyle=LB; ctx.beginPath(); ctx.arc(dX-S*1.9, dY-S*1.3+((t*2)%1)*S*0.3, S*0.08,0,7); ctx.fill(); }
      if(!A.struck && c.got){ A.struck=true; A.struckAt=t; hit('GOT IT!','gotit'); } };
    return A;
  },
  /* skateboard — a donkey with the state strapped to its back kickflips over a shark tank; the duck crowd goes wild */
  skateboard({W,H,r,hit}){
    const A = {dur:9, struck:false, struckAt:0}; SFX.skate();
    const st=STATES[r.st]||STATES.TX, path=new Path2D(st.d), box=stBox(st);
    const S=Math.min(H*0.1,110), gy=H*0.8, R=Math.min(W*0.22,H*0.55), cx=R, cy=gy-R; const sc=Math.min(S*1.7/box.w, S*1.3/box.h);
    const tx0=W*0.3, tx1=W*0.7, wy=gy-H*0.24; const lx=W*0.3, rx=W*0.76;
    const ducks=[]; for(let i=0;i<11;i++) ducks.push({x:W*0.03+i*W*0.094+rr(-20,20), y:H*0.9+rr(-10,10), s:S*0.5*rr(0.85,1.15), ph:Math.random()*6, d:i%2?1:-1});
    const fins=[0,1,2].map(i=>({off:i*(tx1-tx0)/3, v:(i%2?1:-1)*(W*0.08+i*20)}));
    const pose = t => { // → {x,y,ang,board flip, air}
      if(t<1.4){ const u=ease(t/1.4); const th=Math.PI-Math.PI/2*u; return {x:cx+R*Math.cos(th), y:cy+R*Math.sin(th), ang:Math.atan2(-Math.cos(th),Math.sin(th)), flip:0, air:false}; }
      if(t<1.8){ const u=(t-1.4)/0.4; return {x:R+(lx-R)*u, y:gy, ang:0, flip:0, air:false}; }
      if(t<3.8){ const u=(t-1.8)/2.0; return {x:lx+(rx-lx)*u, y:gy-Math.sin(u*Math.PI)*H*0.5, ang:-0.5*Math.sin(u*Math.PI)+u*0.3, flip:u*Math.PI*2, air:true}; }
      const u=(t-3.8); return {x:rx+u*W*0.06, y:gy+ (u<0.3? Math.sin(u/0.3*Math.PI)*S*0.15:0), ang:0, flip:0, air:false}; };
    A.frame = t=>{
      const p=pose(t);
      // quarter pipe
      ctx.fillStyle=GREY; ctx.strokeStyle=C.ink; ctx.lineWidth=6; ctx.beginPath(); ctx.moveTo(0,gy-R); ctx.arc(cx,cy,R,Math.PI,Math.PI/2,true); ctx.lineTo(0,gy); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle=BLUE; ctx.fillRect(0,gy-R-12,10,12);
      // ground
      ctx.fillStyle=C.ink; ctx.globalAlpha=0.15; ctx.fillRect(0,gy,W,H*0.012); ctx.globalAlpha=1;
      // shark tank
      ctx.fillStyle=LB; ctx.strokeStyle=C.ink; ctx.lineWidth=6; ctx.fillRect(tx0,wy,tx1-tx0,gy-wy); ctx.strokeRect(tx0,wy,tx1-tx0,gy-wy);
      ctx.fillStyle=BLUE; ctx.beginPath(); ctx.moveTo(tx0,wy+10); for(let i=0;i<=16;i++) ctx.lineTo(tx0+(tx1-tx0)*i/16, wy+10+Math.sin(i*1.1+t*5)*6); ctx.lineTo(tx1,gy); ctx.lineTo(tx0,gy); ctx.closePath(); ctx.fill();
      ctx.strokeStyle='#fff'; ctx.lineWidth=4; ctx.globalAlpha=0.5; ctx.beginPath(); for(let i=0;i<=16;i++){ const xx=tx0+(tx1-tx0)*i/16, yy=wy+10+Math.sin(i*1.1+t*5)*6; i? ctx.lineTo(xx,yy):ctx.moveTo(xx,yy); } ctx.stroke(); ctx.globalAlpha=1;
      ctx.fillStyle=YEL; ctx.strokeStyle=C.ink; ctx.lineWidth=4; roundRect(W*0.5-S*1.6,gy-H*0.1,S*3.2,S*0.6,8); ctx.fill(); ctx.stroke(); label('SHARK TANK',W*0.5,gy-H*0.1+S*0.3,S*0.36,C.ink);
      // fins circling
      for(const f of fins){ const span=tx1-tx0-80; let u=((f.off+t*f.v)%span+span)%span; const fx=tx0+40+u; const dir=Math.sign(f.v); ctx.fillStyle=GREY; ctx.strokeStyle=C.ink; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(fx-dir*S*0.5,wy+12); ctx.quadraticCurveTo(fx-dir*S*0.1,wy-S*0.5,fx+dir*S*0.35,wy-S*0.6); ctx.lineTo(fx+dir*S*0.5,wy+12); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      // one shark leaps for the donkey mid-flight
      const jp=clamp01((t-2.3)/1.0); if(jp>0&&jp<1){ const jy=wy-Math.sin(jp*Math.PI)*H*0.22, jx=W*0.5; ctx.save(); ctx.translate(jx,jy); ctx.rotate(-0.9+jp*1.2); ctx.fillStyle=GREY; ctx.strokeStyle=C.ink; ctx.lineWidth=5; ctx.beginPath(); ctx.ellipse(0,0,S*1.3,S*0.55,0,0,7); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-S*1.1,-S*0.1); ctx.lineTo(-S*1.8,-S*0.7); ctx.lineTo(-S*1.6,S*0.1); ctx.lineTo(-S*1.8,S*0.7); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-S*0.2,-S*0.5); ctx.lineTo(S*0.1,-S*1.2); ctx.lineTo(S*0.5,-S*0.5); ctx.closePath(); ctx.fill(); ctx.stroke();
        // jaws + teeth
        ctx.fillStyle='#fff'; ctx.beginPath(); ctx.moveTo(S*0.4,0); ctx.lineTo(S*1.35,-S*0.35); ctx.lineTo(S*1.35,S*0.4); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle=RED; ctx.beginPath(); ctx.moveTo(S*0.5,0); ctx.lineTo(S*1.2,-S*0.2); ctx.lineTo(S*1.2,S*0.3); ctx.closePath(); ctx.fill(); ctx.fillStyle='#fff'; for(let i=0;i<4;i++){ ctx.beginPath(); ctx.moveTo(S*(0.55+i*0.18),-S*(0.05+i*0.06)); ctx.lineTo(S*(0.62+i*0.18),S*0.1); ctx.lineTo(S*(0.7+i*0.18),-S*(0.08+i*0.06)); ctx.fill(); }
        ctx.beginPath(); ctx.arc(S*0.35,-S*0.3,S*0.1,0,7); ctx.fill(); ctx.fillStyle=C.ink; ctx.beginPath(); ctx.arc(S*0.38,-S*0.3,S*0.05,0,7); ctx.fill(); ctx.restore(); }
      // landing deck
      ctx.fillStyle=GREY; ctx.strokeStyle=C.ink; ctx.lineWidth=6; ctx.fillRect(rx-S*0.4,gy-S*0.1,W,S*0.1+H*0.03); ctx.strokeRect(rx-S*0.4,gy-S*0.1,W+20,S*0.1+H*0.03);
      // the donkey + board
      if(p.x<W+S*3){ ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.ang);
        // board (flips about its long axis in the air)
        const by=-S*0.1, fl=Math.cos(p.flip); ctx.save(); ctx.translate(0,by); ctx.scale(1,Math.max(0.12,Math.abs(fl))); ctx.fillStyle=fl>=0? RED : YEL; ctx.strokeStyle=C.ink; ctx.lineWidth=4; roundRect(-S*1.35,-S*0.1,S*2.7,S*0.2,S*0.1); ctx.fill(); ctx.stroke(); ctx.fillStyle=C.ink; for(const wx of [-S*0.85,S*0.85]){ ctx.beginPath(); ctx.arc(wx,S*0.22,S*0.14,0,7); ctx.fill(); } ctx.restore();
        ctx.translate(0,-S*1.05 - (p.air? S*0.25:0));
        // the state strapped on its back
        drawState(st,path,box,-S*0.1,-S*0.95 - box.h*sc*0.2,sc,0,BLUE); label(r.st,-S*0.1,-S*0.95-box.h*sc*0.2,S*0.45,'#fff');
        ctx.strokeStyle=C.ink; ctx.lineWidth=5; ctx.beginPath(); ctx.moveTo(-S*0.5,-S*0.45); ctx.lineTo(-S*0.5,-S*0.9); ctx.moveTo(S*0.35,-S*0.45); ctx.lineTo(S*0.35,-S*0.9); ctx.stroke();
        donkeyTail(S,t*(p.air?2:1)); donkeyBody(S, A.struck? 'happy':'dot');
        const bend = p.air? -0.5 : (t<1.6? 0.15 : 0); donkeyLegs(S,[bend,-bend*0.5,bend*0.5,-bend]);
        // helmet
        ctx.fillStyle=RED; ctx.strokeStyle=C.ink; ctx.lineWidth=4; ctx.beginPath(); ctx.arc(S*1.52,-S*1.12,S*0.42,Math.PI,0); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore(); }
      // duck crowd in the foreground
      for(const d of ducks){ const ex = A.struck? Math.abs(Math.sin(t*9+d.ph))*d.s*0.8 : Math.abs(Math.sin(t*3+d.ph))*d.s*0.12; const y=d.y-ex; ctx.save(); ctx.translate(d.x,y); ctx.scale(d.d,1); ctx.fillStyle=YEL; ctx.strokeStyle=C.ink; ctx.lineWidth=4; ctx.beginPath(); ctx.ellipse(0,0,d.s*0.9,d.s*0.6,0,0,7); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(d.s*0.6,-d.s*0.65,d.s*0.42,0,7); ctx.fill(); ctx.stroke();
        ctx.fillStyle=RED; ctx.beginPath(); ctx.moveTo(d.s*0.95,-d.s*0.7); ctx.lineTo(d.s*1.5,-d.s*0.55+(A.struck?Math.sin(t*20)*d.s*0.1:0)); ctx.lineTo(d.s*0.95,-d.s*0.45); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle=C.ink; ctx.beginPath(); ctx.arc(d.s*0.72,-d.s*0.78,d.s*0.07,0,7); ctx.fill();
        if(A.struck){ ctx.fillStyle=YEL; ctx.beginPath(); ctx.moveTo(-d.s*0.5,-d.s*0.2); ctx.lineTo(-d.s*1.1,-d.s*1.0-Math.sin(t*14+d.ph)*d.s*0.2); ctx.lineTo(-d.s*0.75,-d.s*0.1); ctx.closePath(); ctx.fill(); ctx.stroke(); } ctx.restore(); }
      if(!A.struck && t>=2.8){ A.struck=true; A.struckAt=t; hit('KICKFLIP!','kickflip'); } };
    return A;
  },
  /* barbecue — chef donkey flips a state-shaped patty: raw red side up, lands blue with grill marks, flames flare, cheese lands */
  barbecue({W,H,r,hit}){
    const A = {dur:9, struck:false, struckAt:0}; SFX.sizzle(); setTimeout(()=>SFX.sizzle(), 2800); setTimeout(()=>SFX.sizzle(), 5600);
    const st=STATES[r.st]||STATES.TX, path=new Path2D(st.d), box=stBox(st);
    const GW=Math.min(W*0.5,900), gx=W*0.47, gy=H*0.6; const sc=Math.min(GW*0.44/box.w, H*0.27/box.h); const px=gx-GW*0.04, py0=gy-box.h*sc*0.42;
    const S=Math.min(H*0.11,120), chX=gx+GW*0.4, chY=gy-S*0.25; const smoke=[]; const coals=[]; for(let i=0;i<9;i++) coals.push({x:gx-GW*0.4+i*GW*0.1, r:GW*0.035*rr(0.8,1.2), ph:Math.random()*6});
    const T1=1.0, T2=1.6, T3=2.9; // spatula in, lift starts, lands
    const grillMarks = s => { ctx.strokeStyle=C.ink; ctx.lineWidth=16/s; ctx.globalAlpha=0.7; ctx.beginPath(); for(let i=-6;i<8;i++){ ctx.moveTo(i*70-300,-50); ctx.lineTo(i*70+100,700); } ctx.stroke(); ctx.globalAlpha=1; };
    A.frame = t=>{
      const p=clamp01((t-T2)/(T3-T2)); const lift=Math.sin(p*Math.PI)*H*0.3; const fl=Math.cos(p*Math.PI); const blue=p>=0.5; const land = t>=T3;
      const spIn=ease((t-T1)/(T2-T1)); // spatula slide-in
      // chef donkey (behind the grill)
      const chop = land? Math.abs(Math.sin((t-T3)*8))*S*0.15*Math.max(0,1-(t-T3)/2) : 0;
      ctx.save(); ctx.translate(chX,chY-chop); ctx.scale(-1,1); donkeyTail(S,t); donkeyBody(S, land? 'happy':'dot'); donkeyLegs(S,[0.05,-0.05,0.05,-0.05]);
      // apron + chef hat
      ctx.fillStyle='#fff'; ctx.strokeStyle=C.ink; ctx.lineWidth=4; roundRect(-S*0.2,-S*0.5,S*1.0,S*0.95,S*0.1); ctx.fill(); ctx.stroke(); ctx.fillStyle=RED; ctx.fillRect(S*0.05,-S*0.1,S*0.5,S*0.08);
      ctx.fillStyle='#fff'; roundRect(S*1.2,-S*1.75,S*0.75,S*0.62,S*0.1); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(S*1.3,-S*1.75,S*0.22,0,7); ctx.arc(S*1.58,-S*1.85,S*0.26,0,7); ctx.arc(S*1.86,-S*1.75,S*0.22,0,7); ctx.fill(); ctx.stroke();
      ctx.restore();
      // grill: bowl, legs, coals, grate
      const legY=gy+GW*0.22; ctx.strokeStyle=C.ink; ctx.lineWidth=12; ctx.beginPath(); ctx.moveTo(gx-GW*0.3,legY-GW*0.03); ctx.lineTo(gx-GW*0.38,H*0.96); ctx.moveTo(gx+GW*0.3,legY-GW*0.03); ctx.lineTo(gx+GW*0.38,H*0.96); ctx.moveTo(gx,legY); ctx.lineTo(gx,H*0.96); ctx.stroke();
      ctx.fillStyle=DARK; ctx.lineWidth=6; ctx.beginPath(); ctx.ellipse(gx,gy,GW/2,GW*0.23,0,0,Math.PI); ctx.closePath(); ctx.fill(); ctx.stroke();
      // flames (flare on landing, small flicker otherwise)
      const flare = land? Math.max(0,1-(t-T3)/0.9) : 0; const fh = GW*0.05 + flare*H*0.3;
      for(let i=0;i<14;i++){ const fx=gx-GW*0.45+i*GW*0.9/13; const hgt=fh*(0.6+0.4*Math.abs(Math.sin(t*13+i*1.7)))*(0.7+0.3*Math.sin(i*0.9)); const wdt=GW*0.045*(1+flare*0.6); ctx.fillStyle=i%2? RED : YEL; ctx.beginPath(); ctx.moveTo(fx-wdt,gy); ctx.quadraticCurveTo(fx-wdt*0.5,gy-hgt*0.5,fx+Math.sin(t*9+i)*wdt*0.4,gy-hgt); ctx.quadraticCurveTo(fx+wdt*0.5,gy-hgt*0.5,fx+wdt,gy); ctx.closePath(); ctx.fill(); }
      for(const c of coals){ ctx.fillStyle=(Math.sin(t*6+c.ph)>0)? RED : YEL; ctx.beginPath(); ctx.ellipse(c.x,gy,c.r,c.r*0.5,0,0,7); ctx.fill(); }
      // grate bars
      ctx.strokeStyle=GREY; ctx.lineWidth=7; ctx.beginPath(); for(let i=0;i<9;i++){ const yy=gy-GW*0.03+i*GW*0.012; ctx.moveTo(gx-GW/2,yy); ctx.lineTo(gx+GW/2,yy); } ctx.stroke(); ctx.strokeStyle=C.ink; ctx.lineWidth=6; ctx.beginPath(); ctx.ellipse(gx,gy,GW/2,GW*0.05,0,0,7); ctx.stroke();
      // smoke
      if(t<T2 || land){ if(Math.random()<0.5 && smoke.length<120) smoke.push({x:px+rr(-box.w*sc*0.4,box.w*sc*0.4), y:py0-box.h*sc*0.2, r:rr(12,30), vx:rr(-0.6,0.6), vy:-rr(1.5,3), a:0.8}); }
      for(const m of smoke){ m.x+=m.vx+Math.sin(m.y*0.02)*0.8; m.y+=m.vy; m.r+=0.6; m.a-=0.009; } for(let i=smoke.length-1;i>=0;i--) if(smoke[i].a<=0) smoke.splice(i,1);
      ctx.fillStyle=GREY; for(const m of smoke){ ctx.globalAlpha=Math.max(0,m.a)*0.55; ctx.beginPath(); ctx.arc(m.x,m.y,m.r,0,7); ctx.fill(); } ctx.globalAlpha=1;
      // the patty
      const pyy=py0-lift; const sq = land && t<T3+0.3? 1-Math.sin((t-T3)/0.3*Math.PI)*0.12 : 1; const sizz = (!land && t<T2)? Math.sin(t*50)*0.01 : 0;
      drawState(st,path,box,px,pyy,sc,sizz+(p>0&&p<1? -Math.sin(p*Math.PI)*0.15:0),blue?BLUE:RED,Math.max(0.08,Math.abs(fl)),sq, blue? grillMarks : null);
      if(Math.abs(fl)>0.35) label(r.st,px,pyy,H*0.07, blue? '#fff' : C.ink);
      // spatula (handle from the chef's hoof)
      const hx=chX-S*0.7, hy=chY-S*0.45; let spx, spy, spa; if(t<T1){ spx=chX-S*1.3; spy=chY-S*1.6; spa=-1.2; } else { const tipx=px+box.w*sc*0.1, tipy=py0+box.h*sc*0.42; const under = p<0.35? Math.sin(p/0.35*Math.PI/2) : (p<1? Math.max(0,1-(p-0.35)/0.45):0); spx=chX-S*1.3+(tipx-(chX-S*1.3))*spIn; spy=(chY-S*1.6)+(tipy-(chY-S*1.6))*spIn - lift*under; spa=-1.2+1.2*spIn - under*0.4; }
      ctx.save(); ctx.translate(spx,spy); ctx.rotate(spa); ctx.fillStyle=GREY; ctx.strokeStyle=C.ink; ctx.lineWidth=4; roundRect(-S*1.4,-S*0.12,S*1.6,S*0.5,S*0.08); ctx.fill(); ctx.stroke(); ctx.fillStyle=C.ink; for(let i=0;i<3;i++) ctx.fillRect(-S*1.2,-S*0.0+i*S*0.14,S*1.2,S*0.05); ctx.restore();
      ctx.strokeStyle=C.ink; ctx.lineWidth=12; ctx.lineCap='round'; ctx.beginPath(); ctx.moveTo(spx+Math.cos(spa)*S*0.2,spy+Math.sin(spa)*S*0.2); ctx.lineTo(hx,hy); ctx.stroke(); ctx.lineCap='butt';
      limb(chX-S*0.4,chY-S*0.3-chop,hx,hy,S*0.22);
      // cheese: drops from above after landing, then melts
      if(t>T3+0.5){ const cp=clamp01((t-T3-0.5)/0.6); const cw=box.w*sc*0.36, cy=py0-box.h*sc*0.02; const yy = -cw + (cy-(-cw))*easeOut(cp)*1 ; const melt = cp>=1? Math.min(1,(t-T3-1.1)/2) : 0; const ddown=melt*cw*0.35;
        ctx.save(); ctx.translate(px+box.w*sc*0.12,cp>=1? cy : yy); ctx.rotate((1-cp)*0.8); ctx.fillStyle=YEL; ctx.strokeStyle=C.ink; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(-cw/2,-cw/2); ctx.lineTo(cw/2,-cw/2); ctx.lineTo(cw/2,cw/2+ddown*0.4); ctx.quadraticCurveTo(cw*0.3,cw/2+ddown*1.4,cw*0.15,cw/2); ctx.lineTo(-cw*0.1,cw/2); ctx.quadraticCurveTo(-cw*0.25,cw/2+ddown,-cw*0.35,cw/2); ctx.lineTo(-cw/2,cw/2+ddown*0.6); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
      // sizzle sparks while raw
      if(!land && t<T2){ ctx.fillStyle=YEL; for(let i=0;i<5;i++){ ctx.beginPath(); ctx.arc(px+rr(-box.w*sc*0.45,box.w*sc*0.45), py0+box.h*sc*0.4+rr(-10,6), rr(2,5),0,7); ctx.fill(); } }
      if(!A.struck && land){ A.struck=true; A.struckAt=t; hit('WELL DONE!','welldone'); } };
    return A;
  }
});
KINDS.push('dominoes','conga','clawmachine','skateboard','barbecue');
})();


/* ===== Texas special ===== */
/* anims-extra/part11.js — talafreako: the Texas Senate special (≈22 s, multi-act).
   Triggered by index.html when the Texas Senate race is called for the Democrat; not part of the random deck.
   Self-contained: every helper used here is defined in this file. */
(function(){
const ease = u => u<=0? 0 : u>=1? 1 : u*u*(3-2*u);
const easeOut = u => u<=0? 0 : u>=1? 1 : 1-Math.pow(1-u,3);
const clamp01 = u => u<0? 0 : u>1? 1 : u;
const stBox = st => { const n=(st.d.match(/-?\d+(\.\d+)?/g)||[]).map(Number); let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9; for(let i=0;i+1<n.length;i+=2){ x0=Math.min(x0,n[i]); x1=Math.max(x1,n[i]); y0=Math.min(y0,n[i+1]); y1=Math.max(y1,n[i+1]); } return {x0,y0,w:x1-x0,h:y1-y0,cx:(x0+x1)/2,cy:(y0+y1)/2}; };
const drawState = (path,box,x,y,sc,rot,fill,lw) => { ctx.save(); ctx.translate(x,y); ctx.rotate(rot||0); ctx.scale(sc,sc); ctx.translate(-box.cx,-box.cy); ctx.fillStyle=fill; ctx.strokeStyle=C.ink; ctx.lineWidth=(lw||6)/sc; ctx.fill(path); ctx.stroke(path); ctx.restore(); };
const label = (txt,x,y,px,col,align) => { ctx.fillStyle=col||C.ink; ctx.font=`900 ${Math.round(px)}px Archivo, sans-serif`; ctx.textAlign=align||'center'; ctx.textBaseline='middle'; ctx.fillText(txt,x,y); };
const star = (x,y,R,rot,fill) => { ctx.save(); ctx.translate(x,y); ctx.rotate(rot||0); ctx.beginPath(); for(let i=0;i<10;i++){ const a=i*Math.PI/5-Math.PI/2, rr_=i%2? R*0.42 : R; ctx.lineTo(Math.cos(a)*rr_, Math.sin(a)*rr_); } ctx.closePath(); ctx.fillStyle=fill; ctx.fill(); ctx.strokeStyle=C.ink; ctx.lineWidth=Math.max(3,R*0.05); ctx.stroke(); ctx.restore(); };
/* cowboy donkey (faces right; origin = centre of body; s = half body length). o: {flip, rot, legs(ph), hat, boots, grin, look, lw, hot} */
const donkey = (x,y,s,o) => { o=o||{}; ctx.save(); ctx.translate(x,y); if(o.rot) ctx.rotate(o.rot); if(o.flip) ctx.scale(-1,1);
  const body = o.hot? '#F0562A' : '#2E6FE0'; ctx.fillStyle=body; ctx.strokeStyle=C.ink; ctx.lineWidth=o.lw||Math.max(3,s*0.06);
  ctx.lineWidth*=1.4; ctx.beginPath(); ctx.moveTo(-s*0.9,-s*0.3); ctx.quadraticCurveTo(-s*1.4,-s*0.1,-s*1.2,s*0.3); ctx.stroke(); ctx.lineWidth/=1.4;
  for(const [lx,d] of [[-s*0.7,1],[-s*0.3,-1],[s*0.3,1],[s*0.7,-1]]){ const a = o.legs!=null? Math.sin(o.legs+lx/s*3)*0.55*d : 0; ctx.save(); ctx.translate(lx,s*0.4); ctx.rotate(a); ctx.fillStyle=body; roundRect(-s*0.12,0,s*0.24,s*0.6,s*0.08); ctx.fill(); ctx.stroke();
    if(o.boots){ ctx.fillStyle='#8B4A1F'; roundRect(-s*0.16,s*0.42,s*0.36,s*0.22,s*0.06); ctx.fill(); ctx.stroke(); } ctx.restore(); }
  ctx.fillStyle=body; roundRect(-s*0.9,-s*0.45,s*1.8,s*0.9,s*0.3); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(s*0.8,-s*0.4); ctx.lineTo(s*1.25,-s*0.95); ctx.lineTo(s*1.5,-s*0.8); ctx.lineTo(s*1.05,-s*0.2); ctx.closePath(); ctx.fill(); ctx.stroke();
  roundRect(s*1.15,-s*1.15,s*0.75,s*0.5,s*0.15); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#FFE34D'; for(const ex of [s*1.2,s*1.45]){ ctx.beginPath(); ctx.moveTo(ex,-s*1.1); ctx.lineTo(ex+s*0.1,-s*1.55); ctx.lineTo(ex+s*0.22,-s*1.1); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  if(o.hat!==false){ ctx.save(); ctx.translate(s*1.5,-s*1.2); if(o.hatTip){ ctx.translate(s*0.5,-s*0.3); ctx.rotate(-0.6); } ctx.fillStyle='#8B4A1F'; roundRect(-s*0.75,-s*0.12,s*1.5,s*0.2,s*0.08); ctx.fill(); ctx.stroke(); roundRect(-s*0.4,-s*0.55,s*0.8,s*0.5,s*0.12); ctx.fill(); ctx.stroke(); ctx.fillStyle='#FFE34D'; ctx.fillRect(-s*0.4,-s*0.2,s*0.8,s*0.08); ctx.restore(); }
  ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(s*1.7,-s*0.98,s*0.12,0,7); ctx.fill(); ctx.fillStyle=C.ink; ctx.beginPath(); ctx.arc(s*1.73+(o.look||0)*s*0.04,-s*0.97,s*0.055,0,7); ctx.fill();
  if(o.grin){ ctx.strokeStyle=C.ink; ctx.lineWidth=Math.max(2,s*0.05); ctx.beginPath(); ctx.arc(s*1.68,-s*0.76,s*0.14,0.15,Math.PI-0.15); ctx.stroke(); }
  if(o.hot){ ctx.fillStyle='#FFE34D'; for(let i=0;i<3;i++){ const fy=-s*(1.2+((o.hot*3+i*0.33)%1)*0.6); ctx.beginPath(); ctx.moveTo(s*1.45+i*s*0.14,fy); ctx.lineTo(s*1.52+i*s*0.14,fy-s*0.25); ctx.lineTo(s*1.59+i*s*0.14,fy); ctx.closePath(); ctx.fill(); } }
  ctx.restore(); };
const longhorn = (x,y,s,ph) => { ctx.save(); ctx.translate(x,y); ctx.strokeStyle=C.ink; ctx.lineWidth=Math.max(3,s*0.06);
  for(const [lx,d] of [[-s*0.8,1],[-s*0.35,-1],[s*0.35,1],[s*0.8,-1]]){ ctx.save(); ctx.translate(lx,s*0.45); ctx.rotate(Math.sin(ph+lx/s*2)*0.5*d); ctx.fillStyle='#B8742A'; roundRect(-s*0.13,0,s*0.26,s*0.7,s*0.08); ctx.fill(); ctx.stroke(); ctx.restore(); }
  ctx.fillStyle='#B8742A'; roundRect(-s*1.1,-s*0.5,s*2.2,s*1.0,s*0.35); ctx.fill(); ctx.stroke();
  roundRect(s*0.9,-s*0.95,s*0.9,s*0.7,s*0.2); ctx.fill(); ctx.stroke();
  // the horns
  ctx.fillStyle='#fff'; ctx.lineWidth=Math.max(3,s*0.05); for(const d of [-1,1]){ ctx.beginPath(); ctx.moveTo(s*1.25,-s*0.9); ctx.quadraticCurveTo(s*1.25+d*s*0.9,-s*1.4, s*1.25+d*s*1.6,-s*1.55); ctx.quadraticCurveTo(s*1.25+d*s*0.9,-s*1.15, s*1.45,-s*0.85); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(s*1.55,-s*0.7,s*0.11,0,7); ctx.fill(); ctx.fillStyle=C.ink; ctx.beginPath(); ctx.arc(s*1.58,-s*0.7,s*0.05,0,7); ctx.fill();
  ctx.fillStyle='#F0562A'; roundRect(s*1.5,-s*0.45,s*0.3,s*0.18,s*0.06); ctx.fill(); ctx.stroke(); // nose ring-ish
  ctx.restore(); };
const derrick = (x,gy,h,gush,t) => { ctx.strokeStyle=C.ink; ctx.lineWidth=5; ctx.fillStyle='#7A6A55';
  ctx.beginPath(); ctx.moveTo(x-h*0.28,gy); ctx.lineTo(x-h*0.07,gy-h); ctx.lineTo(x+h*0.07,gy-h); ctx.lineTo(x+h*0.28,gy); ctx.closePath(); ctx.fill(); ctx.stroke();
  for(let i=1;i<5;i++){ const yy=gy-h*i/5, hw=h*0.28*(1-i/5)+h*0.07*i/5; ctx.beginPath(); ctx.moveTo(x-hw,yy); ctx.lineTo(x+hw,yy); ctx.stroke(); }
  if(gush>0){ const gh=h*1.4*gush; ctx.fillStyle='#2E6FE0'; roundRect(x-h*0.1,gy-h-gh,h*0.2,gh,h*0.08); ctx.fill(); ctx.stroke();
    for(let i=0;i<10;i++){ const u=((t*1.6+i*0.1)%1); const bx=x+Math.sin(i*2.3)*h*0.45*u, by=gy-h-gh+ -h*0.2 + u*u*(h+gh)*0.9; ctx.fillStyle='#2E6FE0'; ctx.beginPath(); ctx.arc(bx,by,h*0.035*(1-u*0.5),0,7); ctx.fill(); } } };
const bluebonnet = (x,y,s,g) => { if(g<=0) return; ctx.save(); ctx.translate(x,y); ctx.scale(g,g); ctx.strokeStyle='#2E8B57'; ctx.lineWidth=Math.max(3,s*0.12); ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0,-s*1.4); ctx.stroke();
  for(let i=0;i<7;i++){ const yy=-s*0.5-i*s*0.16, w=s*(0.42-i*0.045); ctx.fillStyle= i%2? '#2E6FE0':'#7FAAF6'; ctx.beginPath(); ctx.ellipse(-w*0.5,yy,w*0.55,s*0.13,0,0,7); ctx.ellipse(w*0.5,yy,w*0.55,s*0.13,0,0,7); ctx.fill(); }
  ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(0,-s*1.62,s*0.14,0,7); ctx.fill(); ctx.restore(); };
const tumbleweed = (x,y,R,rot) => { ctx.save(); ctx.translate(x,y); ctx.rotate(rot); ctx.strokeStyle='#8B6A3A'; ctx.lineWidth=4; for(let i=0;i<9;i++){ ctx.beginPath(); ctx.ellipse(0,0,R,R*(0.35+0.07*i),i*0.35,0,7); ctx.stroke(); } ctx.restore(); };

/* ---------- sounds ---------- */
SFX.txWind = function(){ noise(0, 3.2, 0.1, 600); for(let i=0;i<6;i++) tone(330+Math.sin(i)*40, i*0.5, 0.45, 'triangle', 0.05, 300); };
SFX.hoofbeats = function(){ for(let i=0;i<14;i++){ noise(i*0.16, 0.05, 0.35, 500); tone(90, i*0.16, 0.08, 'sine', 0.3, 50); } };
SFX.lassoWhirl = function(){ for(let i=0;i<10;i++) noise(i*0.12, 0.1, 0.18, 2500); };
SFX.yeehaw = function(){ noise(0, 0.12, 0.7, 1500); tone(392, 0, 0.18, 'sawtooth', 0.22, 523); tone(523, 0.18, 0.12, 'sawtooth', 0.22, 659); tone(659, 0.3, 0.5, 'sawtooth', 0.25, 880); tone(880, 0.75, 0.6, 'square', 0.18, 440); cheer(0.4); };
SFX.chomp = function(){ noise(0, 0.08, 0.6, 1800); tone(220, 0, 0.1, 'square', 0.3, 80); noise(0.22, 0.08, 0.6, 1800); tone(220, 0.22, 0.1, 'square', 0.3, 80); };
SFX.growl = function(){ for(let i=0;i<10;i++) tone(60+i*18, i*0.18, 0.3, 'sawtooth', 0.14+i*0.02, 55+i*20); noise(0.8, 1.2, 0.2, 400); };
SFX.bigStomp = function(){ noise(0, 0.35, 0.9, 250); tone(42, 0, 0.45, 'sine', 0.7, 25); tone(110, 0.02, 0.15, 'square', 0.25, 40); };
SFX.cowbell = function(){ tone(587, 0, 0.14, 'square', 0.28, 500); tone(845, 0, 0.1, 'square', 0.2, 760); noise(0, 0.03, 0.4, 3500); };
SFX.twang = function(){ for(const [f,d] of [[196,0],[247,0.08],[294,0.16],[392,0.24]]) tone(f, d, 0.55, 'sawtooth', 0.16, f*0.97); tone(98, 0, 0.6, 'triangle', 0.2, 96); };
SFX.freakMode = function(){ for(let i=0;i<24;i++){ tone(i%2? 880:660, i*0.125, 0.1, 'square', 0.14); if(i%4===0) noise(i*0.125, 0.08, 0.5, 300); if(i%4===2) noise(i*0.125, 0.05, 0.3, 3000); } tone(110, 0, 3, 'sawtooth', 0.08, 220); };
SFX.freako = function(){ noise(0, 0.5, 1.0, 1200); tone(65, 0, 0.5, 'square', 0.5, 30); [523,659,784,1047,1319].forEach((f,i)=>tone(f, 0.1+i*0.08, 0.9, 'sawtooth', 0.16)); for(let i=0;i<8;i++) tone(1000+Math.random()*2000, 0.5+i*0.1, 0.1, 'square', 0.08, 300); cheer(0.3); cheer(1.4); };
SFX.hatTip = function(){ tone(523, 0, 0.3, 'triangle', 0.2, 659); tone(784, 0.3, 0.8, 'triangle', 0.22, 783); };

Object.assign(ANIMS, {
  /* talafreako — the Texas special. Act 1 lasso (0–5.5 s), Act 2 bigger in Texas (5.5–11), Act 3 FREAK MODE (11–18.5), Act 4 hat tip (18.5–22) */
  talafreako({W,H,r,hit,banner,shake,spawnConfetti}){
    const A = {dur:22, struck:false, struckAt:0};
    const st=STATES.TX, path=new Path2D(st.d), box=stBox(st);
    const gy=H*0.78;                    // ground line
    const S=Math.min(H*0.1,110);        // donkey base size
    const stSc=Math.min(H*0.34/box.h, W*0.26/box.w); const stX=W*0.6, stY=H*0.46;
    const bonnets=[]; for(let i=0;i<26;i++) bonnets.push({x:W*0.03+Math.random()*W*0.94, y:gy+Math.random()*H*0.12, s:S*0.22+Math.random()*S*0.14, at:6.4+Math.random()*3.2});
    const crowd=[]; for(let i=0;i<14;i++) crowd.push({x:W*0.04+i*W*0.068, ph:Math.random()*6, s:S*0.42, hot:Math.random()<0.3});
    const word='TALAFREAKO'; const letterAt=i=>11.6+i*0.34;
    const flags=[]; const fire=(k)=>{ if(flags[k]) return; flags[k]=true; const fn={
      wind:()=>SFX.txWind(), hoof:()=>SFX.hoofbeats(), whirl:()=>SFX.lassoWhirl(), yee:()=>{ A.struck=true; A.struckAt=4.5; hit('YEEHAW!','yeehaw'); },
      chomp:()=>SFX.chomp(), growl:()=>{ SFX.growl(); banner('BIGGER!',2.2); }, stomp:()=>{ hit('STOMP!','bigStomp'); }, stomp2:()=>{ SFX.bigStomp(); shake(); },
      freak:()=>{ SFX.freakMode(); banner('FREAK MODE',2.4); }, freako:()=>{ hit('TALAFREAKO!','freako'); spawnConfetti(200); }, tip:()=>SFX.hatTip() }[k]; fn&&fn(); };
    const letterFlags=[];
    let vibe=0;
    A.frame = t=>{
      /* ---- backdrop ---- */
      const freak = t>=11 && t<18.6; const cool = t>=18.6;
      const sky = freak? (Math.floor(t*2)%2? '#2E6FE0':'#F0562A') : cool? '#2E6FE0' : '#BBD0F5';
      ctx.fillStyle=sky; ctx.fillRect(0,0,W,H);
      if(freak){ ctx.fillStyle='rgba(255,255,255,0.18)'; for(let i=0;i<12;i++){ const a=i*Math.PI/6+t*0.8; ctx.beginPath(); ctx.moveTo(W/2,H*0.5); ctx.lineTo(W/2+Math.cos(a)*W, H*0.5+Math.sin(a)*W); ctx.lineTo(W/2+Math.cos(a+0.26)*W, H*0.5+Math.sin(a+0.26)*W); ctx.closePath(); ctx.fill(); } }
      // sun / lone star
      if(t<5.5){ ctx.fillStyle='#FFE34D'; ctx.beginPath(); ctx.arc(W*0.86,H*0.16,H*0.07,0,7); ctx.fill(); ctx.strokeStyle=C.ink; ctx.lineWidth=5; ctx.stroke(); }
      else { const g=easeOut((t-5.5)/1.2); star(W*0.5,H*0.42,Math.min(W,H)*0.36*g*(freak? 1+0.06*Math.sin(t*6):1), t*0.6, freak? '#FFE34D':'#FFE34D'); }
      // ground
      ctx.fillStyle = cool? '#1E4FB0' : '#E9C27A'; ctx.fillRect(0,gy,W,H-gy); ctx.strokeStyle=C.ink; ctx.lineWidth=6; ctx.beginPath(); ctx.moveTo(0,gy); ctx.lineTo(W,gy); ctx.stroke();
      // derricks
      const gush = clamp01((t-7.8)/1.2); derrick(W*0.09,gy,H*0.3,gush,t); derrick(W*0.91,gy,H*0.34,gush,t);
      // bluebonnets
      for(const b of bonnets) bluebonnet(b.x,b.y,b.s,easeOut((t-b.at)/0.5));
      fire('wind');
      /* ---- the state ---- */
      let stFill = t<4.5? '#F0562A' : (t<4.9? (Math.floor(t*12)%2? '#FFE34D':'#2E6FE0') : '#2E6FE0');
      let sx=stX, sy=stY, ssc=stSc, srot=0;
      if(t>=4.3 && t<4.9){ const k=(t-4.3)/0.6; sx+= -W*0.03*Math.sin(k*Math.PI*3); srot=0.12*Math.sin(k*Math.PI*4); }
      if(t>=5.5 && t<11){ ssc*=1-0.35*ease((t-5.5)/0.8); sy = stY - H*0.1*ease((t-5.5)/0.8); }
      if(t>=11 && t<18.6){ ssc*=0.65; sy=stY-H*0.1; }
      if(cool){ const k=ease((t-18.6)/1.0); ssc = stSc*(0.65+0.55*k)*(1+0.03*Math.sin(t*3)); sx = stX+(W*0.64-stX)*k; sy = (stY-H*0.1)+(H*0.4-(stY-H*0.1))*k;
        ctx.fillStyle=`rgba(255,227,77,${0.25+0.15*Math.sin(t*3)})`; ctx.beginPath(); ctx.arc(sx,sy,Math.min(W,H)*0.34,0,7); ctx.fill(); }
      drawState(path,box,sx,sy,ssc,srot,stFill);
      if(cool && t>19.6) label('TX', sx, sy, H*0.12, '#fff');
      /* ---- Act 1: ride in + lasso ---- */
      if(t<5.5){
        // tumbleweed
        const twx = W*1.05 - (W*1.3)*clamp01(t/3.2); tumbleweed(twx, gy-H*0.06+Math.abs(Math.sin(t*5))*-H*0.03, H*0.055, -t*4);
        if(t>0.8){ fire('hoof'); const rx = -W*0.2 + (W*0.5)*easeOut((t-0.8)/2.2); const by = gy-S*1.1 + Math.abs(Math.sin(t*9))*-S*0.12;
          longhorn(rx, by, S*0.9, t*9); donkey(rx-S*0.1, by-S*1.05, S*0.8, {boots:true, legs:null, grin:t>4.5, look:1});
          // lasso: whirl 2.8–4.3, fly 4.3–4.5, loop around state after
          if(t>2.8){ fire('whirl'); const hx=rx+S*0.9, hy=by-S*1.9; ctx.strokeStyle='#8B4A1F'; ctx.lineWidth=7; ctx.lineCap='round';
            if(t<4.3){ const a=t*14; ctx.beginPath(); ctx.ellipse(hx+Math.cos(a)*S*0.3, hy-S*0.6+Math.sin(a)*S*0.18, S*0.55, S*0.25, a*0.3, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(hx,hy); ctx.lineTo(hx+Math.cos(a)*S*0.3, hy-S*0.6+Math.sin(a)*S*0.18); ctx.stroke(); }
            else { const k=easeOut((t-4.3)/0.2); const lx=hx+(sx-hx)*k, ly=hy+(sy-hy)*k; ctx.beginPath(); ctx.moveTo(hx,hy); ctx.quadraticCurveTo((hx+lx)/2, Math.min(hy,ly)-S*0.6*(1-k), lx, ly); ctx.stroke(); ctx.beginPath(); ctx.ellipse(lx,ly,box.w*ssc*0.6*(0.3+0.7*k),box.h*ssc*0.6*(0.3+0.7*k),0,0,7); ctx.stroke(); if(t>=4.5) fire('yee'); } }
        }
        if(t<2.6) label("Deep in the heart of…", W*0.5, H*0.12, H*0.06, '#fff');
      }
      /* ---- Act 2: bigger in Texas ---- */
      let big = 1; let dx=W*0.33, dy=gy-S*1.1; let hot=0;
      if(t>=5.5 && t<11){
        const k=t-5.5;
        if(k<1.3){ // pepper floats to the mouth
          const px=dx+S*1.9, py=dy-S*1.1-S*1.6*(1-ease(k/1.0)); ctx.save(); ctx.translate(px,py); ctx.rotate(-0.6); ctx.fillStyle='#F0562A'; ctx.strokeStyle=C.ink; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(0,-S*0.4); ctx.quadraticCurveTo(S*0.5,-S*0.1,S*0.1,S*0.6); ctx.quadraticCurveTo(-S*0.3,S*0.2,0,-S*0.4); ctx.fill(); ctx.stroke(); ctx.fillStyle='#2E8B57'; roundRect(-S*0.08,-S*0.55,S*0.16,S*0.2,S*0.05); ctx.fill(); ctx.stroke(); ctx.restore();
          if(k>1.0) fire('chomp'); }
        if(k>=1.3){ fire('growl'); hot = t; big = 1+1.5*ease((k-1.3)/2.2); }
        if(k>=3.9){ fire('stomp'); } if(k>=4.7){ fire('stomp2'); }
        const stompPh = k>=3.4? Math.sin((k-3.4)*7) : 0;
        dx = W*0.3; dy = gy - S*1.1*big + (stompPh>0? -S*0.25*stompPh : 0);
        donkey(dx, dy, S*0.8*big, {boots:true, hot, grin:true, legs: k>=3.4? (k-3.4)*7 : null, look:1});
        if(k<1.3) label("Everything's bigger in Texas", W*0.5, H*0.12, H*0.055, '#fff');
      }
      /* ---- Act 3: FREAK MODE ---- */
      if(t>=11 && t<18.6){
        fire('freak'); const k=t-11;
        // crowd line dance
        for(const c of crowd){ const bounce=Math.abs(Math.sin(t*6+c.ph))*S*0.3; const flip = Math.floor((t+c.ph)*1.5)%2===0; donkey(c.x, gy-c.s*1.1-bounce, c.s, {boots:true, hot: c.hot? t:0, grin:true, flip, legs:t*8+c.ph}); }
        // the big one dances
        const bx=W*0.3+Math.sin(t*2.2)*W*0.06, by=gy-S*1.1*2.5 - Math.abs(Math.sin(t*6))*S*0.5;
        donkey(bx, by, S*0.8*2.5, {boots:true, hot:t, grin:true, rot:Math.sin(t*6)*0.12, legs:t*7, look:Math.sin(t*5)});
        // letters slam in
        const px=Math.min(H*0.17, W*0.085); ctx.font=`900 ${Math.round(px)}px Archivo, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
        const total = ctx.measureText(word).width; let cx = W/2 - total/2;
        for(let i=0;i<word.length;i++){ const ch=word[i]; const cw=ctx.measureText(ch).width; const at=letterAt(i); if(t>=at){ if(!letterFlags[i]){ letterFlags[i]=true; SFX.cowbell(); if(i%3===2) SFX.twang(); shake(); }
            const u=easeOut((t-at)/0.25); const sc=3-2*u; const jx=(1-u)*(Math.random()-.5)*20; ctx.save(); ctx.translate(cx+cw/2+jx, H*0.14+Math.sin(t*8+i)*8); ctx.scale(sc,sc); ctx.fillStyle='#FFE34D'; ctx.strokeStyle=C.ink; ctx.lineWidth=10/sc; ctx.strokeText(ch,0,0); ctx.fillText(ch,0,0); ctx.restore(); }
          cx+=cw; }
        if(k>=5.2) fire('freako');
        if(k>=5.2 && Math.random()<0.6) spawnConfetti(3);
      }
      /* ---- Act 4: cool-down, hat tip ---- */
      if(cool){ fire('tip'); const k=t-18.6; for(const c of crowd){ donkey(c.x, gy-c.s*1.1, c.s, {boots:true, grin:true, flip:false, hatTip:k>0.6}); }
        const bx=W*0.26, by=gy-S*1.1*2.6; donkey(bx, by, S*0.8*2.6, {boots:true, grin:true, look:0, hatTip:k>0.4});
        label("Thank y'all kindly", W*0.5, H*0.13, H*0.07, '#FFE34D'); }
    };
    return A;
  }
});
ANIMS.talafreako.special = true;
})();
