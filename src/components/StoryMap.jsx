import { useEffect, useRef } from "react";
import { EDGES, ROADS, nodeById } from "../data/graph.js";
import { clamp, cssRgb, prefersReducedMotion } from "../lib/util.js";

// Story mode background: a living contour map. Roads leave "home" toward each
// blog direction; the projects that direction led to sit along the road.

// ---- Perlin noise (3D, seeded) for the drifting terrain ----
const PERM = (() => {
  const p = Array.from({ length: 256 }, (_, i) => i);
  let seed = 20261017;
  for (let i = 255; i > 0; i -= 1) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [p[i], p[j]] = [p[j], p[i]];
  }
  return Uint8Array.from([...p, ...p]);
})();
const GRAD = [[1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0], [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1], [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]];
const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const mix = (a, b, t) => a + (b - a) * t;
const grad = (hash, x, y, z) => {
  const g = GRAD[hash % 12];
  return g[0] * x + g[1] * y + g[2] * z;
};
function noise3(x, y, z) {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const Z = Math.floor(z) & 255;
  x -= Math.floor(x);
  y -= Math.floor(y);
  z -= Math.floor(z);
  const u = fade(x);
  const v = fade(y);
  const w = fade(z);
  const A = PERM[X] + Y;
  const AA = PERM[A] + Z;
  const AB = PERM[A + 1] + Z;
  const B = PERM[X + 1] + Y;
  const BA = PERM[B] + Z;
  const BB = PERM[B + 1] + Z;
  return mix(
    mix(mix(grad(PERM[AA], x, y, z), grad(PERM[BA], x - 1, y, z), u), mix(grad(PERM[AB], x, y - 1, z), grad(PERM[BB], x - 1, y - 1, z), u), v),
    mix(mix(grad(PERM[AA + 1], x, y, z - 1), grad(PERM[BA + 1], x - 1, y, z - 1), u), mix(grad(PERM[AB + 1], x, y - 1, z - 1), grad(PERM[BB + 1], x - 1, y - 1, z - 1), u), v),
    w,
  );
}

// Marching squares: corner bits tl=8 tr=4 br=2 bl=1; edges 0 top, 1 right, 2 bottom, 3 left.
const CASES = [[], [[3, 2]], [[2, 1]], [[3, 1]], [[0, 1]], [[3, 0], [2, 1]], [[0, 2]], [[3, 0]], [[3, 0]], [[0, 2]], [[0, 1], [3, 2]], [[0, 1]], [[3, 1]], [[2, 1]], [[3, 2]], []];
const LEVELS = [-0.45, -0.32, -0.2, -0.08, 0.04, 0.16, 0.28, 0.4];

// Road directions (radians, screen y down), in ROADS order. On phones every
// road fans into the top half, leaving the bottom half to the headline.
const ANGLES = [-2.55, -1.25, -0.12, 1.02, 2.45];
const ANGLES_MOBILE = [-2.75, -2.0, -1.2, -0.45, 0.3];
const PLACE_T = { 1: [0.62], 2: [0.5, 0.86], 3: [0.42, 0.68, 0.92] };
const easeOut = (t) => 1 - (1 - t) ** 3;

export function StoryMap({ viewRef, cardRef }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    const reduceMotion = prefersReducedMotion();
    let width = 0;
    let height = 0;
    let mobile = false;
    let frameId = 0;
    let frame = 0;
    let colors = {};
    let contours = [];
    let roads = [];
    let bridges = [];
    let hitPlaces = [];
    let hitRoads = [];
    const start = performance.now();
    const pointer = { x: 0.5, y: 0.5, sx: -999, sy: -999 };
    const camera = { x: 0, y: 0, zoom: reduceMotion ? 1 : 2.3 };

    const readColors = () => {
      colors = {
        bg: cssRgb("--story-bg", "6, 10, 15"),
        line: cssRgb("--story-line", "150, 220, 210"),
        text: cssRgb("--story-text", "236, 242, 240"),
        light: document.documentElement.dataset.mode === "light",
      };
      ["create", "agent", "web3", "life", "infra", "blog"].forEach((id) => {
        colors[id] = cssRgb(`--c-${id}`, "150, 220, 210");
      });
    };

    // World units: 1 = half the short side of the screen at zoom 1. Home is (0, 0).
    const layout = () => {
      const stretch = clamp(width / height, 1, 1.75);
      const stretchY = mobile ? clamp(height / width, 1, 1.3) : 1;
      roads = ROADS.map((road, index) => {
        const angle = (mobile ? ANGLES_MOBILE : ANGLES)[index];
        const length = (road.places.length ? 0.92 : 0.7) * (mobile ? 0.96 : 1);
        const dir = { x: Math.cos(angle) * stretch, y: Math.sin(angle) * stretchY };
        const perp = { x: -Math.sin(angle), y: Math.cos(angle) };
        const seed = index * 1.7 + 0.4;
        const at = (t) => {
          const wiggle = Math.sin(t * Math.PI * 1.35 + seed) * 0.09 * t;
          return { x: dir.x * t * length + perp.x * wiggle, y: dir.y * t * length + perp.y * wiggle };
        };
        const points = Array.from({ length: 64 }, (_, i) => at(i / 63));
        const ts = PLACE_T[road.places.length] ?? [];
        const built = { ...road, index, at, points, end: at(1) };
        built.places = road.places.map((id, i) => ({ id, t: ts[i], ...at(ts[i]), node: nodeById[id], road: built }));
        return built;
      });
      const placeById = Object.fromEntries(roads.flatMap((road) => road.places.map((place) => [place.id, place])));
      // Bridges: "flow" links between places on different roads.
      bridges = EDGES.filter((edge) => edge.kind === "flow" && placeById[edge.from] && placeById[edge.to])
        .map((edge) => ({ a: placeById[edge.from], b: placeById[edge.to], phase: Math.random() }))
        .filter((bridge) => bridge.a.road !== bridge.b.road);
    };

    const resize = () => {
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      width = window.innerWidth;
      height = window.innerHeight;
      mobile = width < 720;
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      layout();
    };

    const view = () => {
      const scroll = clamp(window.scrollY / height);
      const scale = Math.min(width, height) * (mobile ? 0.5 : 0.39) * camera.zoom * (1 - scroll * 0.22);
      const ox = width * (mobile ? 0.5 : 0.57);
      const oy = height * ((mobile ? 0.47 : 0.47) - scroll * 0.12);
      return {
        scale,
        scroll,
        toScreen: (p) => ({ x: ox + (p.x - camera.x) * scale, y: oy + (p.y - camera.y) * scale }),
        toWorld: (x, y) => ({ x: (x - ox) / scale + camera.x, y: (y - oy) / scale + camera.y }),
      };
    };

    const buildContours = (time, v) => {
      const step = mobile ? 22 : 18;
      const cols = Math.ceil(width / step) + 1;
      const rows = Math.ceil(height / step) + 1;
      const values = new Float32Array(cols * rows);
      const z = reduceMotion ? 0 : time * 0.028;
      for (let j = 0; j < rows; j += 1) {
        for (let i = 0; i < cols; i += 1) {
          const w = v.toWorld(i * step, j * step);
          values[j * cols + i] = noise3(w.x * 1.6, w.y * 1.6, z) * 0.8 + noise3(w.x * 4.1 + 7, w.y * 4.1, z * 1.6) * 0.25;
        }
      }
      contours = LEVELS.map((level) => {
        const path = new Path2D();
        for (let j = 0; j < rows - 1; j += 1) {
          for (let i = 0; i < cols - 1; i += 1) {
            const tl = values[j * cols + i];
            const tr = values[j * cols + i + 1];
            const br = values[(j + 1) * cols + i + 1];
            const bl = values[(j + 1) * cols + i];
            const index = (tl > level ? 8 : 0) | (tr > level ? 4 : 0) | (br > level ? 2 : 0) | (bl > level ? 1 : 0);
            if (index === 0 || index === 15) continue;
            const x = i * step;
            const y = j * step;
            const edge = (e) => {
              if (e === 0) return [x + ((level - tl) / (tr - tl)) * step, y];
              if (e === 1) return [x + step, y + ((level - tr) / (br - tr)) * step];
              if (e === 2) return [x + ((level - bl) / (br - bl)) * step, y + step];
              return [x, y + ((level - tl) / (bl - tl)) * step];
            };
            CASES[index].forEach(([e1, e2]) => {
              const [x1, y1] = edge(e1);
              const [x2, y2] = edge(e2);
              path.moveTo(x1, y1);
              path.lineTo(x2, y2);
            });
          }
        }
        return { level, path };
      });
    };

    const draw = (now) => {
      const time = (now - start) / 1000;
      const intro = reduceMotion ? 1 : clamp(time / 3.4);
      const state = viewRef.current;
      const selected = state.selectedId;
      const focusRoad = state.focusRoad;

      // Camera: intro pull-back, slow drift, pointer parallax, and focus.
      let target = { x: 0, y: 0, zoom: 1 };
      const selectedPlace = roads.flatMap((road) => road.places).find((place) => place.id === selected);
      const focusedRoad = roads.find((road) => road.topic === focusRoad);
      if (selectedPlace) target = { x: selectedPlace.x * 0.6, y: selectedPlace.y * 0.6, zoom: 1.3 };
      else if (focusedRoad) target = { x: focusedRoad.end.x * 0.42, y: focusedRoad.end.y * 0.42, zoom: 1.2 };
      if (!reduceMotion) {
        target.x += Math.sin(time * 0.05) * 0.05 + (pointer.x - 0.5) * 0.08;
        target.y += Math.cos(time * 0.04) * 0.035 + (pointer.y - 0.5) * 0.06;
      }
      const ease = reduceMotion ? 1 : 0.045;
      camera.x += (target.x - camera.x) * ease;
      camera.y += (target.y - camera.y) * ease;
      camera.zoom = intro < 1 ? 2.3 - 1.3 * easeOut(intro) : camera.zoom + (target.zoom - camera.zoom) * ease;

      const v = view();
      const { bg, line, text, light } = colors;
      if (frame % 2 === 0 || !contours.length) buildContours(time, v);

      context.fillStyle = `rgb(${bg})`;
      context.fillRect(0, 0, width, height);

      // Terrain.
      context.lineWidth = 1;
      contours.forEach(({ level, path }, index) => {
        const alpha = (light ? 0.1 : 0.07) + index * (light ? 0.012 : 0.012);
        context.strokeStyle = `rgba(${line}, ${alpha * (0.4 + intro * 0.6)})`;
        context.stroke(path);
        if (level === 0.4) {
          context.strokeStyle = `rgba(${line}, ${alpha * 0.6})`;
          context.lineWidth = 2.5;
          context.stroke(path);
          context.lineWidth = 1;
        }
      });

      // Drifting haze.
      if (!light) {
        [[0.25, 0.3, 0.5], [0.8, 0.7, 0.45], [0.6, 0.15, 0.35]].forEach(([fx, fy, r], i) => {
          const hx = width * (fx + Math.sin(time * 0.03 + i * 2) * 0.05);
          const hy = height * (fy + Math.cos(time * 0.025 + i) * 0.05);
          const radius = Math.max(width, height) * r;
          const haze = context.createRadialGradient(hx, hy, 0, hx, hy, radius);
          haze.addColorStop(0, `rgba(${[colors.agent, colors.life, colors.web3][i]}, 0.05)`);
          haze.addColorStop(1, `rgba(${bg}, 0)`);
          context.fillStyle = haze;
          context.fillRect(0, 0, width, height);
        });
      }

      const home = v.toScreen({ x: 0, y: 0 });
      const roadAlpha = (road) => {
        if (selectedPlace) return selectedPlace.road === road || bridges.some((b) => (b.a.id === selected || b.b.id === selected) && (b.a.road === road || b.b.road === road)) ? 1 : 0.22;
        if (focusedRoad) return focusedRoad === road ? 1 : 0.22;
        return 1;
      };
      const fadeOut = 1 - v.scroll * 0.45;

      // Roads, drawn out from home during the intro.
      hitRoads = [];
      roads.forEach((road) => {
        const reveal = reduceMotion ? 1 : clamp((time - 0.7 - road.index * 0.32) / 1.5);
        road.reveal = easeOut(reveal);
        if (road.reveal <= 0) return;
        const rgb = colors[road.cluster];
        const alpha = roadAlpha(road) * fadeOut;
        const last = Math.max(1, Math.floor(road.reveal * (road.points.length - 1)));
        const unfinished = !road.places.length;
        const trace = () => {
          context.beginPath();
          road.points.slice(0, last + 1).forEach((point, i) => {
            const s = v.toScreen(point);
            if (i === 0) context.moveTo(s.x, s.y);
            else context.lineTo(s.x, s.y);
          });
        };
        context.setLineDash(unfinished ? [6, 8] : []);
        context.lineCap = "round";
        context.lineWidth = 9;
        context.strokeStyle = `rgba(${rgb}, ${0.08 * alpha})`;
        trace();
        context.stroke();
        context.lineWidth = 1.6;
        context.strokeStyle = `rgba(${rgb}, ${(unfinished ? 0.45 : 0.85) * alpha})`;
        trace();
        context.stroke();
        context.setLineDash([]);

        // Travelers: small lights walking out along the road.
        if (!reduceMotion && road.reveal >= 1) {
          for (let k = 0; k < 3; k += 1) {
            const t = (time * 0.055 + k / 3 + road.index * 0.13) % 1;
            const span = unfinished ? 0.95 : 1;
            [0, 0.012, 0.024].forEach((lag, n) => {
              const s = v.toScreen(road.at(Math.max(0, t * span - lag)));
              context.fillStyle = `rgba(${rgb}, ${(n === 0 ? 0.95 : 0.4 - n * 0.12) * alpha * (unfinished ? 1 - t : 1)})`;
              context.beginPath();
              context.arc(s.x, s.y, n === 0 ? 2.4 : 1.6, 0, Math.PI * 2);
              context.fill();
            });
          }
        }

        // Signpost at the end of the road.
        if (road.reveal > 0.9) {
          const end = v.toScreen(road.at(1.08));
          const name = state.roadName(road);
          const note = state.roadNote(road);
          context.font = `600 ${mobile ? 13 : 15}px ${state.font}`;
          const signWidth = Math.max(context.measureText(name).width, context.measureText(note).width * 0.8);
          end.x = end.x < home.x ? Math.max(end.x, signWidth + 10) : Math.min(end.x, width - signWidth - 10);
          end.y = clamp(end.y, 70, height - 30);
          context.textAlign = end.x < home.x ? "right" : "left";
          context.font = `600 ${mobile ? 13 : 15}px ${state.font}`;
          context.fillStyle = `rgba(${rgb}, ${alpha})`;
          context.fillText(name, end.x, end.y);
          if (!mobile) {
            context.font = `11.5px ${state.font}`;
            context.fillStyle = `rgba(${text}, ${0.6 * alpha})`;
            context.fillText(note, end.x, end.y + 17);
          }
          const w = Math.max(context.measureText(name).width + 20, context.measureText(note).width);
          const x0 = end.x < home.x ? end.x - w : end.x;
          hitRoads.push({ road, x0, x1: x0 + w, y0: end.y - 18, y1: end.y + 22 });
        }
      });

      // Bridges between related places on different roads.
      bridges.forEach((bridge) => {
        if (bridge.a.road.reveal < 1 || bridge.b.road.reveal < 1) return;
        const a = v.toScreen(bridge.a);
        const b = v.toScreen(bridge.b);
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const away = Math.hypot(mid.x - home.x, mid.y - home.y) || 1;
        const ctrl = { x: mid.x + ((mid.x - home.x) / away) * 60, y: mid.y + ((mid.y - home.y) / away) * 60 };
        const touches = selected && (bridge.a.id === selected || bridge.b.id === selected);
        const alpha = (selected ? (touches ? 1 : 0.15) : 0.7) * fadeOut;
        context.setLineDash([2, 6]);
        context.lineWidth = 1.2;
        context.strokeStyle = `rgba(${text}, ${0.45 * alpha})`;
        context.beginPath();
        context.moveTo(a.x, a.y);
        context.quadraticCurveTo(ctrl.x, ctrl.y, b.x, b.y);
        context.stroke();
        context.setLineDash([]);
        if (!reduceMotion) {
          const t = (time * 0.12 + bridge.phase) % 1;
          const x = (1 - t) ** 2 * a.x + 2 * (1 - t) * t * ctrl.x + t * t * b.x;
          const y = (1 - t) ** 2 * a.y + 2 * (1 - t) * t * ctrl.y + t * t * b.y;
          context.fillStyle = `rgba(${text}, ${0.9 * alpha})`;
          context.beginPath();
          context.arc(x, y, 2, 0, Math.PI * 2);
          context.fill();
        }
      });

      // Home beacon with expanding rings.
      const rings = reduceMotion ? [0.4] : [0, 0.33, 0.66].map((offset) => (time * 0.4 + offset) % 1);
      rings.forEach((r) => {
        context.strokeStyle = `rgba(${text}, ${(1 - r) * 0.35 * fadeOut})`;
        context.lineWidth = 1;
        context.beginPath();
        context.arc(home.x, home.y, 10 + r * 60, 0, Math.PI * 2);
        context.stroke();
      });
      const glow = context.createRadialGradient(home.x, home.y, 0, home.x, home.y, 46);
      glow.addColorStop(0, `rgba(${colors.agent}, ${light ? 0.35 : 0.55})`);
      glow.addColorStop(1, `rgba(${colors.agent}, 0)`);
      context.fillStyle = glow;
      context.beginPath();
      context.arc(home.x, home.y, 46, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = light ? `rgb(${text})` : "rgba(240, 255, 248, 0.95)";
      context.beginPath();
      context.arc(home.x, home.y, 6, 0, Math.PI * 2);
      context.fill();
      context.textAlign = "center";
      context.font = `600 ${mobile ? 12 : 13}px ${state.font}`;
      context.fillStyle = `rgba(${text}, ${0.85 * fadeOut})`;
      context.fillText(state.homeLabel, home.x, home.y + 30);

      // Places along the roads.
      hitPlaces = [];
      const hoverId = state.hoverId;
      roads.forEach((road) => {
        const rgb = colors[road.cluster];
        road.places.forEach((place) => {
          if (road.reveal < place.t) return;
          const pop = reduceMotion ? 1 : easeOut(clamp((road.reveal - place.t) * 6));
          const s = v.toScreen(place);
          const active = place.id === selected || place.id === hoverId;
          const alpha = (selected ? (place.id === selected || bridges.some((b) => (b.a.id === selected && b.b.id === place.id) || (b.b.id === selected && b.a.id === place.id)) ? 1 : 0.3) : roadAlpha(road)) * fadeOut;
          if (place.node.live && !reduceMotion) {
            const pulse = (time * 0.6 + place.t) % 1;
            context.strokeStyle = `rgba(${rgb}, ${(1 - pulse) * 0.6 * alpha})`;
            context.beginPath();
            context.arc(s.x, s.y, 8 + pulse * 16, 0, Math.PI * 2);
            context.stroke();
          }
          context.fillStyle = `rgba(${bg}, ${alpha})`;
          context.beginPath();
          context.arc(s.x, s.y, (active ? 10 : 7.5) * pop, 0, Math.PI * 2);
          context.fill();
          context.strokeStyle = `rgba(${rgb}, ${alpha})`;
          context.lineWidth = 2;
          context.stroke();
          context.fillStyle = `rgba(${rgb}, ${alpha})`;
          context.beginPath();
          context.arc(s.x, s.y, (active ? 4.5 : 3) * pop, 0, Math.PI * 2);
          context.fill();

          context.font = `600 ${mobile ? 12 : 14}px ${state.font}`;
          const labelWidth = context.measureText(state.placeName(place.node)).width + 16;
          const preferLeft = s.x < home.x;
          const left = preferLeft ? s.x - labelWidth > 8 || s.x + labelWidth > width - 8 : s.x + labelWidth > width - 8 && s.x - labelWidth > 8;
          context.textAlign = left ? "right" : "left";
          // Phones: names only for the tapped place and its links; the list below has the rest.
          const linkedToSelected = selected && bridges.some((b) => (b.a.id === selected && b.b.id === place.id) || (b.b.id === selected && b.a.id === place.id));
          if (!mobile || active || linkedToSelected) {
            context.fillStyle = `rgba(${text}, ${(active ? 1 : 0.88) * alpha * pop})`;
            context.fillText(state.placeName(place.node), s.x + (left ? -14 : 14), s.y + 5);
          }
          hitPlaces.push({ id: place.id, x: s.x, y: s.y });
          if (place.id === selected && cardRef.current && !mobile) {
            const card = cardRef.current;
            const cw = card.offsetWidth;
            const ch = card.offsetHeight;
            // Prefer the side away from home; flip if it doesn't fit, so the pin stays visible.
            const before = s.x - cw - 28;
            const after = s.x + 28;
            const fitsBefore = before >= 16;
            const fitsAfter = after + cw <= width - 16;
            const x = clamp(left ? (fitsBefore ? before : fitsAfter ? after : before) : fitsAfter ? after : fitsBefore ? before : after, 16, width - cw - 16);
            const y = clamp(s.y - ch / 2, 76, height - ch - 16);
            card.style.transform = `translate3d(${x}px, ${y}px, 0)`;
          }
        });
      });

      // Vignette.
      const vignette = context.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.35, width / 2, height / 2, Math.max(width, height) * 0.75);
      vignette.addColorStop(0, `rgba(${bg}, 0)`);
      vignette.addColorStop(1, `rgba(${bg}, ${light ? 0.55 : 0.85})`);
      context.fillStyle = vignette;
      context.fillRect(0, 0, width, height);

      frame += 1;
      frameId = window.requestAnimationFrame(draw);
    };

    const pick = (x, y) => {
      const place = hitPlaces.find((item) => Math.hypot(item.x - x, item.y - y) < 22);
      if (place) return { place: place.id };
      const road = hitRoads.find((item) => x >= item.x0 && x <= item.x1 && y >= item.y0 && y <= item.y1);
      return road ? { road: road.road.topic } : {};
    };
    const onMove = (event) => {
      pointer.x = event.clientX / width;
      pointer.y = event.clientY / height;
      const hit = pick(event.clientX, event.clientY);
      const armed = Boolean(hit.place || hit.road);
      document.documentElement.classList.toggle("cursor-armed", armed);
      viewRef.current.setHover(hit.place ?? null);
    };
    const onClick = (event) => {
      const hit = pick(event.clientX, event.clientY);
      const { onSelect, onFocusRoad } = viewRef.current;
      if (hit.place) onSelect(hit.place);
      else if (hit.road) onFocusRoad(hit.road);
      else {
        onSelect(null);
        onFocusRoad(null);
      }
    };

    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(resize, 120);
    };

    readColors();
    resize();
    const colorTimer = window.setInterval(readColors, 500);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("click", onClick);
    window.addEventListener("resize", onResize);
    frameId = window.requestAnimationFrame(draw);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearInterval(colorTimer);
      window.clearTimeout(resizeTimer);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("click", onClick);
      window.removeEventListener("resize", onResize);
      document.documentElement.classList.remove("cursor-armed");
    };
  }, [viewRef, cardRef]);

  return <canvas className="story-map" ref={canvasRef} aria-hidden="true" />;
}
