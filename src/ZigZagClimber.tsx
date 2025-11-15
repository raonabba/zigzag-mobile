import React, { useEffect, useRef, useState } from "react";

/**
 * ZigZag Climber — Canvas game (mobile-friendly)
 *
 * 카메라 공식 고정:
 *  - 화면 y = 월드 y - (camY - (baseY - 6*tile))
 *  - 루프: targetCam = baseY - player.y + 6*tile
 * 시작/리사이즈 기준:
 *  - reset: camY = baseY - 4*tile (하단에서 2타일 위로 보이기)
 *  - 정지/게임오버 리사이즈 시 동일한 기준으로 보정
 * UI:
 *  - 하단 버튼 영역 확보, zIndex
 * 기타:
 *  - 계단 조기 생성, 모바일 제스처(탭/더블탭/롱프레스)
 */

const palette = {
  bg: "#0f1220",
  grid: "#1b2038",
  stair: "#9aa8ff",
  stairAlt: "#7d8bff",
  player: "#ffd166",
  shadow: "#2b2f4a",
  text: "#e9ecff",
  accent: "#a7f3d0",
  danger: "#ff6b6b",
} as const;

type Dir = -1 | 1;
type Step = { x: number; y: number; dir: Dir };

function useAnimationFrame(cb: (dt: number) => void) {
  const last = useRef(0);
  useEffect(() => {
    let raf = 0;
    const tick = (t: number) => {
      const dt = last.current ? (t - last.current) / 1000 : 0;
      last.current = t;
      cb(dt);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [cb]);
}

function generateSteps(count: number, startX: number, startY: number, tile: number): Step[] {
  const steps: Step[] = [];
  let x = startX, y = startY;
  let dir: Dir = Math.random() < 0.5 ? -1 : 1;
  for (let i = 0; i < count; i++) {
    if (i > 0 && Math.random() < 0.4) dir = (dir * -1) as Dir;
    x += dir * tile;
    y -= tile;
    steps.push({ x, y, dir });
  }
  return steps;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function addRoundRectIfMissing(ctx: CanvasRenderingContext2D) {
  // @ts-ignore
  if (typeof (ctx as any).roundRect !== "function") {
    // @ts-ignore
    ctx.roundRect = function (x: number, y: number, w: number, h: number, r: number) {
      const radius = clamp(r, 0, Math.min(Math.abs(w), Math.abs(h)) / 2);
      this.beginPath();
      this.moveTo(x + radius, y);
      this.arcTo(x + w, y, x + w, y + h, radius);
      this.arcTo(x + w, y + h, x, y + h, radius);
      this.arcTo(x, y + h, x, y, radius);
      this.arcTo(x, y, x + w, y, radius);
      this.closePath();
    };
  }
}

function drawRobot(ctx: CanvasRenderingContext2D, cx: number, cy: number, tile: number, facing: Dir) {
  addRoundRectIfMissing(ctx);
  const s = tile;
  const bob = Math.sin(Date.now() / 300) * (s * 0.03);
  ctx.save();
  ctx.translate(cx, cy + bob);
  if (facing === -1) ctx.scale(-1, 1);

  const jetLen = s * 0.9 + Math.abs(bob) * 8;
  const grad = ctx.createLinearGradient(0, s * 0.55, 0, s * 0.55 + jetLen);
  grad.addColorStop(0, "rgba(210,230,255,0.9)");
  grad.addColorStop(1, "rgba(210,230,255,0.0)");
  ctx.fillStyle = grad;
  ctx.fillRect(-s * 0.54, s * 0.55, s * 0.26, jetLen);
  ctx.fillRect( s * 0.28, s * 0.55, s * 0.26, jetLen);

  ctx.fillStyle = "#6eb3d9";
  // @ts-ignore
  ctx.roundRect(-s * 0.74, s * 0.38, s * 0.56, s * 0.28, 10);
  // @ts-ignore
  ctx.roundRect( s * 0.00, s * 0.38, s * 0.56, s * 0.28, 10);
  ctx.fill();

  ctx.fillStyle = "#e0463b";
  ctx.fillRect(-s * 0.40, s * 0.08, s * 0.34, s * 0.33);
  ctx.fillRect( s * 0.06, s * 0.08, s * 0.34, s * 0.33);

  ctx.fillStyle = "#79b7d9";
  ctx.fillRect(-s * 0.36, -s * 0.20, s * 0.28, s * 0.30);
  ctx.fillRect( s * 0.08, -s * 0.20, s * 0.28, s * 0.30);

  ctx.fillStyle = "#4a6fb2";
  ctx.fillRect(-s * 0.36, -s * 0.34, s * 0.72, s * 0.16);

  ctx.fillStyle = "#2a3e6b";
  ctx.fillRect(-s * 0.46, -s * 0.90, s * 0.92, s * 0.60);

  ctx.strokeStyle = "#7fc6f9";
  ctx.lineWidth = Math.max(2, s * 0.08);
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(-s * 0.30, -s * 0.82); ctx.lineTo( s * 0.30, -s * 0.48);
  ctx.moveTo( s * 0.30, -s * 0.82); ctx.lineTo(-s * 0.30, -s * 0.48);
  ctx.stroke();

  ctx.fillStyle = "#f2c23b";
  // @ts-ignore
  ctx.roundRect(-s * 0.72, -s * 0.96, s * 0.44, s * 0.26, 8);
  // @ts-ignore
  ctx.roundRect( s * 0.28, -s * 0.96, s * 0.44, s * 0.26, 8);
  ctx.fill();

  ctx.fillStyle = "#79b7d9";
  ctx.fillRect(-s * 0.72, -s * 0.72, s * 0.22, s * 0.32);
  ctx.fillRect( s * 0.50, -s * 0.72, s * 0.22, s * 0.32);

  ctx.fillStyle = "#f2c23b";
  ctx.fillRect(-s * 0.78, -s * 0.44, s * 0.30, s * 0.22);
  ctx.fillRect( s * 0.48, -s * 0.44, s * 0.30, s * 0.22);

  ctx.fillStyle = "#939aa9";
  // @ts-ignore
  ctx.roundRect(-s * 0.90, -s * 0.24, s * 0.28, s * 0.18, 8);
  // @ts-ignore
  ctx.roundRect( s * 0.62, -s * 0.24, s * 0.28, s * 0.18, 8);
  ctx.fill();

  ctx.fillStyle = "#d63a2f";
  ctx.fillRect(-s * 0.28, -s * 1.24, s * 0.56, s * 0.34);

  ctx.fillStyle = "#4aa6ff";
  ctx.beginPath(); ctx.moveTo(-s * 0.10, -s * 1.24); ctx.lineTo(-s * 0.24, -s * 1.46); ctx.lineTo(-s * 0.18, -s * 1.24); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo( s * 0.10, -s * 1.24); ctx.lineTo( s * 0.24, -s * 1.46); ctx.lineTo( s * 0.18, -s * 1.24); ctx.closePath(); ctx.fill();

  ctx.fillStyle = "#ffd166"; ctx.fillRect(-s * 0.18, -s * 1.12, s * 0.16, s * 0.10); ctx.fillRect( s * 0.02, -s * 1.12, s * 0.16, s * 0.10);
  ctx.fillStyle = "#5bb0ff"; ctx.fillRect(-s * 0.12, -s * 1.00, s * 0.24, s * 0.10);

  ctx.restore();
}

export default function ZigZagClimber() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [high, setHigh] = useState<number>(() => Number(localStorage.getItem("zzc-high") || 0));
  const [combo, setCombo] = useState(0);
  const [message, setMessage] = useState("전진(탭)/회전(더블탭·길게)으로 올라가세요!");

  const state = useRef({
    w: 360, h: 640, tile: 36,
    baseX: 0, baseY: 0,
    camY: 0, // 카메라 월드 y
    steps: [] as Step[],
    player: { x: 0, y: 0 },
    facing: 1 as Dir,
    nextIndex: 0,
    speed: 70,
    timeLeft: 2.2,
    timeMax: 2.2,
  });

  // ===== Resize =====
  useEffect(() => {
    function onResize() {
      const parent = canvasRef.current?.parentElement;
      if (!parent || !canvasRef.current) return;

      const pr = window.devicePixelRatio || 1;
      const vv = (window as any).visualViewport;
      const vvh = vv && typeof vv.height === "number" ? vv.height : window.innerHeight;

      const UI_BOTTOM = 96; // 하단 버튼 여유
      const width = Math.min(parent.clientWidth, 520);
      const height = Math.max(480, Math.min(vvh, 900) - UI_BOTTOM);

      const c = canvasRef.current;
      c.width = Math.floor(width * pr);
      c.height = Math.floor(height * pr);
      c.style.width = `${width}px`;
      c.style.height = `${height}px`;

      const s = state.current;
      s.w = c.width / pr;
      s.h = c.height / pr;
      s.tile = Math.max(28, Math.floor(Math.min(s.w, s.h) / 14));
      s.baseX = Math.floor(s.w / 2);
      s.baseY = s.h - s.tile * 2;

      // 멈춤/게임오버 상태에선 시작 기준과 동일한 높이로 보정
      if (!running && !gameOver) {
        s.camY = s.baseY - s.tile * 4;
        draw();
      }
    }

    onResize();
    window.addEventListener("resize", onResize);
    (window as any).visualViewport?.addEventListener?.("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      (window as any).visualViewport?.removeEventListener?.("resize", onResize);
    };
  }, [running, gameOver]);

  // ===== Init =====
  const reset = (hard = false) => {
    const s = state.current;
    s.player = { x: s.baseX, y: s.baseY };
    s.nextIndex = 0;
    s.speed = 70;
    s.timeMax = 2.2;
    s.timeLeft = s.timeMax;
    s.steps = generateSteps(200, s.player.x, s.player.y, s.tile);
    s.facing = s.steps[0]?.dir ?? 1;

    // 시작 시 하단에서 2타일 위로 보이도록
    s.camY = s.baseY - s.tile * 4;

    if (hard) setScore(0);
    setCombo(0);
    setMessage("준비!");
  };

  useEffect(() => { reset(true); }, []);

  // ===== Keyboard (desktop) =====
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.key === "ArrowUp") handleForward();
      else if (e.key === " ") {
        if (gameOver) { setGameOver(false); reset(true); setRunning(true); }
        else handleRotate();
      } else if (e.key === "Enter" && !running && !gameOver) setRunning(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [running, gameOver]);

  // ===== Mobile gestures =====
  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const lastTap = { t: 0 };
    let pressTimer: number | null = null;
    let longPressFired = false;

    const onPointerDown = (e: Event) => {
      e.preventDefault();
      if (gameOver) { setGameOver(false); reset(true); setRunning(true); return; }
      if (!running) setRunning(true);
      longPressFired = false;
      pressTimer = window.setTimeout(() => { longPressFired = true; handleRotate(); }, 350);
    };
    const onPointerUp = (e: Event) => {
      e.preventDefault();
      if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
      if (longPressFired) return;
      const now = performance.now();
      if (now - lastTap.t < 280) { handleRotate(); lastTap.t = 0; }
      else { handleForward(); lastTap.t = now; }
    };

    c.addEventListener("touchstart", onPointerDown as any, { passive: false } as any);
    c.addEventListener("touchend", onPointerUp as any, { passive: false } as any);
    c.addEventListener("mousedown", onPointerDown as any, { passive: false } as any);
    c.addEventListener("mouseup", onPointerUp as any, { passive: false } as any);
    c.addEventListener("gesturestart", ((ev: Event) => (ev.preventDefault(), false)) as any, { passive: false } as any);

    return () => {
      c.removeEventListener("touchstart", onPointerDown as any);
      c.removeEventListener("touchend", onPointerUp as any);
      c.removeEventListener("mousedown", onPointerDown as any);
      c.removeEventListener("mouseup", onPointerUp as any);
      c.removeEventListener("gesturestart", ((ev: Event) => ev.preventDefault()) as any);
    };
  }, [running, gameOver]);

  function advanceIfMatch() {
    const s = state.current;
    const step = s.steps[s.nextIndex];
    if (!step) return false;
    if (step.dir === s.facing) {
      s.player = { x: step.x, y: step.y };
      s.nextIndex++;
      setScore(v => v + 1);
      setCombo(c => Math.min(999, c + 1));
      if (s.nextIndex % 5 === 0) { s.speed = Math.min(220, s.speed + 6); s.timeMax = Math.max(0.9, s.timeMax - 0.05); }
      s.timeLeft = s.timeMax; setMessage("");
      return true;
    }
    return false;
  }

  function handleForward() { if (gameOver) return; if (!running) setRunning(true); if (!advanceIfMatch()) doGameOver("잘못된 전진!"); }
  function handleRotate()  { if (gameOver) return; if (!running) setRunning(true); state.current.facing = (state.current.facing * -1) as Dir; if (!advanceIfMatch()) doGameOver("잘못된 회전!"); }

  function doGameOver(reason: string) {
    setMessage(reason); setGameOver(true); setRunning(false); setCombo(0);
    setHigh(h => { const nh = Math.max(h, score); localStorage.setItem("zzc-high", String(nh)); return nh; });
  }

  // ===== Loop =====
  useAnimationFrame((dt) => {
    if (!running || gameOver) { draw(); return; }
    const s = state.current;

    s.timeLeft -= dt; if (s.timeLeft <= 0) { doGameOver("시간 초과!"); return; }

    // 카메라 추적 (보간) — 플레이어 머리 위 여유 6타일
    const targetCam = Math.max(0, s.baseY - s.player.y + s.tile * 6);
    s.camY += (targetCam - s.camY) * Math.min(1, 8 * dt); // 반응속도 8

    draw();

    if (s.player.y + s.tile - s.camY > s.h - (s.baseY - s.tile * 6)) {
      // 화면 아래로 유실 방지 (보수적)
      doGameOver("뒤처졌어요!");
    }

    if (s.nextIndex + 60 > s.steps.length) {
      const last = s.steps[s.steps.length - 1];
      s.steps.push(...generateSteps(200, last.x, last.y, s.tile));
    }
  });

  function drawGrid(ctx: CanvasRenderingContext2D, s: typeof state.current) {
    const gap = s.tile; ctx.strokeStyle = palette.grid; ctx.lineWidth = 1;
    for (let x = 0; x <= s.w; x += gap) { ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, s.h); ctx.stroke(); }
    for (let y = (-(s.camY % gap) + gap) % gap; y <= s.h; y += gap) { ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(s.w, y + 0.5); ctx.stroke(); }
  }

  function draw() {
    const c = canvasRef.current; if (!c) return;
    const pr = window.devicePixelRatio || 1;
    const ctx = c.getContext("2d"); if (!ctx) return;
    ctx.save(); ctx.scale(pr, pr);
    const s = state.current;

    ctx.fillStyle = palette.bg; ctx.fillRect(0, 0, s.w, s.h);
    drawGrid(ctx, s);

    // stairs
    for (let i = Math.max(0, s.nextIndex - 8); i < s.steps.length; i++) {
      const step = s.steps[i]; const size = s.tile * 0.9; const sx = step.x - size / 2;
      const sy = step.y - size / 2 - (s.camY - (s.baseY - s.tile * 6));
      if (sy > s.h + s.tile || sy < -s.tile * 2) continue;
      ctx.fillStyle = i % 2 ? palette.stair : palette.stairAlt; ctx.fillRect(sx, sy, size, size);
      ctx.fillStyle = palette.shadow; ctx.fillRect(sx, sy + size - 4, size, 4);
      if (i === s.nextIndex) { ctx.globalAlpha = 0.18; ctx.fillStyle = step.dir === -1 ? palette.danger : palette.accent; ctx.fillRect(sx, sy, size, size); ctx.globalAlpha = 1; }
    }

    // player
    const pSize = s.tile * 0.9; const px = s.player.x;
    const py = s.player.y - (s.camY - (s.baseY - s.tile * 6));
    drawRobot(ctx, px, py, pSize, s.facing);
    ctx.fillStyle = palette.text; ctx.font = `700 ${Math.floor(s.tile * 0.45)}px Inter, system-ui`;
    ctx.fillText(s.facing === -1 ? "◀" : "▶", px - 6, py - pSize * 1.2);

    // UI
    ctx.fillStyle = palette.text; ctx.font = `600 ${Math.floor(s.tile * 0.7)}px Inter, system-ui`;
    ctx.fillText(String(score), 16, 28 + s.tile * 0.3);
    ctx.font = `500 ${Math.floor(s.tile * 0.45)}px Inter, system-ui`; ctx.fillText(`BEST ${high}`, 16, 28 + s.tile * 1.1);

    if (combo >= 3) {
      const label = `${combo} COMBO!`;
      const tw = ctx.measureText(label).width;
      ctx.fillStyle = palette.accent; ctx.fillRect(s.w - tw - 28, 18, tw + 12, 28);
      ctx.fillStyle = "#0b1324"; ctx.font = "800 16px Inter, system-ui"; ctx.fillText(label, s.w - tw - 22, 38);
    }

    const barW = Math.max(0, (s.timeLeft / s.timeMax) * (s.w - 32));
    ctx.fillStyle = palette.grid; ctx.fillRect(16, s.h - 20, s.w - 32, 8);
    ctx.fillStyle = s.timeLeft < s.timeMax * 0.33 ? palette.danger : palette.accent;
    ctx.fillRect(16, s.h - 20, barW, 8);

    if (message && !running) {
      ctx.font = `700 ${Math.floor(s.tile * 0.8)}px Inter, system-ui`;
      const tw2 = ctx.measureText(message).width;
      ctx.fillStyle = palette.text; ctx.fillText(message, (s.w - tw2) / 2, s.h * 0.45);
    }

    if (gameOver) {
      const title = "GAME OVER";
      ctx.font = `800 ${Math.floor(s.tile * 1.0)}px Inter, system-ui`;
      const tw3 = ctx.measureText(title).width;
      ctx.fillStyle = palette.text; ctx.fillText(title, (s.w - tw3) / 2, s.h * 0.38);

      ctx.font = `600 ${Math.floor(s.tile * 0.6)}px Inter, system-ui`;
      const sub = `점수 ${score}  ·  최고 ${high}`;
      const sw = ctx.measureText(sub).width;
      ctx.fillText(sub, (s.w - sw) / 2, s.h * 0.45);

      ctx.font = `500 ${Math.floor(s.tile * 0.45)}px Inter, system-ui`;
      const hint = "탭하여 재시작";
      const hw = ctx.measureText(hint).width;
      ctx.fillStyle = "#c6caf8"; ctx.fillText(hint, (s.w - hw) / 2, s.h * 0.54);
    }

    ctx.restore();
  }

  const Button: React.FC<{ label: string; onDown: () => void }> = ({ label, onDown }) => (
    <button
      onMouseDown={(e) => { e.preventDefault(); onDown(); }}
      onTouchStart={(e) => { e.preventDefault(); onDown(); }}
      className="select-none rounded-2xl px-6 py-4 text-lg font-bold shadow-md border border-white/10 bg-white/5 text-white hover:bg-white/10 active:scale-95 transition"
      style={{ backdropFilter: "blur(6px)" }}
      aria-label={label}
    >
      {label}
    </button>
  );

  return (
    <div
      className="w-full grid place-items-center text-white"
      style={{
        minHeight: "560px",
        background: "linear-gradient(180deg, #0b1026 0%, #0f1220 60%, #0f1220 100%)",
        touchAction: "none",
        paddingBottom: "calc(env(safe-area-inset-bottom) + 96px)"
      }}
    >
      <div className="w-full max-w-[520px] p-3">
        <div className="rounded-2xl border border-white/10 shadow-xl overflow-hidden">
          <div className="p-3 sm:p-4 bg-white/5 flex items-center justify-between">
            <div className="font-semibold">ZigZag Climber</div>
            <div className="text-sm opacity-80">Mobile Ready</div>
          </div>
          <div className="relative" style={{ touchAction: "none" }}>
            <canvas
              ref={canvasRef}
              className="w-full block"
              style={{ display: "block", background: "transparent", touchAction: "none" }}
            />
            <div
              className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-4 px-3 pointer-events-auto"
              style={{ zIndex: 10 }}
            >
              <Button label="전진 ⬆" onDown={() => handleForward()} />
              <Button label="회전 ↻" onDown={() => handleRotate()} />
            </div>

            {!running && !gameOver && (
              <div className="absolute inset-0 grid place-items-center pointer-events-none">
                <div className="text-center opacity-90">
                  <div className="text-3xl font-extrabold mb-2">시작하려면 화면을 탭하세요</div>
                  <div className="text-sm opacity-80">탭: 전진 · 더블탭/길게: 회전</div>
                </div>
              </div>
            )}
          </div>

          {!running && !gameOver && (
            <div className="p-4 grid gap-2 bg-white/5 text-sm">
              <div className="opacity-90"><b>조작</b> — 탭: 전진 · 더블탭/길게: 회전(+한 칸 이동)</div>
              <div className="opacity-90"><b>규칙</b> — 시간 막대가 다 닳기 전에 올바른 선택을 하세요. 연속 성공 시 속도↑, 제한시간↓</div>
              <div className="opacity-70">모바일 친화 모드: 화면 어디든 조작 가능, 게임 시작 시 이 안내는 자동으로 숨겨집니다.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}