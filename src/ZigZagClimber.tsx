import React, { useEffect, useRef, useState } from 'react';

type Dir = -1 | 1;
type Step = { x: number; y: number; dir: Dir };

const palette = {
  bg: '#0f1220',
  grid: '#1b2038',
  stair: '#9aa8ff',
  stairAlt: '#7d8bff',
  shadow: '#2b2f4a',
  text: '#e9ecff',
  accent: '#a7f3d0',
  danger: '#ff6b6b',
} as const;

const clamp = (n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));

function addRoundRectIfMissing(ctx:CanvasRenderingContext2D){
  // @ts-ignore
  if(typeof (ctx as any).roundRect !== 'function'){
    // @ts-ignore
    ctx.roundRect = function(x:number,y:number,w:number,h:number,r:number){
      const radius = clamp(r,0,Math.min(Math.abs(w),Math.abs(h))/2);
      this.beginPath();
      this.moveTo(x+radius, y);
      this.arcTo(x+w, y, x+w, y+h, radius);
      this.arcTo(x+w, y+h, x, y+h, radius);
      this.arcTo(x, y+h, x, y, radius);
      this.arcTo(x, y, x+w, y, radius);
      this.closePath();
    };
  }
}

function drawRobot(ctx:CanvasRenderingContext2D, cx:number, cy:number, tile:number, facing:Dir){
  addRoundRectIfMissing(ctx);
  const s = tile;
  const bob = Math.sin(Date.now()/300) * (s*0.03);
  ctx.save();
  ctx.translate(cx, cy + bob);
  if(facing === -1) ctx.scale(-1,1);

  // simple robot body (lightweight)
  ctx.fillStyle = '#6eb3d9';
  ctx.fillRect(-s*0.3, -s*0.2, s*0.6, s*0.6);
  ctx.fillStyle = '#2a3e6b';
  ctx.fillRect(-s*0.4, -s*0.8, s*0.8, s*0.6);
  ctx.fillStyle = '#d63a2f';
  ctx.fillRect(-s*0.24, -s*1.1, s*0.48, s*0.28);
  ctx.fillStyle = '#ffd166';
  ctx.fillRect(-s*0.12, -s*1.02, s*0.22, s*0.10);
  ctx.fillRect( s*0.02, -s*1.02, s*0.22, s*0.10);
  ctx.restore();
}

function generateSteps(count:number, startX:number, startY:number, tile:number): Step[]{
  const steps: Step[] = [];
  let x = startX, y = startY; let dir:Dir = Math.random()<0.5 ? -1 : 1;
  for(let i=0;i<count;i++){
    if(i>0 && Math.random()<0.4) dir = (dir * -1) as Dir;
    x += dir * tile;
    y -= tile;
    steps.push({ x, y, dir });
  }
  return steps;
}

export default function ZigZagClimber(){
  const canvasRef = useRef<HTMLCanvasElement|null>(null);
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState<number>(() => Number(localStorage.getItem('zzc-high') || 0));

  const S = useRef({
    w: 360, h: 640, tile: 36,
    baseX: 0, baseY: 0,
    camY: 0,
    steps: [] as Step[],
    player: { x: 0, y: 0 },
    facing: 1 as Dir,
    nextIndex: 0,
    speed: 70,
    timeLeft: 2.2,
    timeMax: 2.2,
  });

  // Resize
  useEffect(()=>{
    const onResize = () => {
      const c = canvasRef.current; if(!c) return;
      const parent = c.parentElement!;
      const pr = window.devicePixelRatio || 1;
      const vv = (window as any).visualViewport;
      const vvh = vv?.height ?? window.innerHeight;
      const UI_BOTTOM = 96;
      const width = Math.min(parent.clientWidth, 520);
      const height = Math.max(480, Math.min(vvh, 900) - UI_BOTTOM);
      c.width = Math.floor(width * pr);
      c.height = Math.floor(height * pr);
      c.style.width = `${width}px`;
      c.style.height = `${height}px`;

      const s = S.current;
      s.w = width; s.h = height;
      s.tile = Math.max(28, Math.floor(Math.min(s.w, s.h)/14));
      s.baseX = Math.floor(s.w/2);
      s.baseY = s.h - s.tile*2;
      if(!running || gameOver) s.camY = s.baseY - s.tile*4;
      draw();
    };
    onResize();
    window.addEventListener('resize', onResize, { passive: true } as any);
    (window as any).visualViewport?.addEventListener?.('resize', onResize);
    return ()=>{
      window.removeEventListener('resize', onResize as any);
      (window as any).visualViewport?.removeEventListener?.('resize', onResize);
    };
  }, [running, gameOver]);

  const reset = (hard = true) => {
    const s = S.current;
    s.player = { x: s.baseX, y: s.baseY };
    s.steps = generateSteps(200, s.player.x, s.player.y, s.tile);
    s.facing = s.steps[0]?.dir ?? 1;
    s.nextIndex = 0;
    s.speed = 70;
    s.timeMax = 2.2; s.timeLeft = s.timeMax;
    s.camY = s.baseY - s.tile*4;
    if(hard) setScore(0);
    setGameOver(false); setRunning(false);
    draw();
  };
  useEffect(()=>{ reset(true); }, []);

  function advanceIfMatch(){
    const s = S.current; const step = s.steps[s.nextIndex];
    if(!step) return false;
    if(step.dir === s.facing){
      s.player = { x: step.x, y: step.y };
      s.nextIndex++; setScore(v=>v+1);
      if(s.nextIndex % 5 === 0){ s.speed = Math.min(220, s.speed + 6); s.timeMax = Math.max(0.9, s.timeMax - 0.05); }
      s.timeLeft = s.timeMax;
      if(s.nextIndex + 100 > s.steps.length){
        const last = s.steps[s.steps.length-1];
        s.steps.push(...generateSteps(200, last.x, last.y, s.tile));
      }
      return true;
    }
    return false;
  }

  function endGame(_reason:string){
    setGameOver(true); setRunning(false);
    setBest(h=>{ const nh = Math.max(h, score); localStorage.setItem('zzc-high', String(nh)); return nh; });
  }

  const forward = () => { if(gameOver) return; if(!running) setRunning(true); if(!advanceIfMatch()) endGame('잘못된 전진!'); };
  const rotate  = () => { if(gameOver) return; if(!running) setRunning(true); S.current.facing = (S.current.facing * -1) as Dir; if(!advanceIfMatch()) endGame('잘못된 회전!'); };

  // Loop
  useEffect(()=>{
    let raf = 0, last = 0;
    const tick = (t:number) => {
      const s = S.current;
      const dt = last ? (t - last)/1000 : 0; last = t;
      if(running && !gameOver){
        s.timeLeft -= dt; if(s.timeLeft <= 0){ endGame('시간 초과!'); }
        const targetCam = Math.max(0, s.baseY - s.player.y + s.tile*6);
        s.camY += (targetCam - s.camY) * Math.min(1, 10*dt);
      }
      draw();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return ()=> cancelAnimationFrame(raf);
  }, [running, gameOver]);

  function draw(){
    const c = canvasRef.current; if(!c) return;
    const ctx = c.getContext('2d'); if(!ctx) return;
    const s = S.current;
    const pr = window.devicePixelRatio || 1;
    ctx.save(); ctx.scale(pr, pr);

    ctx.clearRect(0, 0, s.w, s.h);
    ctx.fillStyle = palette.bg; ctx.fillRect(0, 0, s.w, s.h);

    // grid
    ctx.strokeStyle = palette.grid; ctx.lineWidth = 1;
    const gap = s.tile;
    for(let x=0; x<=s.w; x+=gap){ ctx.beginPath(); ctx.moveTo(x+0.5, 0); ctx.lineTo(x+0.5, s.h); ctx.stroke(); }
    for(let y=((-(s.camY % gap) + gap) % gap); y<=s.h; y+=gap){ ctx.beginPath(); ctx.moveTo(0, y+0.5); ctx.lineTo(s.w, y+0.5); ctx.stroke(); }

    // stairs
    for(let i=Math.max(0, s.nextIndex-8); i<s.steps.length; i++){
      const step = s.steps[i];
      const size = s.tile*0.9;
      const sx = step.x - size/2;
      const sy = step.y - size/2 - (s.camY - (s.baseY - s.tile*6));
      if(sy > s.h + s.tile || sy < -s.tile*2) continue;
      ctx.fillStyle = i % 2 ? palette.stair : palette.stairAlt;
      ctx.fillRect(sx, sy, size, size);
      ctx.fillStyle = palette.shadow; ctx.fillRect(sx, sy + size - 4, size, 4);
      if(i === s.nextIndex){
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = step.dir === -1 ? palette.danger : palette.accent;
        ctx.fillRect(sx, sy, size, size);
        ctx.globalAlpha = 1;
      }
    }

    // player
    const px = s.player.x;
    const py = s.player.y - (s.camY - (s.baseY - s.tile*6));
    drawRobot(ctx, px, py, s.tile*0.9, s.facing);
    ctx.fillStyle = palette.text; ctx.font = `700 ${Math.floor(s.tile*0.45)}px Inter, system-ui`;
    ctx.fillText(s.facing === -1 ? '◀' : '▶', px - 6, py - s.tile*1.1);

    // score text
    ctx.fillStyle = palette.text; ctx.font = `600 ${Math.floor(s.tile*0.7)}px Inter, system-ui`;
    ctx.fillText(String(score), 16, 28 + s.tile*0.3);
    ctx.font = `500 ${Math.floor(s.tile*0.45)}px Inter, system-ui`;
    ctx.fillText(`BEST ${best}`, 16, 28 + s.tile*1.1);

    if(gameOver){
      const title = 'GAME OVER'; ctx.font = `800 ${Math.floor(s.tile*1.0)}px Inter, system-ui`;
      const tw = ctx.measureText(title).width; ctx.fillText(title, (s.w - tw)/2, s.h * 0.38);
      const hint = '탭하여 재시작'; ctx.font = `500 ${Math.floor(s.tile*0.45)}px Inter, system-ui`;
      const hw = ctx.measureText(hint).width; ctx.fillText(hint, (s.w - hw)/2, s.h * 0.52);
    }

    ctx.restore();
  }

  // gestures
  useEffect(()=>{
    const c = canvasRef.current; if(!c) return;
    const lastTap = { t: 0 }; let pressTimer:number|null = null; let longPressFired = false;
    const onDown = (e:Event)=>{ e.preventDefault(); if(gameOver){ reset(false); setRunning(true); return; } if(!running) setRunning(true); longPressFired=false; pressTimer = window.setTimeout(()=>{ longPressFired=true; rotate(); }, 350); };
    const onUp   = (e:Event)=>{ e.preventDefault(); if(pressTimer){ clearTimeout(pressTimer); pressTimer=null; } if(longPressFired) return; const now=performance.now(); if(now-lastTap.t<280){ rotate(); lastTap.t=0; } else { forward(); lastTap.t=now; } };
    c.addEventListener('touchstart', onDown as any, { passive: false } as any);
    c.addEventListener('touchend', onUp as any,   { passive: false } as any);
    c.addEventListener('mousedown', onDown as any, { passive: false } as any);
    c.addEventListener('mouseup', onUp as any,   { passive: false } as any);
    return ()=>{
      c.removeEventListener('touchstart', onDown as any);
      c.removeEventListener('touchend', onUp as any);
      c.removeEventListener('mousedown', onDown as any);
      c.removeEventListener('mouseup', onUp as any);
    };
  }, [running, gameOver]);

  return (<div style={{textAlign:'center', padding:'8px'}}>
    <canvas ref={canvasRef} width={360} height={640} style={{width:'100%', background:'#0f1220', touchAction:'none'}} />
    <div style={{marginTop:10}}>
      <button onClick={forward} style={{marginRight:10}}>전진 ⬆</button>
      <button onClick={rotate} style={{marginRight:10}}>회전 ↻</button>
      <button onClick={()=>reset(false)}>리셋</button>
    </div>
  </div>);
}
