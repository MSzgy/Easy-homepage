import { useEffect, useRef } from "react";
import { clamp, cssRgb, prefersReducedMotion, smoothstep } from "../lib/util.js";

// Fixed background: stars, meteors, and a sun that starts inside the "o" of
// Mosu and travels to the center of the constellation as the page scrolls.
export function AmbientCanvas({ oRef, targetRef }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    const reduceMotion = prefersReducedMotion();
    let width = 0;
    let height = 0;
    let frameId = 0;
    let stars = [];
    let meteors = [];
    let nextMeteor = 0;
    let colors = {};
    let frame = 0;
    const start = performance.now();

    const readColors = () => {
      const light = document.documentElement.dataset.mode === "light";
      colors = {
        primary: cssRgb("--primary"),
        secondary: cssRgb("--secondary", "114, 201, 255"),
        accent: cssRgb("--accent", "154, 240, 255"),
        text: cssRgb("--text", "242, 247, 245"),
        light,
      };
    };

    const resize = () => {
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const count = Math.max(60, Math.floor((width * height) / 9000));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.3 + 0.2,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.8 + 0.3,
      }));
    };

    // 0 at the top of the page, 1 once the constellation's top edge reaches mid-screen;
    // from then on the sun stays pinned to the constellation center.
    const scrollProgress = () => {
      const target = targetRef?.current;
      if (!target) return 0;
      const distance = target.getBoundingClientRect().top + window.scrollY - height * 0.55;
      return distance <= 0 ? 1 : clamp(window.scrollY / distance);
    };

    const draw = (now) => {
      if (frame++ % 30 === 0) readColors();
      const elapsed = (now - start) / 1000;
      const { primary, secondary, accent, text, light } = colors;
      context.clearRect(0, 0, width, height);

      stars.forEach((star) => {
        const twinkle = reduceMotion ? 0.6 : 0.4 + Math.sin(elapsed * star.speed + star.phase) * 0.3 + 0.3;
        context.fillStyle = `rgba(${text}, ${twinkle * (light ? 0.35 : 0.8)})`;
        context.beginPath();
        context.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        context.fill();
      });

      if (!reduceMotion && !light) {
        if (now > nextMeteor) {
          const speed = Math.random() * 8 + 6;
          meteors.push({
            x: width * (0.4 + Math.random() * 0.7),
            y: -30 - Math.random() * 120,
            vx: -speed * 0.55,
            vy: speed,
            size: Math.random() * 1.4 + 0.8,
            tail: Math.random() * 120 + 80,
          });
          nextMeteor = now + 2500 + Math.random() * 4000;
        }
        meteors = meteors.filter((meteor) => {
          meteor.x += meteor.vx;
          meteor.y += meteor.vy;
          const length = Math.hypot(meteor.vx, meteor.vy);
          const tailX = meteor.x - (meteor.vx * meteor.tail) / length;
          const tailY = meteor.y - (meteor.vy * meteor.tail) / length;
          const gradient = context.createLinearGradient(meteor.x, meteor.y, tailX, tailY);
          gradient.addColorStop(0, "rgba(230, 255, 245, 0.95)");
          gradient.addColorStop(0.3, `rgba(${primary}, 0.55)`);
          gradient.addColorStop(1, `rgba(${primary}, 0)`);
          context.strokeStyle = gradient;
          context.lineWidth = meteor.size;
          context.lineCap = "round";
          context.beginPath();
          context.moveTo(meteor.x, meteor.y);
          context.lineTo(tailX, tailY);
          context.stroke();
          return meteor.x > -200 && meteor.y < height + 200;
        });
      }

      // Sun: from the "o" in the hero title to the constellation center.
      const p = smoothstep(0, 1, scrollProgress());
      let sourceX = width * 0.22;
      let sourceY = height * 0.32;
      if (oRef?.current) {
        const rect = oRef.current.getBoundingClientRect();
        sourceX = rect.left + rect.width / 2;
        sourceY = rect.top + rect.height * 0.55;
      }
      let targetX = width / 2;
      let targetY = height / 2;
      if (targetRef?.current) {
        const rect = targetRef.current.getBoundingClientRect();
        targetX = rect.left + rect.width / 2;
        targetY = rect.top + rect.height / 2;
      }
      const cx = sourceX + (targetX - sourceX) * p;
      const cy = sourceY + (targetY - sourceY) * p;

      // Hero orbits fade out on the way; the constellation takes over.
      const orbitAlpha = 1 - smoothstep(0, 0.55, p);
      if (orbitAlpha > 0.01) {
        const scale = Math.min(width, height) / 720;
        const a = Math.max(136, 218 * scale);
        const b = Math.max(48, 82 * scale);
        const tilt = -0.42;
        const spin = reduceMotion ? 0.8 : elapsed;
        const point = (rx, ry, angle) => {
          const x = Math.cos(angle) * rx;
          const y = Math.sin(angle) * ry;
          return { x: cx + x * Math.cos(tilt) - y * Math.sin(tilt), y: cy + x * Math.sin(tilt) + y * Math.cos(tilt) };
        };
        context.save();
        context.translate(cx, cy);
        context.rotate(tilt);
        context.setLineDash([7, 10]);
        [[a, b, 0.28], [a * 1.38, b * 1.36, 0.14]].forEach(([rx, ry, alpha]) => {
          context.strokeStyle = `rgba(${accent}, ${alpha * orbitAlpha})`;
          context.beginPath();
          context.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
          context.stroke();
        });
        context.restore();
        context.setLineDash([]);
        const earth = point(a, b, spin * 0.4);
        const mars = point(a * 1.38, b * 1.36, spin * 0.22 + 1.7);
        context.fillStyle = `rgba(${secondary}, ${orbitAlpha})`;
        context.beginPath();
        context.arc(earth.x, earth.y, 8, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = `rgba(242, 247, 245, ${0.8 * orbitAlpha})`;
        context.beginPath();
        context.arc(earth.x + Math.cos(spin * 1.1) * 22, earth.y + Math.sin(spin * 1.1) * 10, 3.5, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = `rgba(255, 135, 95, ${0.65 * orbitAlpha})`;
        context.beginPath();
        context.arc(mars.x, mars.y, 5, 0, Math.PI * 2);
        context.fill();
      }

      const glowSize = 92 * (1 + p * 0.7);
      const glow = context.createRadialGradient(cx, cy, 0, cx, cy, glowSize);
      glow.addColorStop(0, `rgba(${primary}, ${light ? 0.55 : 0.82})`);
      glow.addColorStop(0.4, `rgba(${primary}, ${light ? 0.12 : 0.2})`);
      glow.addColorStop(1, `rgba(${primary}, 0)`);
      context.fillStyle = glow;
      context.beginPath();
      context.arc(cx, cy, glowSize, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = light ? `rgba(${primary}, 0.95)` : "rgba(236, 255, 247, 0.95)";
      context.beginPath();
      context.arc(cx, cy, 8.5 * (1 + p * 1.1), 0, Math.PI * 2);
      context.fill();

      frameId = window.requestAnimationFrame(draw);
    };

    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(resize, 120);
    };

    readColors();
    resize();
    window.addEventListener("resize", onResize);
    frameId = window.requestAnimationFrame(draw);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
    };
  }, [oRef, targetRef]);

  return <canvas className="ambient-canvas" ref={canvasRef} aria-hidden="true" />;
}
