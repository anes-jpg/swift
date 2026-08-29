import { useEffect, useRef } from "react";

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
      timeRef.current += 0.002;
      const t = timeRef.current;
      const { x: mx, y: my } = mouseRef.current;
      const w = canvas.width;
      const h = canvas.height;

      ctx.fillStyle = "#050505";
      ctx.fillRect(0, 0, w, h);

      const blobs = [
        { cx: 0.3, cy: 0.4, r: 0.35, color: "rgba(180, 0, 0, 0.06)" },
        { cx: 0.7, cy: 0.6, r: 0.3, color: "rgba(120, 0, 0, 0.04)" },
        { cx: 0.5, cy: 0.3, r: 0.25, color: "rgba(200, 20, 20, 0.03)" },
      ];

      for (const blob of blobs) {
        const cx = w * (blob.cx + 0.05 * Math.sin(t * 0.8) + (mx - 0.5) * 0.06);
        const cy = h * (blob.cy + 0.05 * Math.cos(t * 0.6) + (my - 0.5) * 0.06);
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
