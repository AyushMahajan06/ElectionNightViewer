/* Election Night viewer — celebration animations.
   Contract: ANIMS.name = ({W,H,r,hit,banner,shake,spawnConfetti}) => ({dur, struck:false, struckAt:0, frame(t)})
   Globals available: ctx (2D context, already scaled for DPR), C.ink / C.paper (theme colours; use '#fff' for highlights drawn ON coloured shapes),
   rr(a,b) random, roundRect(x,y,w,h,r) (builds a path; call ctx.fill()/ctx.stroke()), STATES[r.st].d (SVG path, viewBox 975x610) and .c (centroid),
   SFX.* sounds and tone()/noise()/cheer() to make new ones. r.st is the state code, r.label the race name, r.winner the winning candidate.
   Call hit('BANNER!','sfxName') exactly once at the climax (it shakes the screen, shows the banner, fires confetti and sets A.struck). */
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
    A.frame = t=>{
      const ang = t<1.6? -1.2 : Math.max(0.05, 1.2-(t-1.6)*1.1) * -Math.cos((t-1.6)*2.2) ; const swing = t<1.6? -1.2 + 0 : ang; // hold back then release
      const a = t<1.6? -1.2 : -1.2*Math.cos((t-1.6)*2.0)*Math.exp(-(t-1.6)*0.25);
      const bx = px + Math.sin(-a)*L, by = py + Math.cos(a)*L;
      ctx.strokeStyle=C.ink; ctx.lineWidth=8; ctx.beginPath(); ctx.moveTo(px,py); ctx.lineTo(bx,by); ctx.stroke();
      // wall
      for(const b of bricks){ if(b.hit){ b.vy+=0.9; b.x+=b.vx; b.y+=b.vy; b.a+=b.va; } ctx.save(); ctx.translate(b.x+bw/2,b.y+bh/2); ctx.rotate(b.a); ctx.fillStyle='#F0562A'; ctx.strokeStyle=C.ink; ctx.lineWidth=3; ctx.fillRect(-bw/2+2,-bh/2+2,bw-4,bh-4); ctx.strokeRect(-bw/2+2,-bh/2+2,bw-4,bh-4); ctx.restore(); }
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
    const donkey=(x,y,s,t)=>{ ctx.save(); ctx.translate(x,y+Math.sin(t*14)*s*0.06); ctx.fillStyle='#2E6FE0'; ctx.strokeStyle=C.ink; ctx.lineWidth=4; roundRect(-s*0.9,-s*0.45,s*1.8,s*0.9,s*0.3); ctx.fill(); ctx.stroke();
      for(const [lx,d] of [[-s*0.7,1],[-s*0.3,-1],[s*0.3,1],[s*0.7,-1]]){ ctx.save(); ctx.translate(lx,s*0.4); ctx.rotate(Math.sin(t*14+lx)*0.6*d); ctx.fillRect(-s*0.09,0,s*0.18,s*0.5); ctx.strokeRect(-s*0.09,0,s*0.18,s*0.5); ctx.restore(); }
      ctx.beginPath(); ctx.moveTo(s*0.8,-s*0.4); ctx.lineTo(s*1.25,-s*0.95); ctx.lineTo(s*1.5,-s*0.8); ctx.lineTo(s*1.05,-s*0.2); ctx.closePath(); ctx.fill(); ctx.stroke(); roundRect(s*1.15,-s*1.15,s*0.75,s*0.5,s*0.15); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#FFE34D'; for(const ex of [s*1.2,s*1.45]){ ctx.beginPath(); ctx.moveTo(ex,-s*1.1); ctx.lineTo(ex+s*0.1,-s*1.55); ctx.lineTo(ex+s*0.22,-s*1.1); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      // party hat + kazoo
      ctx.fillStyle='#F0562A'; ctx.beginPath(); ctx.moveTo(s*1.35,-s*1.15); ctx.lineTo(s*1.55,-s*1.75); ctx.lineTo(s*1.75,-s*1.15); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle='#FFE34D'; ctx.fillRect(s*1.9,-s*0.95,s*0.4,s*0.1);
      ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(s*1.7,-s*0.98,s*0.11,0,7); ctx.fill(); ctx.fillStyle=C.ink; ctx.beginPath(); ctx.arc(s*1.73,-s*0.97,s*0.05,0,7); ctx.fill(); ctx.restore(); };
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
    const saucer=(ux,uy,uw,t)=>{ ctx.save(); ctx.translate(ux,uy); ctx.fillStyle='#8C8A84'; ctx.strokeStyle=C.ink; ctx.lineWidth=5; ctx.beginPath(); ctx.ellipse(0,0,uw*0.5,uw*0.12,0,0,7); ctx.fill(); ctx.stroke(); ctx.fillStyle='#BBD0F5'; ctx.beginPath(); ctx.ellipse(0,-uw*0.08,uw*0.2,uw*0.13,0,Math.PI,0); ctx.fill(); ctx.stroke(); for(let i=-3;i<=3;i++){ ctx.fillStyle=(Math.floor(t*6)+i)%2?'#FFE34D':'#F0562A'; ctx.beginPath(); ctx.arc(i*uw*0.12,uw*0.04,uw*0.022,0,7); ctx.fill(); } ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(-uw*0.06,-uw*0.1,uw*0.035,0,7); ctx.arc(uw*0.06,-uw*0.1,uw*0.035,0,7); ctx.fill(); ctx.fillStyle=C.ink; ctx.beginPath(); ctx.arc(-uw*0.05,-uw*0.1,uw*0.015,0,7); ctx.arc(uw*0.07,-uw*0.1,uw*0.015,0,7); ctx.fill(); ctx.restore(); };
    A.frame = t=>{
      once('start',()=>{ SFX.fanfare(); shake(); });
      // phase 1 (0-6): the number climbs 47 → 51 with slot-machine ticks, then slams
      if(t<7){ const n = 47 + Math.min(4, Math.floor(t/1.1)); ctx.fillStyle=C.ink; ctx.font=`900 ${Math.round(H*0.34)}px Archivo, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; const jitter = (t%1.1)<0.15? rr(-8,8):0; ctx.fillText(String(n), W*0.5+jitter, H*0.42); ctx.font=`700 ${Math.round(H*0.045)}px Archivo, sans-serif`; ctx.fillText('senate seats', W*0.5, H*0.64);
        for(let k=1;k<=4;k++) if(t>=k*1.1) once('tick'+k,()=>{ SFX.stop(); shake(); }); }
      if(t>=4.6) once('b1',()=>{ banner('51!', 2.4); SFX.bigHit(); spawnConfetti(500); burst(W*0.5,H*0.42,320,'#FFE34D'); });
      // phase 2 (7-15): the mothership fleet flyover, beaming down 51 little chairs
      if(t>=7){ once('fleet',()=>{ SFX.hum(); setTimeout(()=>SFX.hum(),2400); setTimeout(()=>SFX.hum(),4800); });
        for(const u of ufos){ u.x += W/260; saucer(u.x,u.y+Math.sin(t*2+u.w)*8,u.w,t); if(u.x>0 && u.x<W && Math.random()<0.25 && seats.length<chairsN){ seats.push({x:u.x+rr(-40,40), y:u.y, ty:H*0.86-rr(0,H*0.12), vy:0, n:seats.length+1}); } }
        for(const c of seats){ if(c.y<c.ty){ c.vy+=0.5; c.y=Math.min(c.ty,c.y+c.vy); } ctx.fillStyle='#2E6FE0'; ctx.strokeStyle=C.ink; ctx.lineWidth=3; roundRect(c.x-18,c.y-40,36,40,6); ctx.fill(); ctx.stroke(); ctx.fillRect(c.x-18,c.y-70,8,34); ctx.fillStyle='#fff'; ctx.font='900 16px Archivo, sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(String(c.n), c.x, c.y-20); } }
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
    const dust=[];
    const donkey=(x,y,s,t)=>{ ctx.save(); ctx.translate(x,y); const bob=Math.sin(t*14)*s*0.08; ctx.translate(0,bob); ctx.fillStyle='#2E6FE0'; ctx.strokeStyle=C.ink; ctx.lineWidth=4;
      roundRect(-s*0.9,-s*0.45,s*1.8,s*0.9,s*0.3); ctx.fill(); ctx.stroke();
      const legs=[[-s*0.7,1],[-s*0.3,-1],[s*0.3,1],[s*0.7,-1]]; for(const [lx,d] of legs){ ctx.save(); ctx.translate(lx,s*0.4); ctx.rotate(Math.sin(t*14+lx)*0.6*d); ctx.fillRect(-s*0.09,0,s*0.18,s*0.5); ctx.strokeRect(-s*0.09,0,s*0.18,s*0.5); ctx.restore(); }
      ctx.beginPath(); ctx.moveTo(s*0.8,-s*0.4); ctx.lineTo(s*1.25,-s*0.95); ctx.lineTo(s*1.5,-s*0.8); ctx.lineTo(s*1.05,-s*0.2); ctx.closePath(); ctx.fill(); ctx.stroke();
      roundRect(s*1.15,-s*1.15,s*0.75,s*0.5,s*0.15); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#FFE34D'; for(const ex of [s*1.2,s*1.45]){ ctx.beginPath(); ctx.moveTo(ex,-s*1.1); ctx.lineTo(ex+s*0.1,-s*1.55); ctx.lineTo(ex+s*0.22,-s*1.1); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(s*1.7,-s*0.98,s*0.11,0,7); ctx.fill(); ctx.fillStyle=C.ink; ctx.beginPath(); ctx.arc(s*1.73,-s*0.97,s*0.05,0,7); ctx.fill();
      ctx.strokeStyle=C.ink; ctx.lineWidth=6; ctx.beginPath(); ctx.moveTo(-s*0.9,-s*0.3); ctx.quadraticCurveTo(-s*1.5,-s*0.6+Math.sin(t*10)*s*0.3,-s*1.3,s*0.1); ctx.stroke(); ctx.restore(); };
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
    const drawBall=b=>{ ctx.save(); ctx.translate(b.x,b.y); ctx.rotate(b.rot); const g=ctx.createRadialGradient(-b.r*.35,-b.r*.35,b.r*.1,0,0,b.r); g.addColorStop(0,'#5f93f2'); g.addColorStop(1,'#1b3f8f'); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(0,0,b.r,0,7); ctx.fill();
      ctx.fillStyle='#0e2252'; [[-b.r*.25,-b.r*.3],[b.r*.1,-b.r*.4],[b.r*.3,-b.r*.05]].forEach(([x,y])=>{ctx.beginPath();ctx.arc(x,y,b.r*.11,0,7);ctx.fill();});
      ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(-b.r*.3,b.r*.25,b.r*.2,0,7); ctx.arc(b.r*.1,b.r*.3,b.r*.2,0,7); ctx.fill(); ctx.fillStyle=C.ink; ctx.beginPath(); ctx.arc(-b.r*.25,b.r*.28,b.r*.09,0,7); ctx.arc(b.r*.15,b.r*.33,b.r*.09,0,7); ctx.fill(); ctx.restore(); };
    const drawPin=p=>{ ctx.save(); ctx.translate(p.x+p.off,p.y+pinH*.7); ctx.rotate(p.a); ctx.translate(0,-pinH*.7); ctx.fillStyle='#fff'; ctx.strokeStyle=C.ink; ctx.lineWidth=3;
      ctx.beginPath(); ctx.moveTo(-pinW*.25,0); ctx.quadraticCurveTo(-pinW*.6,pinH*.35,-pinW*.5,pinH*.8); ctx.quadraticCurveTo(-pinW*.45,pinH,0,pinH); ctx.quadraticCurveTo(pinW*.45,pinH,pinW*.5,pinH*.8); ctx.quadraticCurveTo(pinW*.6,pinH*.35,pinW*.25,0); ctx.arc(0,0,pinW*.25,0,Math.PI,true); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle='#F0562A'; ctx.lineWidth=pinH*.045; ctx.beginPath(); ctx.moveTo(-pinW*.42,pinH*.3); ctx.lineTo(pinW*.42,pinH*.3); ctx.moveTo(-pinW*.45,pinH*.4); ctx.lineTo(pinW*.45,pinH*.4); ctx.stroke(); ctx.restore(); };
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
      if(!A.struck && t>=1.3){ A.struck=true; A.struckAt=t; broken=true; vy=-9; hit('¡PIÑATA!','whack'); for(let i=0;i<70;i++) candy.push({x:px,y:bodyY,vx:rr(-18,18),vy:rr(-26,-4),a:rr(0,6),va:rr(-.3,.3),c:['#F0562A','#FFE34D','#2E6FE0',C.paper,'#8c4bd6'][i%5],w:rr(18,30),h:rr(10,16)}); }
      for(const c of candy){ c.vy+=0.7; c.x+=c.vx; c.y+=c.vy; c.a+=c.va; if(c.y>H*0.92&&c.vy>0){ c.y=H*0.92; c.vy*=-0.4; c.vx*=0.8; } ctx.save(); ctx.translate(c.x,c.y); ctx.rotate(c.a); ctx.fillStyle=c.c; ctx.strokeStyle=C.ink; ctx.lineWidth=2; roundRect(-c.w/2,-c.h/2,c.w,c.h,c.h/2); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-c.w/2,0); ctx.lineTo(-c.w/2-8,-c.h/2); ctx.lineTo(-c.w/2-8,c.h/2); ctx.closePath(); ctx.moveTo(c.w/2,0); ctx.lineTo(c.w/2+8,-c.h/2); ctx.lineTo(c.w/2+8,c.h/2); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); } };
    return A;
  },
  /* 4 — slot machine lands D · D · D */
  slots({W,H,hit}){
    const A = {dur:8.5, struck:false, struckAt:0}; SFX.reel(); const sym=['D','★','R','✓','D','♥','D']; const reels=[0,1,2].map(i=>({off:Math.random()*7, speed:0.55+i*0.05, stopAt:1.1+i*0.65, stopped:false})); const coins=[];
    const cw=Math.min(W*0.14,260), ch=cw*1.25, gap=cw*0.12, x0=W/2-(3*cw+2*gap)/2, y0=H*0.36-ch/2;
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
      for(const c of coins){ c.vy+=0.35; c.y+=c.vy; c.x+=c.vx; c.a+=0.2; ctx.save(); ctx.translate(c.x,c.y); ctx.scale(Math.abs(Math.cos(c.a)),1); ctx.fillStyle='#FFE34D'; ctx.strokeStyle=C.ink; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(0,0,22,0,7); ctx.fill(); ctx.stroke(); ctx.fillStyle=C.ink; ctx.font='900 24px Archivo, sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('D',0,1); ctx.restore(); }
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
    const mole=(x,y,up,squash,sign,t,alive)=>{ ctx.save(); ctx.beginPath(); ctx.rect(x-hw*1.6,y-ms*3.2,hw*3.2,ms*3.2+hh*0.3); ctx.clip(); ctx.translate(x,y+hh*0.3); const rise=-ms*1.7*up; ctx.translate(0,0); if(squash){ ctx.translate(0,rise+ms*1.7); ctx.scale(1.3,0.55); ctx.translate(0,-(rise+ms*1.7)); }
      ctx.fillStyle='#8a5a32'; ctx.strokeStyle=C.ink; ctx.lineWidth=4; roundRect(-ms*0.5,rise,ms,ms*2.2,ms*0.5); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#c98a4b'; ctx.beginPath(); ctx.ellipse(0,rise+ms*0.95,ms*0.3,ms*0.35,0,0,7); ctx.fill();
      // googly eyes
      ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(-ms*0.2,rise+ms*0.4,ms*0.16,0,7); ctx.arc(ms*0.2,rise+ms*0.4,ms*0.16,0,7); ctx.fill(); ctx.strokeStyle=C.ink; ctx.lineWidth=2; ctx.stroke();
      if(alive){ ctx.fillStyle='#151412'; const dx=Math.sin(t*7+x)*ms*0.05, dy=Math.cos(t*5+y)*ms*0.05; ctx.beginPath(); ctx.arc(-ms*0.2+dx,rise+ms*0.42+dy,ms*0.07,0,7); ctx.arc(ms*0.2-dx,rise+ms*0.42+dy,ms*0.07,0,7); ctx.fill(); }
      else { ctx.strokeStyle='#151412'; ctx.lineWidth=3; for(const ex of [-ms*0.2,ms*0.2]){ ctx.beginPath(); ctx.moveTo(ex-ms*0.08,rise+ms*0.32); ctx.lineTo(ex+ms*0.08,rise+ms*0.48); ctx.moveTo(ex+ms*0.08,rise+ms*0.32); ctx.lineTo(ex-ms*0.08,rise+ms*0.48); ctx.stroke(); } }
      // nose + teeth
      ctx.fillStyle='#F0562A'; ctx.beginPath(); ctx.ellipse(0,rise+ms*0.68,ms*0.11,ms*0.08,0,0,7); ctx.fill(); ctx.fillStyle='#fff'; ctx.fillRect(-ms*0.1,rise+ms*0.8,ms*0.09,ms*0.14); ctx.fillRect(ms*0.01,rise+ms*0.8,ms*0.09,ms*0.14);
      if(sign){ ctx.save(); ctx.translate(ms*0.5,rise+ms*0.7); ctx.rotate(Math.sin(t*6)*0.12); ctx.strokeStyle=C.ink; ctx.lineWidth=6; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0,-ms*1.1); ctx.stroke(); ctx.fillStyle='#FFE34D'; ctx.lineWidth=4; roundRect(-ms*0.55,-ms*2.0,ms*1.1,ms*0.95,ms*0.1); ctx.fill(); ctx.stroke(); ctx.fillStyle='#2E6FE0'; ctx.font=`900 ${Math.round(ms*0.7)}px Archivo, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('D',0,-ms*1.5); ctx.restore(); }
      ctx.restore(); };
    A.frame = t=>{
      // dirt mounds + holes
      for(const h of holes){ ctx.fillStyle='#8a5a32'; ctx.strokeStyle=C.ink; ctx.lineWidth=4; ctx.beginPath(); ctx.ellipse(h.x,h.y+hh*0.5,hw*1.3,hh*1.9,0,0,7); ctx.fill(); ctx.stroke(); ctx.fillStyle='#2a2420'; ctx.beginPath(); ctx.ellipse(h.x,h.y,hw,hh,0,0,7); ctx.fill(); ctx.stroke(); }
      const lip=h=>{ ctx.save(); ctx.beginPath(); ctx.rect(h.x-hw*1.5,h.y,hw*3,hh*3); ctx.clip(); ctx.fillStyle='#8a5a32'; ctx.strokeStyle=C.ink; ctx.lineWidth=4; ctx.beginPath(); ctx.ellipse(h.x,h.y+hh*0.5,hw*1.3,hh*1.9,0,0,7); ctx.fill(); ctx.stroke(); ctx.fillStyle='#2a2420'; ctx.beginPath(); ctx.ellipse(h.x,h.y,hw,hh,0,0,7); ctx.fill(); ctx.stroke(); ctx.restore(); };
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
    const drawBall=b=>{ ctx.save(); ctx.translate(b.x,b.y); ctx.rotate(b.rot); const g=ctx.createRadialGradient(-b.r*.35,-b.r*.35,b.r*.1,0,0,b.r); g.addColorStop(0,'#5f93f2'); g.addColorStop(1,'#1b3f8f'); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(0,0,b.r,0,7); ctx.fill(); ctx.strokeStyle=C.ink; ctx.lineWidth=4; ctx.stroke();
      ctx.fillStyle='#0e2252'; [[-b.r*.25,-b.r*.3],[b.r*.1,-b.r*.4],[b.r*.3,-b.r*.05]].forEach(([x,y])=>{ctx.beginPath();ctx.arc(x,y,b.r*.11,0,7);ctx.fill();});
      ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(-b.r*.3,b.r*.25,b.r*.2,0,7); ctx.arc(b.r*.1,b.r*.3,b.r*.2,0,7); ctx.fill();
      if(b.dazed){ ctx.strokeStyle='#151412'; ctx.lineWidth=b.r*0.05; for(const [ex,ey] of [[-b.r*.3,b.r*.25],[b.r*.1,b.r*.3]]){ ctx.beginPath(); ctx.moveTo(ex-b.r*.1,ey-b.r*.1); ctx.lineTo(ex+b.r*.1,ey+b.r*.1); ctx.moveTo(ex+b.r*.1,ey-b.r*.1); ctx.lineTo(ex-b.r*.1,ey+b.r*.1); ctx.stroke(); } }
      else { ctx.fillStyle='#151412'; const look=A.struck?0:Math.min(1,Math.max(0,(pins[0].x-b.x-R)/(W*0.4))); ctx.beginPath(); ctx.arc(-b.r*.3+b.r*.09*(1-look)+b.r*0.02,b.r*.28,b.r*.09,0,7); ctx.arc(b.r*.1+b.r*.09*(1-look)+b.r*0.02,b.r*.33,b.r*.09,0,7); ctx.fill(); }
      ctx.restore(); };
    const drawPin=(x,y,a,angry)=>{ ctx.save(); ctx.translate(x,y+pinH); ctx.rotate(a); ctx.translate(0,-pinH); ctx.fillStyle='#fff'; ctx.strokeStyle=C.ink; ctx.lineWidth=3;
      ctx.beginPath(); ctx.moveTo(-pinW*.25,0); ctx.quadraticCurveTo(-pinW*.6,pinH*.35,-pinW*.5,pinH*.8); ctx.quadraticCurveTo(-pinW*.45,pinH,0,pinH); ctx.quadraticCurveTo(pinW*.45,pinH,pinW*.5,pinH*.8); ctx.quadraticCurveTo(pinW*.6,pinH*.35,pinW*.25,0); ctx.arc(0,0,pinW*.25,0,Math.PI,true); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle='#F0562A'; ctx.lineWidth=pinH*.045; ctx.beginPath(); ctx.moveTo(-pinW*.42,pinH*.3); ctx.lineTo(pinW*.42,pinH*.3); ctx.moveTo(-pinW*.45,pinH*.4); ctx.lineTo(pinW*.45,pinH*.4); ctx.stroke();
      // face: angry eyes + eyebrows (or a grin after the hit)
      ctx.fillStyle='#151412'; ctx.beginPath(); ctx.arc(-pinW*.1,pinH*.08,pinW*.07,0,7); ctx.arc(pinW*.1,pinH*.08,pinW*.07,0,7); ctx.fill(); ctx.strokeStyle='#151412'; ctx.lineWidth=pinW*0.08; ctx.lineCap='round'; ctx.beginPath();
      if(angry){ ctx.moveTo(-pinW*.2,pinH*.0); ctx.lineTo(-pinW*.03,pinH*.04); ctx.moveTo(pinW*.2,pinH*.0); ctx.lineTo(pinW*.03,pinH*.04); ctx.moveTo(-pinW*.12,pinH*.17); ctx.lineTo(pinW*.12,pinH*.17); }
      else { ctx.moveTo(-pinW*.14,pinH*.14); ctx.quadraticCurveTo(0,pinH*.24,pinW*.14,pinH*.14); }
      ctx.stroke(); ctx.restore(); };
    const star=(x,y,r,a)=>{ ctx.save(); ctx.translate(x,y); ctx.rotate(a); ctx.fillStyle='#FFE34D'; ctx.strokeStyle=C.ink; ctx.lineWidth=2; ctx.beginPath(); for(let i=0;i<10;i++){ const rad=i%2?r*0.45:r; const an=i*Math.PI/5-Math.PI/2; ctx.lineTo(Math.cos(an)*rad,Math.sin(an)*rad); } ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); };
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
    const duck=(x,y,s,tilt,t,big)=>{ ctx.save(); ctx.translate(x,y); ctx.rotate(tilt); ctx.strokeStyle=C.ink; ctx.lineWidth=big?5:3;
      // tail
      ctx.fillStyle='#2E6FE0'; ctx.beginPath(); ctx.moveTo(-s*0.7,-s*0.1); ctx.lineTo(-s*1.25,-s*0.75); ctx.lineTo(-s*0.55,-s*0.5); ctx.closePath(); ctx.fill(); ctx.stroke();
      // body + wing
      ctx.beginPath(); ctx.ellipse(0,0,s,s*0.62,0,0,7); ctx.fill(); ctx.stroke(); ctx.fillStyle='#7FAAF6'; ctx.beginPath(); ctx.ellipse(-s*0.15,s*0.05,s*0.5,s*0.3,0.2,0,7); ctx.fill(); ctx.stroke();
      // head, beak, eye
      ctx.fillStyle='#2E6FE0'; ctx.beginPath(); ctx.arc(s*0.5,-s*0.6,s*0.45,0,7); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#FFE34D'; roundRect(s*0.82,-s*0.72,s*0.5,s*0.24,s*0.1); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(s*0.6,-s*0.72,s*0.14,0,7); ctx.fill(); ctx.fillStyle='#151412'; ctx.beginPath(); ctx.arc(s*0.64,-s*0.72,s*0.06,0,7); ctx.fill();
      if(big){ // tiny crown
        ctx.fillStyle='#FFE34D'; ctx.beginPath(); ctx.moveTo(s*0.22,-s*0.95); ctx.lineTo(s*0.22,-s*1.35); ctx.lineTo(s*0.36,-s*1.15); ctx.lineTo(s*0.5,-s*1.45); ctx.lineTo(s*0.64,-s*1.15); ctx.lineTo(s*0.78,-s*1.35); ctx.lineTo(s*0.78,-s*0.95); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle='#F0562A'; for(const gx of [s*0.33,s*0.5,s*0.67]){ ctx.beginPath(); ctx.arc(gx,-s*1.05,s*0.045,0,7); ctx.fill(); } }
      ctx.restore(); };
    A.frame = t=>{
      const off = -W*1.15*(1-ease(Math.min(1,t/2.4))) + t*8; const amp = A.struck? 1.6 : 1;
      for(let L=0;L<3;L++){ const ly=layers[L];
        ctx.beginPath(); ctx.moveTo(-60,H+60); for(let x=-60;x<=W+60;x+=14) ctx.lineTo(x, ly.y+(waveY(L,x,t)-ly.y)*amp); ctx.lineTo(W+60,H+60); ctx.closePath(); ctx.fillStyle=ly.col; ctx.fill(); ctx.strokeStyle=C.ink; ctx.lineWidth=3; ctx.stroke();
        for(const d of flock){ if(d.L!==L) continue; const x=d.x+off*(d.big?1:1+((d.ph%1)-0.5)*0.1); if(x<-d.s*2||x>W+d.s*2) continue; const wy=ly.y+(waveY(L,x,t)-ly.y)*amp; let y=wy-d.s*0.15+Math.sin(t*3+d.ph)*d.s*0.08*amp; const tilt=Math.cos(x/90+t*2.2+ly.ph)*0.2*amp+Math.sin(t*3+d.ph)*0.05;
          if(d.big && A.struck){ const f=t-A.struckAt; if(f<0.6) y-=Math.sin(f/0.6*Math.PI)*d.s*0.6; }
          duck(x,y,d.s,tilt,t,d.big); } }
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
    A.frame = t=>{
      const u=Math.min(1,t/T); const theta = thetaFinal*(1-Math.pow(1-u,3)); const wi=wedgeAt(theta);
      if(wi!==lastWedge){ if(lastWedge>=0){ lastClackT=t; SFX.clack(); } lastWedge=wi; }
      // stand
      ctx.fillStyle=C.ink; ctx.beginPath(); ctx.moveTo(cx-R*0.35,H); ctx.lineTo(cx+R*0.35,H); ctx.lineTo(cx+R*0.1,cy); ctx.lineTo(cx-R*0.1,cy); ctx.closePath(); ctx.fill();
      // wheel
      ctx.save(); ctx.translate(cx,cy); ctx.rotate(theta);
      for(let i=0;i<N;i++){ ctx.fillStyle = wedgeCol(i); ctx.beginPath(); ctx.moveTo(0,0); ctx.arc(0,0,R,i*w,(i+1)*w); ctx.closePath(); ctx.fill(); ctx.strokeStyle=C.ink; ctx.lineWidth=3; ctx.stroke(); }
      for(let i=0;i<N;i++){ ctx.save(); ctx.rotate(i*w+w/2); const isWin=labels[i]===r.st; ctx.fillStyle = textCol(i); ctx.font=`900 ${Math.round(R*(isWin?0.17:0.13))}px Archivo, sans-serif`; ctx.textAlign='right'; ctx.textBaseline='middle'; ctx.fillText(labels[i], R*0.92, 0); ctx.restore(); }
      ctx.strokeStyle=C.ink; ctx.lineWidth=8; ctx.beginPath(); ctx.arc(0,0,R,0,7); ctx.stroke();
      // rim lights
      for(let i=0;i<N*2;i++){ const a=i*Math.PI/N; const on = A.struck? (Math.floor(t*12)+i)%2===0 : (Math.floor(t*6)+i)%3===0; ctx.fillStyle= on? '#FFE34D' : '#fff'; ctx.beginPath(); ctx.arc(Math.cos(a)*R*0.97, Math.sin(a)*R*0.97, R*0.025,0,7); ctx.fill(); }
      ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(0,0,R*0.14,0,7); ctx.fill(); ctx.lineWidth=5; ctx.stroke(); ctx.fillStyle=C.ink; ctx.beginPath(); ctx.arc(0,0,R*0.05,0,7); ctx.fill(); ctx.restore();
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
    const donkey=(x,y,s,t,nod)=>{ ctx.save(); ctx.translate(x,y); const bob=Math.sin(t*14)*s*0.08; ctx.translate(0,bob); ctx.fillStyle='#2E6FE0'; ctx.strokeStyle=C.ink; ctx.lineWidth=4;
      roundRect(-s*0.9,-s*0.45,s*1.8,s*0.9,s*0.3); ctx.fill(); ctx.stroke();
      const legs=[[-s*0.7,1],[-s*0.3,-1],[s*0.3,1],[s*0.7,-1]]; for(const [lx,d] of legs){ ctx.save(); ctx.translate(lx,s*0.4); ctx.rotate(Math.sin(t*14+lx)*0.6*d); ctx.fillRect(-s*0.09,0,s*0.18,s*0.5); ctx.strokeRect(-s*0.09,0,s*0.18,s*0.5); ctx.restore(); }
      ctx.save(); ctx.translate(s*0.8,-s*0.4); ctx.rotate(nod); ctx.translate(-s*0.8,s*0.4);
      ctx.beginPath(); ctx.moveTo(s*0.8,-s*0.4); ctx.lineTo(s*1.25,-s*0.95); ctx.lineTo(s*1.5,-s*0.8); ctx.lineTo(s*1.05,-s*0.2); ctx.closePath(); ctx.fill(); ctx.stroke();
      roundRect(s*1.15,-s*1.15,s*0.75,s*0.5,s*0.15); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#FFE34D'; for(const ex of [s*1.2,s*1.45]){ ctx.beginPath(); ctx.moveTo(ex,-s*1.1); ctx.lineTo(ex+s*0.1,-s*1.55); ctx.lineTo(ex+s*0.22,-s*1.1); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      // headphones: band over the head, cups on either side
      ctx.strokeStyle=C.ink; ctx.lineWidth=s*0.07; ctx.beginPath(); ctx.arc(s*1.52,-s*0.98,s*0.5,Math.PI*1.02,Math.PI*1.98); ctx.stroke(); ctx.fillStyle='#F0562A'; ctx.lineWidth=4; roundRect(s*0.95,-s*1.15,s*0.2,s*0.36,s*0.07); ctx.fill(); ctx.stroke(); roundRect(s*1.88,-s*1.15,s*0.2,s*0.36,s*0.07); ctx.fill(); ctx.stroke();
      // sunglasses
      ctx.fillStyle=C.ink; roundRect(s*1.5,-s*1.08,s*0.34,s*0.18,s*0.05); ctx.fill(); ctx.fillStyle='#7FAAF6'; ctx.fillRect(s*1.54,-s*1.05,s*0.26,s*0.08);
      ctx.restore();
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
    const cow=(x,y,s,rot,squash)=>{ ctx.save(); ctx.translate(x,y); ctx.rotate(rot); ctx.scale(1+(squash||0)*0.3, 1-(squash||0)*0.35); ctx.strokeStyle=C.ink; ctx.lineWidth=4; ctx.fillStyle='#2E6FE0';
      for(const lx of [-s*0.6,-s*0.25,s*0.2,s*0.55]){ ctx.fillStyle='#2E6FE0'; roundRect(lx-s*0.1,s*0.3,s*0.2,s*0.5,s*0.06); ctx.fill(); ctx.stroke(); ctx.fillStyle=C.ink; ctx.fillRect(lx-s*0.1,s*0.68,s*0.2,s*0.12); }
      ctx.lineWidth=5; ctx.beginPath(); ctx.moveTo(-s*0.9,-s*0.2); ctx.quadraticCurveTo(-s*1.3,-s*0.1,-s*1.2,s*0.35); ctx.stroke(); ctx.fillStyle=C.ink; ctx.beginPath(); ctx.arc(-s*1.2,s*0.35,s*0.09,0,7); ctx.fill();
      ctx.fillStyle='#2E6FE0'; ctx.lineWidth=4; ctx.beginPath(); ctx.ellipse(0,0,s*0.95,s*0.5,0,0,7); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#153E8F'; for(const [sx,sy,sr] of [[-0.45,-0.1,0.2],[0.1,0.15,0.17],[0.45,-0.2,0.14],[-0.1,-0.3,0.11]]){ ctx.beginPath(); ctx.ellipse(sx*s,sy*s,sr*s,sr*s*0.75,0.4,0,7); ctx.fill(); }
      ctx.fillStyle='#F5B8C8'; ctx.beginPath(); ctx.ellipse(-s*0.1,s*0.42,s*0.22,s*0.14,0,0,7); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#2E6FE0'; ctx.beginPath(); ctx.ellipse(s*0.62,-s*0.72,s*0.18,s*0.08,-0.5,0,7); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#FFE34D'; for(const hx of [s*0.72,s*1.08]){ ctx.beginPath(); ctx.moveTo(hx,-s*0.74); ctx.quadraticCurveTo(hx+s*0.02,-s*1.05,hx+s*0.2,-s*1.02); ctx.lineTo(hx+s*0.22,-s*0.74); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      ctx.fillStyle='#2E6FE0'; roundRect(s*0.65,-s*0.78,s*0.62,s*0.68,s*0.18); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#F5B8C8'; roundRect(s*0.78,-s*0.42,s*0.52,s*0.32,s*0.12); ctx.fill(); ctx.stroke(); ctx.fillStyle=C.ink; ctx.beginPath(); ctx.arc(s*0.93,-s*0.26,s*0.04,0,7); ctx.arc(s*1.13,-s*0.26,s*0.04,0,7); ctx.fill();
      ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(s*0.86,-s*0.58,s*0.13,0,7); ctx.fill(); ctx.beginPath(); ctx.arc(s*1.12,-s*0.58,s*0.13,0,7); ctx.fill(); ctx.lineWidth=2; ctx.beginPath(); ctx.arc(s*0.86,-s*0.58,s*0.13,0,7); ctx.stroke(); ctx.beginPath(); ctx.arc(s*1.12,-s*0.58,s*0.13,0,7); ctx.stroke();
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
    const donkey=(x,y,s,ph,blur,rot)=>{ ctx.save(); ctx.translate(x,y); ctx.rotate(rot||0); const bob=Math.sin(ph)*s*0.08; ctx.translate(0,bob); ctx.fillStyle='#2E6FE0'; ctx.strokeStyle=C.ink; ctx.lineWidth=4;
      roundRect(-s*0.9,-s*0.45,s*1.8,s*0.9,s*0.3); ctx.fill(); ctx.stroke();
      const legs=[[-s*0.7,1],[-s*0.3,-1],[s*0.3,1],[s*0.7,-1]]; const passes=blur?[-0.9,0,0.9]:[0]; for(const dp of passes){ ctx.globalAlpha=blur?0.45:1; for(const [lx,d] of legs){ ctx.save(); ctx.translate(lx,s*0.4); ctx.rotate(Math.sin(ph+dp+lx)*0.6*d); ctx.fillRect(-s*0.09,0,s*0.18,s*0.5); ctx.strokeRect(-s*0.09,0,s*0.18,s*0.5); ctx.restore(); } } ctx.globalAlpha=1;
      ctx.beginPath(); ctx.moveTo(s*0.8,-s*0.4); ctx.lineTo(s*1.25,-s*0.95); ctx.lineTo(s*1.5,-s*0.8); ctx.lineTo(s*1.05,-s*0.2); ctx.closePath(); ctx.fill(); ctx.stroke();
      roundRect(s*1.15,-s*1.15,s*0.75,s*0.5,s*0.15); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#FFE34D'; for(const ex of [s*1.2,s*1.45]){ ctx.beginPath(); ctx.moveTo(ex,-s*1.1); ctx.lineTo(ex+s*0.1,-s*1.55); ctx.lineTo(ex+s*0.22,-s*1.1); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      // sweatband
      ctx.fillStyle='#F0562A'; ctx.fillRect(s*1.15,-s*1.12,s*0.75,s*0.1); ctx.strokeRect(s*1.15,-s*1.12,s*0.75,s*0.1);
      ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(s*1.7,-s*0.95,s*0.11,0,7); ctx.fill(); ctx.fillStyle='#151412'; ctx.beginPath(); ctx.arc(s*1.73,-s*0.94,s*0.05,0,7); ctx.fill();
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
    const gnome=(x,y,s,t,walk)=>{ ctx.save(); ctx.translate(x,y); const bob=walk? Math.abs(Math.sin(t*12))*s*0.1 : 0; ctx.translate(0,-bob); ctx.strokeStyle=C.ink; ctx.lineWidth=3;
      const sw=walk? Math.sin(t*12)*s*0.14 : 0; ctx.fillStyle=C.ink; roundRect(-s*0.32+sw,-s*0.12,s*0.3,s*0.12,s*0.04); ctx.fill(); roundRect(s*0.02-sw,-s*0.12,s*0.3,s*0.12,s*0.04); ctx.fill();
      ctx.fillStyle='#2E6FE0'; roundRect(-s*0.32,-s*0.74,s*0.64,s*0.64,s*0.14); ctx.fill(); ctx.stroke();
      ctx.fillStyle=C.ink; ctx.fillRect(-s*0.32,-s*0.4,s*0.64,s*0.07); ctx.fillStyle='#FFE34D'; ctx.fillRect(-s*0.07,-s*0.43,s*0.14,s*0.12);
      ctx.fillStyle='#F6C9A8'; ctx.beginPath(); ctx.arc(0,-s*0.86,s*0.22,0,7); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#fff'; ctx.beginPath(); ctx.moveTo(-s*0.26,-s*0.82); ctx.quadraticCurveTo(-s*0.34,-s*0.4,0,-s*0.28); ctx.quadraticCurveTo(s*0.34,-s*0.4,s*0.26,-s*0.82); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#F0562A'; ctx.beginPath(); ctx.arc(0,-s*0.82,s*0.07,0,7); ctx.fill();
      ctx.fillStyle=C.ink; ctx.beginPath(); ctx.arc(-s*0.09,-s*0.92,s*0.03,0,7); ctx.arc(s*0.09,-s*0.92,s*0.03,0,7); ctx.fill();
      ctx.fillStyle='#F0562A'; ctx.beginPath(); ctx.moveTo(-s*0.3,-s*0.98); ctx.quadraticCurveTo(-s*0.05,-s*1.15,s*0.1,-s*1.7); ctx.quadraticCurveTo(s*0.08,-s*1.15,s*0.3,-s*0.98); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore(); };
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
    const rider=(x,y,s,t)=>{ ctx.save(); ctx.translate(x,y); ctx.fillStyle='#2E6FE0'; ctx.strokeStyle=C.ink; ctx.lineWidth=3; ctx.lineCap='round';
      // arms up!
      for(const d of [-1,1]){ ctx.beginPath(); ctx.moveTo(d*s*0.3,-s*0.4); ctx.lineTo(d*s*0.7,-s*1.3+Math.sin(t*20+d)*s*0.08); ctx.lineWidth=s*0.16; ctx.strokeStyle='#2E6FE0'; ctx.stroke(); ctx.lineWidth=3; ctx.strokeStyle=C.ink; ctx.beginPath(); ctx.arc(d*s*0.7,-s*1.3+Math.sin(t*20+d)*s*0.08,s*0.12,0,7); ctx.fillStyle=C.ink; ctx.fill(); }
      ctx.fillStyle='#2E6FE0'; roundRect(-s*0.4,-s*0.6,s*0.8,s*0.7,s*0.2); ctx.fill(); ctx.stroke();
      // head (donkey, facing right)
      ctx.beginPath(); ctx.moveTo(-s*0.05,-s*0.5); ctx.lineTo(s*0.2,-s*1.0); ctx.lineTo(s*0.45,-s*0.9); ctx.lineTo(s*0.25,-s*0.35); ctx.closePath(); ctx.fill(); ctx.stroke();
      roundRect(s*0.1,-s*1.2,s*0.75,s*0.5,s*0.15); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#FFE34D'; for(const ex of [s*0.15,s*0.4]){ ctx.beginPath(); ctx.moveTo(ex,-s*1.15); ctx.lineTo(ex+s*0.1,-s*1.6); ctx.lineTo(ex+s*0.22,-s*1.15); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(s*0.65,-s*1.02,s*0.11,0,7); ctx.fill(); ctx.fillStyle=C.ink; ctx.beginPath(); ctx.arc(s*0.68,-s*1.0,s*0.05,0,7); ctx.fill();
      // open mouth (screaming)
      ctx.fillStyle=C.ink; ctx.beginPath(); ctx.ellipse(s*0.72,-s*0.8,s*0.07,s*0.05+Math.abs(Math.sin(t*25))*s*0.03,0,0,7); ctx.fill();
      ctx.restore(); };
    const car=(p,t)=>{ ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.a); const s=R*0.2;
      for(const hx of [-s*1.45,0,s*1.45]) rider(hx,-s*0.9,s*1.35,t+hx);
      ctx.fillStyle='#F0562A'; ctx.strokeStyle=C.ink; ctx.lineWidth=4; roundRect(-s*2.3,-s*1.15,s*4.6,s*1.05,s*0.3); ctx.fill(); ctx.stroke(); ctx.fillStyle='#FFE34D'; ctx.fillRect(-s*2.1,-s*0.75,s*4.2,s*0.22);
      ctx.fillStyle=C.ink; for(const wx of [-s*1.5,0,s*1.5]){ ctx.beginPath(); ctx.arc(wx,-s*0.1,s*0.28,0,7); ctx.fill(); }
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
