// A small hand-written 3D engine for the geek-mode constellation: a 3D force
// layout, perspective projection with depth cues, drag-to-rotate with inertia,
// slow auto-rotation, and fly-to on selection. Plain canvas 2D; no 3D library.
import { CLUSTERS, EDGES, NODES } from "../data/graph.js";
import { cssRgb, prefersReducedMotion } from "./util.js";

// Cluster homes on a sphere; the middle stays clear for the background sun.
const ANCHORS = {
  create: [-0.78, -0.3, 0.3],
  agent: [0.05, -0.8, -0.2],
  web3: [0.8, -0.26, 0.3],
  life: [0.66, 0.46, -0.34],
  infra: [0.02, 0.78, 0.34],
  blog: [-0.72, 0.42, -0.36],
};
const MONO = '"SFMono-Regular", "JetBrains Mono", Menlo, Consolas, monospace';
const FALLBACK_RGB = { create: "255, 135, 95", agent: "108, 255, 189", web3: "185, 140, 255", life: "114, 201, 255", infra: "170, 182, 178", blog: "255, 180, 114" };
const CAMERA_DISTANCE = 3.2;
const FOCAL = 2.6;
const AUTO_SPIN = 0.0011;

export const nodeRadius = (node) =>
  node.type === "project" ? (node.live ? 7 : 5.5) : node.type === "infra" ? 8 : node.type === "hub" ? 9.5 : 5.5;

export const neighbors = (id) => EDGES.filter((edge) => edge.from === id || edge.to === id);

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const angleTo = (from, to) => Math.atan2(Math.sin(to - from), Math.cos(to - from));

export function createConstellation({ canvas, stage, viewRef }) {
  const context = canvas.getContext("2d");
  const reduceMotion = prefersReducedMotion();
  let width = 0;
  let height = 0;
  let frameId = 0;
  let running = false;
  let frame = 0;
  let revealStart = null;
  let colors = { ...FALLBACK_RGB, text: "242, 247, 245" };
  let lastSelected = null;
  let drag = null;

  const nodes = NODES.map((node) => {
    const [ax, ay, az] = ANCHORS[node.cluster];
    return { ...node, x: ax + (Math.random() - 0.5) * 0.3, y: ay + (Math.random() - 0.5) * 0.3, z: az + (Math.random() - 0.5) * 0.3, vx: 0, vy: 0, vz: 0, p: null };
  });
  const byId = Object.fromEntries(nodes.map((node) => [node.id, node]));
  const edges = EDGES.map((edge) => ({ ...edge, a: byId[edge.from], b: byId[edge.to], dots: [Math.random(), (Math.random() + 0.5) % 1] }));
  const view = { yaw: 0.4, pitch: -0.16, spin: 0, zoom: 1, targetYaw: null, targetPitch: null };

  const readColors = () => {
    colors = { text: cssRgb("--text", "242, 247, 245") };
    CLUSTERS.forEach(({ id }) => {
      colors[id] = cssRgb(`--c-${id}`, FALLBACK_RGB[id]);
    });
  };

  const step = () => {
    nodes.forEach((node) => {
      const [ax, ay, az] = ANCHORS[node.cluster];
      node.vx += (ax - node.x) * 0.012;
      node.vy += (ay - node.y) * 0.012;
      node.vz += (az - node.z) * 0.012;
      const d = Math.hypot(node.x, node.y, node.z) || 1;
      if (d < 0.36) {
        const push = ((0.36 - d) / 0.36) * 0.02;
        node.vx += (node.x / d) * push;
        node.vy += (node.y / d) * push;
        node.vz += (node.z / d) * push;
      }
    });
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const p = nodes[i];
        const q = nodes[j];
        const dx = q.x - p.x;
        const dy = q.y - p.y;
        const dz = q.z - p.z;
        const d = Math.hypot(dx, dy, dz) || 1;
        if (d < 0.44) {
          const force = ((0.44 - d) / 0.44) * 0.006;
          p.vx -= (dx / d) * force;
          p.vy -= (dy / d) * force;
          p.vz -= (dz / d) * force;
          q.vx += (dx / d) * force;
          q.vy += (dy / d) * force;
          q.vz += (dz / d) * force;
        }
      }
    }
    edges.forEach((edge) => {
      const rest = edge.kind === "host" ? 0.7 : edge.kind === "learn" ? 0.46 : 0.36;
      const stiffness = edge.kind === "host" ? 0.0008 : edge.kind === "learn" ? 0.004 : 0.01;
      const dx = edge.b.x - edge.a.x;
      const dy = edge.b.y - edge.a.y;
      const dz = edge.b.z - edge.a.z;
      const d = Math.hypot(dx, dy, dz) || 1;
      const force = (d - rest) * stiffness;
      edge.a.vx += (dx / d) * force;
      edge.a.vy += (dy / d) * force;
      edge.a.vz += (dz / d) * force;
      edge.b.vx -= (dx / d) * force;
      edge.b.vy -= (dy / d) * force;
      edge.b.vz -= (dz / d) * force;
    });
    nodes.forEach((node) => {
      node.vx *= 0.86;
      node.vy *= 0.86;
      node.vz *= 0.86;
      node.x += node.vx;
      node.y += node.vy;
      node.z += node.vz;
    });
  };
  for (let i = 0; i < 420; i += 1) step();

  // Rotate (yaw around Y, then pitch around X) and project with perspective.
  const project = (node) => {
    const cy = Math.cos(view.yaw);
    const sy = Math.sin(view.yaw);
    const cp = Math.cos(view.pitch);
    const sp = Math.sin(view.pitch);
    const x1 = node.x * cy + node.z * sy;
    const z1 = -node.x * sy + node.z * cy;
    const y2 = node.y * cp - z1 * sp;
    const z2 = node.y * sp + z1 * cp;
    const scale = (FOCAL / (CAMERA_DISTANCE - z2)) * view.zoom;
    const reach = Math.min(width, height) * (width < 520 ? 0.56 : 0.6);
    const stretch = clamp(width / height, 1, 1.45);
    return { x: width / 2 + x1 * scale * reach * stretch, y: height / 2 + y2 * scale * reach, scale, z: z2 };
  };
  const depthFade = (z) => 0.32 + 0.68 * clamp((z + 1.1) / 2.2, 0, 1);

  const pickNode = (x, y) => {
    let best = null;
    let bestScore = 24;
    nodes.forEach((node) => {
      if (!node.p) return;
      const score = Math.hypot(node.p.x - x, node.p.y - y) - node.p.z * 4;
      if (score < bestScore) {
        bestScore = score;
        best = node;
      }
    });
    return best;
  };

  // Bring the node to the front, but stop short of dead center so it lands beside
  // the sun instead of behind it.
  const flyTo = (node) => {
    const r = Math.hypot(node.x, node.z) || 1;
    view.targetYaw = Math.atan2(-node.x, node.z) - 0.6;
    view.targetPitch = clamp(Math.atan2(node.y, r) * 0.35, -0.6, 0.6);
  };

  const draw = (time) => {
    const state = viewRef.current;
    const { hoverId: hover, selectedId: selected, cluster: onlyCluster, liveOnly: onlyLive, label: nameOf, center } = state;
    const reveal = reduceMotion ? 1 : revealStart === null ? 0 : Math.min(1, (time - revealStart) / 1800);

    // Rotation: fly to a newly selected node, otherwise inertia plus a slow idle spin.
    if (selected !== lastSelected) {
      lastSelected = selected;
      if (selected && byId[selected]) flyTo(byId[selected]);
      else view.targetYaw = view.targetPitch = null;
    }
    if (!drag) {
      if (view.targetYaw !== null) {
        view.yaw += angleTo(view.yaw, view.targetYaw) * (reduceMotion ? 1 : 0.08);
        view.pitch += (view.targetPitch - view.pitch) * (reduceMotion ? 1 : 0.08);
      } else {
        view.yaw += view.spin;
        view.spin *= 0.94;
        if (!reduceMotion && !hover && !selected && Math.abs(view.spin) < AUTO_SPIN) view.yaw += AUTO_SPIN;
      }
    }
    view.zoom += ((selected ? 1.14 : 1) - view.zoom) * 0.08;

    nodes.forEach((node) => {
      node.p = project(node);
    });

    const focus = byId[hover] ?? byId[selected] ?? null;
    const linked = focus ? new Set([focus.id, ...neighbors(focus.id).flatMap((edge) => [edge.from, edge.to])]) : null;
    const alphaOf = (node) => {
      if (linked) return linked.has(node.id) ? 1 : 0.12;
      let alpha = 1;
      if (onlyCluster && node.cluster !== onlyCluster) alpha = 0.15;
      if (onlyLive && node.type === "project" && !node.live) alpha = 0.15;
      return alpha;
    };

    context.clearRect(0, 0, width, height);

    // Center marker; the sun from the background canvas sits right here.
    context.strokeStyle = `rgba(${colors.text}, 0.1)`;
    context.setLineDash([3, 6]);
    context.beginPath();
    context.ellipse(width / 2, height / 2, Math.min(width, height) * 0.16, Math.min(width, height) * 0.16 * Math.abs(Math.cos(view.pitch)) + 4, 0, 0, Math.PI * 2);
    context.stroke();
    context.setLineDash([]);
    context.font = `12px ${MONO}`;
    context.textAlign = "center";
    context.fillStyle = `rgba(${colors.text}, 0.62)`;
    context.fillText(center, width / 2, height / 2 + 44);

    // Edges, far ones first; they grow out during the first-view reveal.
    const sortedEdges = edges.map((edge, index) => ({ edge, index, z: (edge.a.p.z + edge.b.p.z) / 2 })).sort((a, b) => a.z - b.z);
    sortedEdges.forEach(({ edge, index, z }) => {
      const grow = Math.max(0, Math.min(1, reveal * 1.8 - (index / edges.length) * 0.8));
      if (grow <= 0) return;
      const touchesFocus = focus && (edge.a === focus || edge.b === focus);
      const alpha = (linked ? (touchesFocus ? 1 : 0.05) : Math.min(alphaOf(edge.a), alphaOf(edge.b))) * depthFade(z);
      const rgb = edge.kind === "learn" ? colors.blog : edge.kind === "host" ? colors.infra : colors[edge.a.cluster];
      const base = edge.kind === "host" ? 0.14 : edge.kind === "learn" ? 0.34 : 0.55;
      const a = edge.a.p;
      const b = edge.b.p;
      context.setLineDash(edge.kind === "learn" ? [3, 4] : []);
      context.lineWidth = edge.kind === "flow" ? 1.4 : 1;
      context.strokeStyle = `rgba(${rgb}, ${base * alpha})`;
      context.beginPath();
      context.moveTo(a.x, a.y);
      context.lineTo(a.x + (b.x - a.x) * grow, a.y + (b.y - a.y) * grow);
      context.stroke();
      context.setLineDash([]);
      if (edge.kind === "flow" && grow >= 1) {
        if (!reduceMotion) edge.dots = edge.dots.map((value) => (value + 0.0042) % 1);
        context.globalCompositeOperation = "lighter";
        edge.dots.forEach((value) => {
          context.fillStyle = `rgba(${rgb}, ${0.95 * alpha})`;
          context.beginPath();
          context.arc(a.x + (b.x - a.x) * value, a.y + (b.y - a.y) * value, (touchesFocus ? 2.6 : 1.9) * a.scale, 0, Math.PI * 2);
          context.fill();
        });
        context.globalCompositeOperation = "source-over";
      }
    });

    // Nodes, far to near, sized and faded by depth.
    [...nodes].sort((a, b) => a.p.z - b.p.z).forEach((node) => {
      const p = node.p;
      const fade = depthFade(p.z);
      const alpha = alphaOf(node) * Math.min(1, reveal * 2.5) * fade;
      const rgb = colors[node.cluster];
      const r = nodeRadius(node) * p.scale;
      if (node.live && node.type === "project") {
        const pulse = reduceMotion ? 0 : Math.sin(time / 600 + node.x * 5) * 1.5;
        const glow = context.createRadialGradient(p.x, p.y, 0, p.x, p.y, r + 12 + pulse);
        glow.addColorStop(0, `rgba(${rgb}, ${0.35 * alpha})`);
        glow.addColorStop(1, `rgba(${rgb}, 0)`);
        context.globalCompositeOperation = "lighter";
        context.fillStyle = glow;
        context.beginPath();
        context.arc(p.x, p.y, r + 12 + pulse, 0, Math.PI * 2);
        context.fill();
        context.globalCompositeOperation = "source-over";
      }
      if (node.type === "topic" || node.type === "hub") {
        context.strokeStyle = `rgba(${rgb}, ${alpha})`;
        context.lineWidth = 1.6;
        context.beginPath();
        context.arc(p.x, p.y, r, 0, Math.PI * 2);
        context.stroke();
        if (node.type === "hub") {
          context.fillStyle = `rgba(${rgb}, ${0.25 * alpha})`;
          context.fill();
        }
      } else if (node.type === "infra") {
        context.strokeStyle = `rgba(${rgb}, ${alpha})`;
        context.lineWidth = 1.4;
        context.strokeRect(p.x - r, p.y - r, r * 2, r * 2);
        context.fillStyle = `rgba(${rgb}, ${0.15 * alpha})`;
        context.fillRect(p.x - r, p.y - r, r * 2, r * 2);
      } else {
        context.fillStyle = `rgba(${rgb}, ${alpha})`;
        context.beginPath();
        context.arc(p.x, p.y, r, 0, Math.PI * 2);
        context.fill();
      }
      if (node === focus) {
        context.strokeStyle = `rgba(${rgb}, 0.9)`;
        context.lineWidth = 1;
        context.beginPath();
        context.arc(p.x, p.y, r + 8, 0, Math.PI * 2);
        context.stroke();
      }
      const compact = width < 520;
      if (compact && node.type === "topic" && !(linked && linked.has(node.id))) return;
      context.font = `${Math.round((compact ? 9.5 : 10.5) + p.scale * 1.5)}px ${MONO}`;
      context.fillStyle = `rgba(${colors.text}, ${alpha * (node === focus ? 1 : 0.78)})`;
      const text = nameOf(node);
      const half = context.measureText(text).width / 2 + 4;
      context.fillText(text, Math.min(Math.max(p.x, half), width - half), p.y + r + 14);
    });
  };

  const loop = (time) => {
    if (frame++ % 30 === 0) readColors();
    step();
    draw(time);
    frameId = running ? window.requestAnimationFrame(loop) : 0;
  };
  const start = () => {
    if (running) return;
    running = true;
    if (revealStart === null) revealStart = performance.now();
    frameId = window.requestAnimationFrame(loop);
  };
  const stop = () => {
    running = false;
    window.cancelAnimationFrame(frameId);
  };

  const resize = () => {
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    if (!width || !height) return;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    readColors();
    draw(performance.now());
  };

  const position = (event) => {
    const rect = canvas.getBoundingClientRect();
    return [event.clientX - rect.left, event.clientY - rect.top];
  };
  const onPointerDown = (event) => {
    const [x, y] = position(event);
    drag = { x, y, startX: x, startY: y, moved: false, touch: event.pointerType !== "mouse" };
    canvas.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event) => {
    const [x, y] = position(event);
    if (drag) {
      const dx = x - drag.x;
      const dy = drag.touch ? 0 : y - drag.y;
      if (Math.hypot(x - drag.startX, y - drag.startY) > 5) drag.moved = true;
      if (drag.moved) {
        view.targetYaw = view.targetPitch = null;
        view.yaw += dx * 0.008;
        view.pitch = clamp(view.pitch + dy * 0.006, -1.1, 1.1);
        view.spin = dx * 0.008;
      }
      drag.x = x;
      drag.y = y;
      return;
    }
    const node = pickNode(x, y);
    document.documentElement.classList.toggle("cursor-armed", Boolean(node));
    viewRef.current.setHover(node?.id ?? null);
  };
  const onPointerUp = (event) => {
    if (!drag) return;
    if (!drag.moved) {
      const [x, y] = position(event);
      const node = pickNode(x, y);
      const { selectedId: current, onSelect } = viewRef.current;
      onSelect(node ? (node.id === current ? null : node.id) : null);
    }
    drag = null;
  };
  const onPointerLeave = () => {
    document.documentElement.classList.remove("cursor-armed");
    viewRef.current.setHover(null);
  };
  const onPointerCancel = () => {
    drag = null;
  };

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointerleave", onPointerLeave);
  canvas.addEventListener("pointercancel", onPointerCancel);
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(stage);
  const visibility = new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop()));
  visibility.observe(stage);

  return () => {
    stop();
    resizeObserver.disconnect();
    visibility.disconnect();
    canvas.removeEventListener("pointerdown", onPointerDown);
    canvas.removeEventListener("pointermove", onPointerMove);
    canvas.removeEventListener("pointerup", onPointerUp);
    canvas.removeEventListener("pointerleave", onPointerLeave);
    canvas.removeEventListener("pointercancel", onPointerCancel);
    document.documentElement.classList.remove("cursor-armed");
  };
}
