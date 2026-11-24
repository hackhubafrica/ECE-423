import React, { useEffect, useRef, useState } from 'react';

export interface ConfettiBurstEvent {
  id: number;
  variant: 'subtle' | 'celebrate';
}

interface ConfettiShowerProps {
  burst: ConfettiBurstEvent | null;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  color: string;
  rotation: number;
  vRot: number;
  tiltPhase: number;
  tiltSpeed: number;
  alpha: number;
  shape: 'rect' | 'circle';
}

const PALETTE = [
  '#0284c7', // sky-600
  '#38bdf8', // sky-400
  '#10b981', // emerald-500
  '#34d399', // emerald-400
  '#f59e0b', // amber-500
  '#64748b', // slate-500
];

export const ConfettiShower: React.FC<ConfettiShowerProps> = ({ burst }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!burst || burst.id === 0) return;

    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    setActive(true);
    let rafId = 0;
    let cancelled = false;

    const frameStart = window.requestAnimationFrame(() => {
      if (cancelled) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const resize = () => {
        canvas.width = Math.floor(window.innerWidth * dpr);
        canvas.height = Math.floor(window.innerHeight * dpr);
        canvas.style.width = `${window.innerWidth}px`;
        canvas.style.height = `${window.innerHeight}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      };
      resize();
      window.addEventListener('resize', resize);

      const width = window.innerWidth;
      const height = window.innerHeight;
      const isCelebrate = burst.variant === 'celebrate';
      const count = isCelebrate ? 68 : 28;
      const durationMs = isCelebrate ? 2300 : 1550;

      const particles: Particle[] = Array.from({ length: count }, (_, idx) => {
        const spreadMin = isCelebrate ? 0.08 : 0.22;
        const spreadMax = isCelebrate ? 0.92 : 0.78;
        const xFrac =
          spreadMin +
          ((idx + Math.random() * 0.8) / count) * (spreadMax - spreadMin);
        return {
          x: width * xFrac,
          y: -12 - Math.random() * (isCelebrate ? 90 : 45),
          vx: (Math.random() - 0.5) * (isCelebrate ? 140 : 85),
          vy: (isCelebrate ? 170 : 135) + Math.random() * (isCelebrate ? 190 : 120),
          w: (isCelebrate ? 7 : 6) + Math.random() * 4,
          h: (isCelebrate ? 4 : 3.5) + Math.random() * 2.5,
          color: PALETTE[idx % PALETTE.length],
          rotation: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 6,
          tiltPhase: Math.random() * Math.PI * 2,
          tiltSpeed: 4 + Math.random() * 5,
          alpha: isCelebrate ? 0.9 : 0.82,
          shape: idx % 5 === 0 ? 'circle' : 'rect',
        };
      });

      const startTime = performance.now();
      let prevTime = startTime;

      const tick = (now: number) => {
        if (cancelled) return;
        const dt = Math.min((now - prevTime) / 1000, 0.05);
        prevTime = now;
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / durationMs, 1);

        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

        const fadeFactor = progress > 0.62 ? 1 - (progress - 0.62) / 0.38 : 1;

        for (let i = 0; i < particles.length; i += 1) {
          const p = particles[i];
          // Air resistance + gentle gravity
          p.vx *= 1 - 0.85 * dt;
          p.vy += (isCelebrate ? 310 : 270) * dt;
          p.vy = Math.min(p.vy, isCelebrate ? 420 : 340);

          p.tiltPhase += p.tiltSpeed * dt;
          p.x += (p.vx + Math.sin(p.tiltPhase) * 26) * dt;
          p.y += p.vy * dt;
          p.rotation += p.vRot * dt;

          const drawAlpha = Math.max(0, p.alpha * fadeFactor);
          if (drawAlpha <= 0.01 || p.y > height + 30) continue;

          ctx.save();
          ctx.globalAlpha = drawAlpha;
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.fillStyle = p.color;

          if (p.shape === 'circle') {
            ctx.beginPath();
            ctx.arc(0, 0, p.h * 0.65, 0, Math.PI * 2);
            ctx.fill();
          } else {
            const scaleY = 0.35 + 0.65 * Math.abs(Math.cos(p.tiltPhase));
            ctx.fillRect(-p.w / 2, (-p.h * scaleY) / 2, p.w, p.h * scaleY);
          }
          ctx.restore();
        }

        if (elapsed < durationMs) {
          rafId = window.requestAnimationFrame(tick);
        } else {
          ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
          window.removeEventListener('resize', resize);
          setActive(false);
        }
      };

      rafId = window.requestAnimationFrame(tick);
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frameStart);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [burst]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50"
    />
  );
};
