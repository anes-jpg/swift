import { useEffect, useRef } from "react";

interface BlobConfig {
  cx: number;
  cy: number;
  r: number;
  color: string;
}

// Pure Black & Red ambient blobs
const RED_BLOBS: BlobConfig[] = [
  { cx: 0.28, cy: 0.38, r: 0.48, color: "rgba(220, 38, 38, 0.045)" },
  { cx: 0.72, cy: 0.62, r: 0.42, color: "rgba(185, 28, 28, 0.035)" },
  { cx: 0.5, cy: 0.25, r: 0.36, color: "rgba(153, 27, 27, 0.025)" },
];

export default function GradientBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current = {
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      };
    };
    window.addEventListener("mousemove", onMouseMove);

    const draw = () => {
      timeRef.current += 0.0012;
      const t = timeRef.current;
      const { x: mx, y: my } = mouseRef.current;
      const w = canvas.width;
      const h = canvas.height;

      // Pure deep black obsidian backdrop
      ctx.fillStyle = "#050505";
      ctx.fillRect(0, 0, w, h);

      for (let i = 0; i < RED_BLOBS.length; i++) {
        const blob = RED_BLOBS[i];
        const phase = i * 1.4;
        const cx = w * (blob.cx + 0.035 * Math.sin(t * 0.5 + phase) + (mx - 0.5) * 0.025);
        const cy = h * (blob.cy + 0.035 * Math.cos(t * 0.4 + phase) + (my - 0.5) * 0.025);
        const radius = Math.min(w, h) * blob.r;

        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        grad.addColorStop(0, blob.color);
        grad.addColorStop(1, "transparent");

        ctx.globalCompositeOperation = "screen";
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      }

      ctx.globalCompositeOperation = "source-over";
      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
}
