import { useEffect, useMemo, useRef, useState, useCallback, createContext, useContext } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Globe,
  Link2,
  Palette,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Sun,
  Moon,
} from "lucide-react";
import { useI18n } from "./i18n.jsx";
import { useTheme } from "./theme.jsx";
import {
  contacts,
  modules,
  playlist,
  profile,
} from "./data/site.js";

// 共享引力状态的 Context
const GravityContext = createContext({
  locked: false,
  cardOrbits: [],
  sunX: 0,
  sunY: 0,
  setContextState: () => {},
});

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  weekday: "long",
});

function useClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return {
    date: dateFormatter.format(now).replaceAll("/", " 年 ").replace("日", "日 "),
    time: now.toLocaleTimeString("zh-CN", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
  };
}

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const smoothstep = (edge0, edge1, value) => {
  const t = clamp((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};

function AmbientCanvas({ oRef }) {
  const canvasRef = useRef(null);
  const gravityState = useContext(GravityContext);
  const gravityRef = useRef(gravityState);

  useEffect(() => {
    gravityRef.current = gravityState;
  }, [gravityState]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    let width = 0;
    let height = 0;
    let frameId = 0;
    let resizeTimer = 0;
    let startTime = performance.now();
    let visualProgress = 0;
    let stars = [];
    let meteors = [];
    let lastMeteorTime = 0;

    const spawnMeteor = () => {
      const size = Math.random() * 1.4 + 0.8;
      const speed = Math.random() * 8 + 6;
      const tail = Math.random() * 120 + 80;
      const startX = width * (0.4 + Math.random() * 0.7);
      const startY = -30 - Math.random() * 120;
      meteors.push({
        x: startX,
        y: startY,
        vx: -speed * 0.55,
        vy: speed,
        size,
        tail,
        life: 1,
      });
    };

    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const count = Math.max(60, Math.floor((width * height) / 8000));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.3 + 0.2,
        twinkle: Math.random() * Math.PI * 2,
        twinkleSpeed: Math.random() * 0.8 + 0.3,
      }));
    };

    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(resize, 120);
    };

    const getColor = (name, alpha = 1) => {
      const hex = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      if (!hex) return `rgba(108, 255, 189, ${alpha})`;
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    const draw = () => {
      const now = performance.now();
      const elapsed = (now - startTime) / 1000;
      const primary = getColor("--primary");
      const primarySoft = getColor("--primary", 0.55);
      const primary0 = getColor("--primary", 0);
      const secondary = getColor("--secondary");
      const accent = getColor("--accent");
      const starColor = getColor("--text", 0.8);

      context.clearRect(0, 0, width, height);
      context.fillStyle = "rgba(5, 7, 8, 0.32)";
      context.fillRect(0, 0, width, height);

      stars.forEach((star) => {
        const twinkle = 0.4 + Math.sin(elapsed * star.twinkleSpeed + star.twinkle) * 0.3 + 0.3;
        context.fillStyle = starColor.replace(/[\d.]+\)$/, `${twinkle})`);
        context.beginPath();
        context.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        context.fill();
      });

      // 每隔 1.5~4 秒生成一颗流星
      const interval = 1500 + Math.random() * 2500;
      if (now - lastMeteorTime > interval) {
        spawnMeteor();
        lastMeteorTime = now;
      }

      meteors = meteors.filter((meteor) => {
        meteor.x += meteor.vx;
        meteor.y += meteor.vy;

        const tailX = meteor.x - meteor.vx * meteor.tail / Math.hypot(meteor.vx, meteor.vy);
        const tailY = meteor.y - meteor.vy * meteor.tail / Math.hypot(meteor.vx, meteor.vy);

        const gradient = context.createLinearGradient(meteor.x, meteor.y, tailX, tailY);
        gradient.addColorStop(0, "rgba(230, 255, 245, 0.95)");
        gradient.addColorStop(0.3, primarySoft);
        gradient.addColorStop(1, primary0);

        context.strokeStyle = gradient;
        context.lineWidth = meteor.size;
        context.lineCap = "round";
        context.beginPath();
        context.moveTo(meteor.x, meteor.y);
        context.lineTo(tailX, tailY);
        context.stroke();

        const headGlow = context.createRadialGradient(
          meteor.x, meteor.y, 0,
          meteor.x, meteor.y, meteor.size * 5,
        );
        headGlow.addColorStop(0, "rgba(250, 255, 252, 0.85)");
        headGlow.addColorStop(1, primary0);
        context.fillStyle = headGlow;
        context.beginPath();
        context.arc(meteor.x, meteor.y, meteor.size * 5, 0, Math.PI * 2);
        context.fill();

        return meteor.x > -200 && meteor.y < height + 200;
      });

      // 太阳位置：从 Mosu 的 "o" 平滑移动到屏幕中心。
      const latestGravity = gravityRef.current ?? {};
      visualProgress += ((latestGravity.progress || 0) - visualProgress) * 0.075;
      const p = smoothstep(0, 1, visualProgress);
      let sourceX = width * 0.2;
      let sourceY = Math.max(170, height * 0.28);
      if (oRef?.current) {
        const rect = oRef.current.getBoundingClientRect();
        sourceX = rect.left + rect.width / 2;
        sourceY = rect.top + rect.height * 0.55;
      }
      const centerX = sourceX + (width * 0.5 - sourceX) * p;
      const centerY = sourceY + (height * 0.5 - sourceY) * p;

      // 轨道从侧视扁椭圆自然转成俯视圆轨道。
      const orbitScale = Math.min(width, height) / 720;
      const baseOrbitA = Math.max(136, 218 * orbitScale);
      const baseOrbitB = Math.max(48, 82 * orbitScale);
      const finalOrbit = Math.min(width, height) * 0.32;
      const orbitA = baseOrbitA + (finalOrbit - baseOrbitA) * p;
      const orbitB = baseOrbitB + (finalOrbit - baseOrbitB) * p;
      const baseTilt = -0.42;
      const tilt = baseTilt + (0 - baseTilt) * p;
      const sizeScale = 1 + p * 0.2;
      const speedBoost = 1 + p * 0.5;
      const earthAngle = elapsed * 0.4 * speedBoost;
      const marsAngle = elapsed * 0.22 * speedBoost + 1.7;

      const drawOrbit = (radiusX, radiusY, alpha) => {
        context.save();
        context.translate(centerX, centerY);
        context.rotate(tilt);
        context.strokeStyle = accent.replace(/[\d.]+\)$/, `${alpha + p * 0.3})`);
        context.lineWidth = 1 + p;
        context.setLineDash([7, 10]);
        context.beginPath();
        context.ellipse(0, 0, radiusX * sizeScale, radiusY * sizeScale, 0, 0, Math.PI * 2);
        context.stroke();
        context.restore();
      };

      const pointOnOrbit = (radiusX, radiusY, angle) => {
        const x = Math.cos(angle) * radiusX * sizeScale;
        const y = Math.sin(angle) * radiusY * sizeScale;
        const rotatedX = x * Math.cos(tilt) - y * Math.sin(tilt);
        const rotatedY = x * Math.sin(tilt) + y * Math.cos(tilt);
        return { x: centerX + rotatedX, y: centerY + rotatedY };
      };

      drawOrbit(orbitA, orbitB, 0.28);
      drawOrbit(orbitA * 1.38, orbitB * 1.36, 0.14);

      const sunSize = 8.5 * (1 + p * 2.15);
      const sunGlowSize = 92 * (1 + p * 1.6);
      const sunGlow = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, sunGlowSize);
      sunGlow.addColorStop(0, getColor("--primary", 0.82 + p * 0.1));
      sunGlow.addColorStop(0.4, getColor("--primary", 0.18 + p * 0.15));
      sunGlow.addColorStop(1, getColor("--primary", 0));
      context.fillStyle = sunGlow;
      context.beginPath();
      context.arc(centerX, centerY, sunGlowSize, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "rgba(236, 255, 247, 0.95)";
      context.beginPath();
      context.arc(centerX, centerY, sunSize, 0, Math.PI * 2);
      context.fill();

      const earth = pointOnOrbit(orbitA, orbitB, earthAngle);
      const mars = pointOnOrbit(orbitA * 1.38, orbitB * 1.36, marsAngle);
      const moon = {
        x: earth.x + Math.cos(elapsed * 1.1) * 22 * sizeScale,
        y: earth.y + Math.sin(elapsed * 1.1) * 10 * sizeScale,
      };

      const planetScale = 1 + p * 0.8;

      context.strokeStyle = "rgba(242, 247, 245, 0.18)";
      context.beginPath();
      context.arc(earth.x, earth.y, 22 * sizeScale, 0, Math.PI * 2);
      context.stroke();
      context.fillStyle = secondary;
      context.beginPath();
      context.arc(earth.x, earth.y, 8 * planetScale, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "rgba(242, 247, 245, 0.8)";
      context.beginPath();
      context.arc(moon.x, moon.y, 3.5 * planetScale, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "rgba(255, 135, 95, 0.65)";
      context.beginPath();
      context.arc(mars.x, mars.y, 5 * planetScale, 0, Math.PI * 2);
      context.fill();

      // 被吸收的卡片光点围绕太阳旋转（progress 越高越明显）
      if (p > 0.5 && (latestGravity.cardOrbits?.length ?? 0) > 0) {
        const orbitTime = elapsed * 0.6;
        const glowOpacity = Math.min(1, (p - 0.5) / 0.5);
        latestGravity.cardOrbits.forEach((orbit, i) => {
          const angle = orbit.angle + orbitTime * (0.8 + i * 0.15);
          const orbitRadius = (orbit.radius || Math.min(width, height) * 0.34) * sizeScale;
          const x = centerX + Math.cos(angle) * orbitRadius;
          const y = centerY + Math.sin(angle) * orbitRadius;

          // 光点发光效果
          const glowSize = (14 + Math.sin(elapsed * 3 + i) * 4) * (1 + p * 0.5);
          const glow = context.createRadialGradient(x, y, 0, x, y, glowSize);
          glow.addColorStop(0, primary);
          glow.addColorStop(0.5, primary.replace(/[\d.]+\)$/, `${0.4 * glowOpacity})`));
          glow.addColorStop(1, primary.replace(/[\d.]+\)$/, "0)"));
          context.fillStyle = glow;
          context.beginPath();
          context.arc(x, y, glowSize, 0, Math.PI * 2);
          context.fill();

          // 核心亮点
          context.fillStyle = `rgba(255, 255, 255, ${0.7 + glowOpacity * 0.2})`;
          context.beginPath();
          context.arc(x, y, 3 + p * 2, 0, Math.PI * 2);
          context.fill();

          // 连接线到太阳（progress 越高越明显）
          if (p > 0.7) {
            const lineAlpha = (0.15 + Math.sin(elapsed * 2 + i) * 0.08) * glowOpacity;
            context.strokeStyle = primary.replace(/[\d.]+\)$/, `${lineAlpha})`);
            context.setLineDash([]);
            context.lineWidth = 1;
            context.beginPath();
            context.moveTo(centerX, centerY);
            context.lineTo(x, y);
            context.stroke();
            context.setLineDash([7, 10]);
          }
        });
      }

      frameId = window.requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", onResize);
    draw();

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas className="ambient-canvas" ref={canvasRef} aria-hidden="true" />;
}

function CustomCursor() {
  const dotRef = useRef(null);
  const ringRef = useRef(null);

  useEffect(() => {
    const media = window.matchMedia("(pointer: fine)");
    if (!media.matches) return undefined;

    let frameId = 0;
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let ringX = targetX;
    let ringY = targetY;

    const commit = () => {
      ringX += (targetX - ringX) * 0.22;
      ringY += (targetY - ringY) * 0.22;
      dotRef.current?.style.setProperty("transform", `translate3d(${targetX}px, ${targetY}px, 0)`);
      ringRef.current?.style.setProperty("transform", `translate3d(${ringX}px, ${ringY}px, 0)`);
      frameId = window.requestAnimationFrame(commit);
    };

    const onMove = (event) => {
      targetX = event.clientX;
      targetY = event.clientY;
    };

    const onOver = (event) => {
      if (event.target.closest("button, a")) {
        document.documentElement.classList.add("cursor-armed");
      }
    };

    const onOut = (event) => {
      if (event.target.closest("button, a")) {
        document.documentElement.classList.remove("cursor-armed");
      }
    };

    window.addEventListener("pointermove", onMove);
    document.addEventListener("pointerover", onOver);
    document.addEventListener("pointerout", onOut);
    commit();

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerout", onOut);
      document.documentElement.classList.remove("cursor-armed");
    };
  }, []);

  return (
    <>
      <span className="cursor-dot" ref={dotRef} aria-hidden="true" />
      <span className="cursor-ring" ref={ringRef} aria-hidden="true" />
    </>
  );
}

function useKonami(onActivate) {
  const sequence = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
  const [active, setActive] = useState(false);
  const posRef = useRef(0);
  const timerRef = useRef(0);

  useEffect(() => {
    const onKeyDown = (event) => {
      const target = event.target;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      const expected = sequence[posRef.current];
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      if (key === expected) {
        posRef.current += 1;
        if (posRef.current === sequence.length) {
          posRef.current = 0;
          setActive(true);
          onActivate?.();
          window.clearTimeout(timerRef.current);
          timerRef.current = window.setTimeout(() => setActive(false), 3200);
        }
      } else {
        posRef.current = event.key === sequence[0] ? 1 : 0;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(timerRef.current);
    };
  }, [onActivate]);

  return active;
}

function Terminal({ open, onClose }) {
  const { toggleMode, cycleColor, mode } = useTheme();
  const [input, setInput] = useState("");
  const [history, setHistory] = useState([]);
  const [cmdHistory, setCmdHistory] = useState([]);
  const [histIdx, setHistIdx] = useState(-1);
  const inputRef = useRef(null);
  const scrollRef = useRef(null);

  const addLine = (prompt, output, type = "output") => {
    setHistory((h) => [...h, { prompt, output, type }]);
  };

  const runCommand = (raw) => {
    const cmd = raw.trim();
    if (!cmd) {
      addLine("", "");
      return;
    }
    setCmdHistory((h) => [...h, cmd]);
    setHistIdx(-1);

    const [name, ...args] = cmd.split(/\s+/);
    const arg = args.join(" ");

    switch (name.toLowerCase()) {
      case "help":
        addLine(
          cmd,
          [
            "可用命令：",
            "  help          显示帮助",
            "  whoami        查看个人信息",
            "  ls            列出所有模块",
            "  cd <模块>     跳转到指定模块",
            "  theme         切换主题色",
            "  mode          切换深色/浅色模式",
            "  date          显示当前时间",
            "  echo <文本>   回显文本",
            "  sudo rm -rf / 试试？",
            "  clear         清屏",
            "  exit          关闭终端",
            "  按 ~ 或 Esc 也可以关闭",
          ].join("\n"),
        );
        break;

      case "whoami":
        addLine(
          cmd,
          `${profile.handle} - ${profile.status}\n${profile.quote}`,
        );
        break;

      case "ls":
        addLine(
          cmd,
          modules.map((m) => `  ${m.id.padEnd(12)} ${m.title}`).join("\n"),
        );
        break;

      case "cd": {
        if (!arg) {
          addLine(cmd, "usage: cd <module>");
          break;
        }
        const target = modules.find((m) => m.id.toLowerCase() === arg.toLowerCase());
        if (target) {
          addLine(cmd, `正在跳转至 ${target.title}...`);
          if (target.href && target.href !== "#") {
            window.setTimeout(() => { window.location.href = target.href; }, 400);
          }
        } else {
          addLine(cmd, `cd: 没有找到模块 "${arg}"`);
        }
        break;
      }

      case "theme":
        cycleColor();
        addLine(cmd, "主题色已切换 ✨");
        break;

      case "mode":
        toggleMode();
        addLine(cmd, `已切换到 ${mode === "dark" ? "浅色" : "深色"}模式`);
        break;

      case "date":
        addLine(cmd, new Date().toLocaleString("zh-CN"));
        break;

      case "echo":
        addLine(cmd, arg || "");
        break;

      case "sudo":
        if (arg === "rm -rf /") {
          addLine(cmd, "⚠️  警告：你确定要格式化整个宇宙吗？");
          window.setTimeout(() => {
            document.body.style.animation = "none";
            document.body.offsetHeight;
            document.body.style.animation = "konamiShake 0.18s ease-in-out 10";
          }, 300);
        } else {
          addLine(cmd, `sudo: 未知命令 "${arg}"`);
        }
        break;

      case "clear":
        setHistory([]);
        break;

      case "exit":
      case "quit":
        onClose?.();
        break;

      default:
        addLine(cmd, `command not found: ${name}。输入 help 查看可用命令。`);
    }
  };

  const onKeyDown = (event) => {
    if (event.key === "Enter") {
      runCommand(input);
      setInput("");
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (cmdHistory.length === 0) return;
      const next = histIdx < 0 ? cmdHistory.length - 1 : Math.max(0, histIdx - 1);
      setHistIdx(next);
      setInput(cmdHistory[next] ?? "");
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      if (histIdx < 0) return;
      const next = histIdx + 1;
      if (next >= cmdHistory.length) {
        setHistIdx(-1);
        setInput("");
      } else {
        setHistIdx(next);
        setInput(cmdHistory[next] ?? "");
      }
    } else if (event.key === "Escape") {
      onClose?.();
    } else if (event.key === "l" && event.ctrlKey) {
      event.preventDefault();
      setHistory([]);
    }
  };

  useEffect(() => {
    if (open) {
      addLine("系统", `欢迎来到 ${profile.handle} 终端 v1.0\n输入 help 查看所有命令。`);
      window.setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setHistory([]);
      setInput("");
    }
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  if (!open) return null;

  return (
    <div className="terminal-overlay" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="terminal-window">
        <div className="terminal-header">
          <div className="terminal-dots">
            <span className="td td-red" />
            <span className="td td-yellow" />
            <span className="td td-green" />
          </div>
          <span className="terminal-title">mosu@homepage ~ zsh</span>
          <button
            type="button"
            className="terminal-close"
            onClick={onClose}
            aria-label="关闭终端"
          >
            ×
          </button>
        </div>
        <div className="terminal-body" ref={scrollRef}>
          {history.map((item, idx) => (
            <div key={idx} className="terminal-line">
              {item.prompt && (
                <div className="term-prompt">
                  <span className="term-user">mosu</span>
                  <span className="term-at">@</span>
                  <span className="term-host">homepage</span>
                  <span className="term-colon">:</span>
                  <span className="term-path">~</span>
                  <span className="term-dollar">$</span>
                  <span className="term-cmd">{item.prompt}</span>
                </div>
              )}
              {item.output && (
                <pre className="term-output">{item.output}</pre>
              )}
            </div>
          ))}
          <div className="term-prompt term-input-line">
            <span className="term-user">mosu</span>
            <span className="term-at">@</span>
            <span className="term-host">homepage</span>
            <span className="term-colon">:</span>
            <span className="term-path">~</span>
            <span className="term-dollar">$</span>
            <input
              ref={inputRef}
              className="term-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function useTypewriter(lines, { typeSpeed = 65, eraseSpeed = 40, pauseTime = 2400 } = {}) {
  const [text, setText] = useState("");
  const [lineIndex, setLineIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    if (!lines?.length) return undefined;
    const currentLine = lines[lineIndex];
    let timer = 0;

    if (isTyping) {
      if (text.length < currentLine.length) {
        timer = window.setTimeout(() => {
          setText(currentLine.slice(0, text.length + 1));
        }, typeSpeed);
      } else {
        timer = window.setTimeout(() => setIsTyping(false), pauseTime);
      }
    } else if (text.length > 0) {
      timer = window.setTimeout(() => {
        setText(currentLine.slice(0, text.length - 1));
      }, eraseSpeed);
    } else {
      setLineIndex((idx) => (idx + 1) % lines.length);
      setIsTyping(true);
    }

    return () => window.clearTimeout(timer);
  }, [text, isTyping, lineIndex, lines, typeSpeed, eraseSpeed, pauseTime]);

  return text;
}

function useGravity({ sunRef }) {
  const [gravity, setGravity] = useState({
    active: false,
    locked: false,
    progress: 0,
    sunX: 0,
    sunY: 0,
    centerX: 0,
    centerY: 0,
    mouseX: 0,
    mouseY: 0,
  });

  useEffect(() => {
    const updatePositions = () => {
      if (!sunRef?.current) return;
      const rect = sunRef.current.getBoundingClientRect();
      const originalSunX = rect.left + rect.width / 2;
      const originalSunY = rect.top + rect.height * 0.55;
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      setGravity((prev) => ({
        ...prev,
        sunX: originalSunX,
        sunY: originalSunY,
        centerX,
        centerY,
      }));
    };

    updatePositions();
    window.addEventListener("resize", updatePositions);
    window.addEventListener("scroll", updatePositions);

    const onMouseMove = (e) => {
      if (!sunRef?.current) return;

      const rect = sunRef.current.getBoundingClientRect();
      const originalSunX = rect.left + rect.width / 2;
      const originalSunY = rect.top + rect.height * 0.55;
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;

      const dx = e.clientX - originalSunX;
      const dy = e.clientY - originalSunY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      const minSide = Math.min(window.innerWidth, window.innerHeight);
      const lockRadius = Math.max(42, rect.width * 2.25);
      const gravityRadius = Math.max(minSide * 0.72, rect.width * 14);

      const inLockZone = distance < lockRadius;
      const inGravityField = distance < gravityRadius;

      let progress = 0;
      if (inLockZone) {
        progress = 1;
      } else if (inGravityField) {
        progress = Math.pow(1 - (distance - lockRadius) / (gravityRadius - lockRadius), 1.8);
      }

      setGravity((prev) => ({
        ...prev,
        active: inGravityField,
        locked: inLockZone,
        progress,
        sunX: originalSunX,
        sunY: originalSunY,
        centerX,
        centerY,
        mouseX: e.clientX,
        mouseY: e.clientY,
      }));
    };

    window.addEventListener("mousemove", onMouseMove);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", updatePositions);
      window.removeEventListener("scroll", updatePositions);
    };
  }, [sunRef]);

  return gravity;
}

function SectorInfoPanel({ quote, onNextQuote }) {
  const [faded, setFaded] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setFaded(true), 5000);
    return () => window.clearTimeout(timer);
  }, []);

  const [count, setCount] = useState(0);

  useEffect(() => {
    const key = "mosu-visitor-count";
    const stored = Number(window.localStorage?.getItem(key) || "0");
    const base = stored > 0 ? stored : 1024 + Math.floor(Math.random() * 500);
    const next = base + 1;
    window.localStorage?.setItem(key, String(next));
    setCount(next);
  }, []);

  const display = String(count).padStart(7, "0");

  return (
    <div className={`sector-info-panel ${faded ? "faded" : ""}`}>
      <div className="sip-header">
        <span className="sip-star">✦</span>
        <span className="sip-label">SECTOR VISITOR</span>
        <span className="sip-star">✦</span>
      </div>
      <div className="sip-digits">
        {display.split("").map((d, i) => (
          <span key={i} className="sip-digit">{d}</span>
        ))}
      </div>
      <div className="sip-count-text">
        你是当前星域第 <strong>{count.toLocaleString()}</strong> 位拜访者
      </div>
      <div className="sip-quote">
        <span className="sip-quote-mark">"</span>
        <p>{quote}</p>
        <button type="button" onClick={onNextQuote} aria-label="切换一句话">
          <RotateCcw size={12} />
          <span>换一句</span>
        </button>
      </div>
    </div>
  );
}

function GravityCards({ children, gravity, clusterRef }) {
  const frameRef = useRef(0);
  const cardDataRef = useRef([]);
  const { setContextState } = useContext(GravityContext);
  const currentProgressRef = useRef(0);
  const gravityRef = useRef(gravity);

  useEffect(() => {
    gravityRef.current = gravity;
  }, [gravity]);

  const initCards = useCallback(() => {
    if (!clusterRef?.current) return;
    const cards = clusterRef.current.querySelectorAll(".proximity-card");
    if (cards.length === 0) return;
    const minSide = Math.min(window.innerWidth, window.innerHeight);
    const ringBase = Math.max(190, Math.min(330, minSide * 0.38));

    if (cardDataRef.current.length !== cards.length) {
      cardDataRef.current = Array.from(cards, (_, i) => ({
        index: i,
        originalX: 0,
        originalY: 0,
        originalWidth: 0,
        originalHeight: 0,
        orbitAngle: (Math.PI * 2 * i) / cards.length - Math.PI / 2,
        orbitRadius: ringBase,
        currentX: 0,
        currentY: 0,
        currentOpacity: 1,
        currentOrbitAngle: (Math.PI * 2 * i) / cards.length - Math.PI / 2,
      }));
    }

    cards.forEach((card, i) => {
      const data = cardDataRef.current[i];
      const nextOrbitAngle = (Math.PI * 2 * i) / cards.length - Math.PI / 2;
      const ringJitter = i % 2 === 0 ? -12 : 12;
      data.orbitAngle = nextOrbitAngle;
      data.orbitRadius = ringBase + ringJitter;
      if (!Number.isFinite(data.currentOrbitAngle)) {
        data.currentOrbitAngle = nextOrbitAngle;
      }

      const currentTransform = card.style.transform;
      card.style.transform = "";
      const rect = card.getBoundingClientRect();
      card.style.transform = currentTransform;

      data.originalX = rect.left + rect.width / 2;
      data.originalY = rect.top + rect.height / 2;
      data.originalWidth = rect.width;
      data.originalHeight = rect.height;
      if (!card.dataset.orbitLabel) {
        card.dataset.orbitLabel = card.getAttribute("aria-label") || card.textContent?.trim() || "planet";
      }
    });
  }, [clusterRef]);

  useEffect(() => {
    initCards();

    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(initCards, 120);
    };

    window.addEventListener("resize", onResize);
    return () => {
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
    };
  }, [initCards]);

  useEffect(() => {
    if (!clusterRef?.current) return;
    const cards = clusterRef.current.querySelectorAll(".proximity-card");
    if (cards.length === 0) return;
    if (cardDataRef.current.length !== cards.length) initCards();

    if (setContextState) {
      setContextState({
        locked: gravity.locked,
        progress: gravity.progress,
        cardOrbits: cardDataRef.current.map((d) => ({
          angle: d.currentOrbitAngle,
          radius: d.orbitRadius,
        })),
        sunX: gravity.sunX,
        sunY: gravity.sunY,
        targetSunX: gravity.sunX + (gravity.centerX - gravity.sunX) * gravity.progress,
        targetSunY: gravity.sunY + (gravity.centerY - gravity.sunY) * gravity.progress,
      });
    }
  }, [gravity, clusterRef, initCards, setContextState]);

  useEffect(() => {
    if (!clusterRef?.current) return;
    initCards();

    let lastTime = performance.now();
    let orbitSpin = 0;
    const animate = (now) => {
      const delta = Math.min(2, (now - lastTime) / 16.67);
      lastTime = now;
      const cards = clusterRef.current?.querySelectorAll(".proximity-card");
      if (!cards || cards.length === 0) {
        frameRef.current = requestAnimationFrame(animate);
        return;
      }

      const latestGravity = gravityRef.current ?? {};
      const targetProgress = clamp(latestGravity.progress || 0);
      currentProgressRef.current += (targetProgress - currentProgressRef.current) * 0.065 * delta;
      const p = smoothstep(0, 1, currentProgressRef.current);
      const pullP = smoothstep(0.04, 0.72, p);
      const orbitP = smoothstep(0.55, 1, p);
      const shatterP = smoothstep(0.68, 1, p);
      orbitSpin += 0.003 * orbitP * delta;

      const sourceSunX = latestGravity.sunX || window.innerWidth * 0.28;
      const sourceSunY = latestGravity.sunY || window.innerHeight * 0.32;
      const centerX = latestGravity.centerX || window.innerWidth / 2;
      const centerY = latestGravity.centerY || window.innerHeight / 2;
      const sunX = sourceSunX + (centerX - sourceSunX) * p;
      const sunY = sourceSunY + (centerY - sourceSunY) * p;
      const minSide = Math.min(window.innerWidth, window.innerHeight);

      cards.forEach((card, i) => {
        const data = cardDataRef.current[i];
        if (!data) return;

        const targetOrbitAngle = data.orbitAngle + orbitSpin;
        const angleLerp = (0.028 + orbitP * 0.052 + shatterP * 0.12) * delta;
        data.currentOrbitAngle += (targetOrbitAngle - data.currentOrbitAngle) * angleLerp;

        const currentCenterX = data.originalX + data.currentX;
        const currentCenterY = data.originalY + data.currentY;
        const radialAngle = Math.atan2(sunY - currentCenterY, sunX - currentCenterX);
        const distanceToSun = Math.hypot(sunX - currentCenterX, sunY - currentCenterY);
        const nearFactor = clamp(1 - distanceToSun / (minSide * 0.58));
        const pullAmount = clamp(0.18 + nearFactor * 0.26 + p * 0.16 + i * 0.01, 0.18, 0.55);
        const pulledX = data.originalX + (sunX - data.originalX) * pullAmount;
        const pulledY = data.originalY + (sunY - data.originalY) * pullAmount;
        const orbitX = sunX + Math.cos(data.currentOrbitAngle) * data.orbitRadius;
        const orbitY = sunY + Math.sin(data.currentOrbitAngle) * data.orbitRadius;

        const midX = data.originalX + (pulledX - data.originalX) * pullP;
        const midY = data.originalY + (pulledY - data.originalY) * pullP;
        const targetAbsX = midX + (orbitX - midX) * orbitP;
        const targetAbsY = midY + (orbitY - midY) * orbitP;
        const targetX = targetAbsX - data.originalX;
        const targetY = targetAbsY - data.originalY;

        const lerp = (0.075 + p * 0.025 + shatterP * 0.08) * delta;
        data.currentX += (targetX - data.currentX) * lerp;
        data.currentY += (targetY - data.currentY) * lerp;
        data.currentOpacity += (1 - orbitP * 0.04 - data.currentOpacity) * lerp;

        const tearStrength = p * (0.22 + nearFactor * 1.55) * (1 - orbitP * 0.48) * (1 - shatterP * 0.28);
        const originReach = 46 * clamp(p * (0.72 + nearFactor * 0.45));
        const originX = clamp(50 - Math.cos(radialAngle) * originReach, 2, 98);
        const originY = clamp(50 - Math.sin(radialAngle) * originReach, 2, 98);

        card.style.transformOrigin = `${originX}% ${originY}%`;
        card.style.setProperty("--gravity-strength", clamp(tearStrength).toFixed(3));
        card.style.setProperty("--card-break", shatterP.toFixed(3));
        card.style.setProperty("--planet-tilt", `${Math.round((i - cards.length / 2) * 8)}`);

        const scaleLong = 1 + tearStrength * 0.74 * (1 - shatterP * 0.58);
        const scaleShort = Math.max(0.7, 1 - tearStrength * 0.2 * (1 - shatterP * 0.45));
        const baseScale = 1 - orbitP * 0.18;
        const skew = Math.min(11, tearStrength * 5.2 * (1 - shatterP * 0.65));
        const lift = Math.sin(data.currentOrbitAngle) * orbitP * 8;

        const transform = `
          translate3d(${data.currentX}px, ${data.currentY + lift}px, 0)
          rotate(${radialAngle}rad)
          scaleX(${scaleLong * baseScale})
          scaleY(${scaleShort * baseScale})
          skewX(${skew}deg)
          rotate(${-radialAngle}rad)
        `;
        card.style.transform = transform;
        card.style.opacity = data.currentOpacity;
        card.style.zIndex = p > 0.45
          ? Math.floor(180 + Math.sin(data.currentOrbitAngle) * 30 + i)
          : "";

        if (p > 0.25) {
          const glowIntensity = smoothstep(0.25, 1, p);
          card.style.filter = `drop-shadow(0 0 ${6 + glowIntensity * 14}px color-mix(in srgb, var(--primary) ${50 + glowIntensity * 30}%, transparent))`;
        } else {
          card.style.filter = "";
        }
      });

      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameRef.current);
      if (clusterRef?.current) {
        const cards = clusterRef.current.querySelectorAll(".proximity-card");
        cards.forEach((card) => {
          card.style.transform = "";
          card.style.opacity = "";
          card.style.filter = "";
          card.style.zIndex = "";
          card.style.transformOrigin = "";
          card.style.removeProperty("--gravity-strength");
          card.style.removeProperty("--card-break");
          card.style.removeProperty("--planet-tilt");
        });
      }
      cardDataRef.current = [];
    };
  }, [clusterRef, initCards]);

  return (
    <div
      className={`gravity-cards ${gravity.locked ? "locked" : ""} ${gravity.active ? "active" : ""}`}
      style={{ "--gravity-progress": gravity.progress }}
    >
      {children}
    </div>
  );
}

function MosuGravityTitle({ gravity, anchorRef }) {
  const titleRef = useRef(null);
  const gravityRef = useRef(gravity);
  const anchorCenterRef = useRef(null);

  useEffect(() => {
    gravityRef.current = gravity;
  }, [gravity]);

  useEffect(() => {
    let frameId = 0;
    let resizeTimer = 0;
    let visualProgress = 0;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const measureAnchor = () => {
      if (!anchorRef?.current) return;
      const rect = anchorRef.current.getBoundingClientRect();
      anchorCenterRef.current = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    };

    const animate = () => {
      const node = titleRef.current;
      if (!node) {
        frameId = window.requestAnimationFrame(animate);
        return;
      }

      if (!anchorCenterRef.current) measureAnchor();

      const latestGravity = gravityRef.current ?? {};
      const targetProgress = clamp(latestGravity.progress || 0);
      visualProgress += reduceMotion
        ? targetProgress - visualProgress
        : (targetProgress - visualProgress) * 0.075;

      const p = smoothstep(0, 1, visualProgress);
      const anchor = anchorCenterRef.current ?? {
        x: window.innerWidth * 0.24,
        y: window.innerHeight * 0.42,
      };
      const centerX = latestGravity.centerX || window.innerWidth / 2;
      const centerY = latestGravity.centerY || window.innerHeight / 2;
      const x = anchor.x + (centerX - anchor.x) * p;
      const y = anchor.y + (centerY - anchor.y) * p;
      const visible = smoothstep(0.08, 0.34, p);
      const scale = 0.98 - p * 0.1;
      const drift = Math.sin(performance.now() / 1200) * 4 * p;

      node.style.setProperty("--mosu-gravity-progress", p.toFixed(3));
      node.style.opacity = String(visible * (0.42 + p * 0.42));
      node.style.transform = `translate3d(${x}px, ${y + drift}px, 0) translate(-50%, -50%) scale(${scale})`;

      frameId = window.requestAnimationFrame(animate);
    };

    measureAnchor();
    frameId = window.requestAnimationFrame(animate);

    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(measureAnchor, 120);
    };

    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, { passive: true });

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize);
    };
  }, [anchorRef]);

  return (
    <span className="mosu-gravity-title" ref={titleRef} aria-hidden="true">
      Mosu
    </span>
  );
}

function ProfilePanel({ oRef, gravity }) {
  const statusText = useTypewriter(profile.statusPool);
  const titleRef = useRef(null);
  const progress = clamp(gravity?.progress || 0);

  return (
    <section
      className={`identity ${gravity?.active ? "gravity-active" : ""} ${gravity?.locked ? "gravity-locked" : ""}`}
      aria-labelledby="site-title"
      style={{ "--gravity-progress": progress }}
    >
      <MosuGravityTitle gravity={gravity} anchorRef={titleRef} />
      <div className="brand-lockup">
        <div>
          <p className="terminal-label">~/personal/ip</p>
          <h1 id="site-title" aria-label={profile.handle} ref={titleRef}>
            <span className="dashed-name" aria-hidden="true">
              M<span ref={oRef} className="solar-o">o</span>su
            </span>
            <span className="cursor">_</span>
          </h1>
          <p className="status-line">
            {statusText}
            <span className="typewriter-cursor">|</span>
          </p>
        </div>
      </div>

      <div className="contact-strip" aria-label="联系方式">
        {contacts.map(({ label, value, href, icon: Icon }) => (
          <a className="icon-link" href={href} aria-label={`${label}: ${value}`} key={label}>
            <Icon size={22} />
            <span>{label}</span>
          </a>
        ))}
      </div>
    </section>
  );
}

function MusicCard() {
  const [trackIndex, setTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showList, setShowList] = useState(false);
  const [progress, setProgress] = useState(22);
  const current = playlist[trackIndex];

  useEffect(() => {
    if (!isPlaying) return undefined;
    const timer = window.setInterval(() => {
      setProgress((value) => (value >= 98 ? 4 : value + 1.2));
    }, 700);
    return () => window.clearInterval(timer);
  }, [isPlaying]);

  const changeTrack = (direction) => {
    setTrackIndex((value) => (value + direction + playlist.length) % playlist.length);
    setProgress(8);
    setIsPlaying(true);
  };

  return (
    <section className="panel glass-card proximity-card music-panel" aria-label="音乐播放器" data-orbit-label="音乐">
      <div className="panel-tabs">
        <button
          className={showList ? "active" : ""}
          type="button"
          onClick={() => setShowList((value) => !value)}
        >
          音乐列表
        </button>
        <button type="button" onClick={() => setTrackIndex(0)}>
          回到一言
        </button>
      </div>

      <div className="player-controls">
        <button type="button" aria-label="上一首" onClick={() => changeTrack(-1)}>
          <SkipBack size={23} />
        </button>
        <button
          className="play-button"
          type="button"
          aria-label={isPlaying ? "暂停" : "播放"}
          onClick={() => setIsPlaying((value) => !value)}
        >
          {isPlaying ? <Pause size={28} /> : <Play size={30} fill="currentColor" />}
        </button>
        <button type="button" aria-label="下一首" onClick={() => changeTrack(1)}>
          <SkipForward size={23} />
        </button>
      </div>

      <div className={isPlaying ? "waveform playing" : "waveform"} aria-hidden="true">
        {Array.from({ length: 18 }, (_, index) => (
          <span key={index} style={{ "--delay": `${index * 64}ms` }} />
        ))}
      </div>

      <p className="track-title">{isPlaying ? current.title : "未播放音乐"}</p>
      <p className="track-meta">
        {isPlaying ? `${current.artist} · ${current.length}` : "点击播放，让主页开始呼吸"}
      </p>

      <div className="progress-shell" aria-hidden="true">
        <span style={{ width: `${progress}%` }} />
      </div>

      {showList ? (
        <div className="playlist-popover">
          {playlist.map((track, index) => (
            <button
              type="button"
              key={track.title}
              className={index === trackIndex ? "selected" : ""}
              onClick={() => {
                setTrackIndex(index);
                setIsPlaying(true);
                setProgress(10);
              }}
            >
              <span>{track.title}</span>
              <small>{track.length}</small>
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function ClockWeather() {
  const { date, time } = useClock();

  return (
    <section className="panel glass-card proximity-card clock-panel" aria-label="时间和天气" data-orbit-label="时间">
      <p className="date-line">{date}</p>
      <p className="digital-time">{time}</p>
      <p className="weather-line">上海市 晴 26°C 东南风 &lt;3 级</p>
    </section>
  );
}

function ModuleCard({ item, active, onSelect }) {
  const Icon = item.icon;

  return (
    <button
      className={active ? `module-card proximity-card active ${item.accent}` : `module-card proximity-card ${item.accent}`}
      type="button"
      onClick={() => onSelect(item.id)}
      aria-pressed={active}
      data-orbit-label={item.title}
    >
      <Icon size={29} />
      <span>{item.title}</span>
    </button>
  );
}

function ModuleBoard() {
  const [activeId, setActiveId] = useState(modules[0].id);
  const active = useMemo(
    () => modules.find((module) => module.id === activeId) ?? modules[0],
    [activeId],
  );
  const activeIndex = modules.findIndex((module) => module.id === active.id);
  const gridCols = 3;
  const moveActive = (direction) => {
    const nextIndex = (activeIndex + direction + modules.length) % modules.length;
    setActiveId(modules[nextIndex].id);
  };

  useEffect(() => {
    const onKeyDown = (event) => {
      const target = event.target;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;

      switch (event.key) {
        case "ArrowRight":
          event.preventDefault();
          moveActive(1);
          break;
        case "ArrowLeft":
          event.preventDefault();
          moveActive(-1);
          break;
        case "ArrowDown":
          event.preventDefault();
          moveActive(gridCols);
          break;
        case "ArrowUp":
          event.preventDefault();
          moveActive(-gridCols);
          break;
        case "Enter":
        case " ":
          if (active.href && active.href !== "#") {
            event.preventDefault();
            window.location.href = active.href;
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, active]);

  return (
    <section className="module-board" aria-labelledby="module-title">
      <div className="board-title">
        <Link2 size={22} />
        <h2 id="module-title">网站列表</h2>
        <small className="keyboard-hint" aria-hidden="true">↑ ↓ ← →</small>
      </div>

      <div className="module-grid" role="grid">
        {modules.map((item) => (
          <ModuleCard
            item={item}
            active={item.id === activeId}
            onSelect={setActiveId}
            key={item.id}
          />
        ))}
      </div>

      <div className="module-caption" aria-live="polite">
        <span>{active.title}</span>
        <small>{active.meta}</small>
      </div>

      <div className="board-pager" aria-label="热榜滚动">
        <button
          type="button"
          aria-label="上一个模块"
          onClick={() => moveActive(-1)}
        >
          <ChevronLeft size={18} />
        </button>
        <span />
        <span className="muted" />
        <button
          type="button"
          aria-label="下一个模块"
          onClick={() => moveActive(1)}
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </section>
  );
}

export function App() {
  const [quoteIndex, setQuoteIndex] = useState(0);
  const quote = profile.quotePool[quoteIndex] ?? profile.quote;
  const [terminalOpen, setTerminalOpen] = useState(false);
  const clusterRef = useRef(null);
  const oRef = useRef(null);
  const { lang, toggleLang } = useI18n();
  const { mode, toggleMode, cycleColor } = useTheme();
  const konamiActive = useKonami(() => {
    cycleColor();
  });

  useEffect(() => {
    const onKey = (event) => {
      const target = event.target;
      const isTyping = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA");
      if (event.key === "`" || event.key === "~") {
        if (!isTyping) {
          event.preventDefault();
          setTerminalOpen((v) => !v);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const skeleton = document.getElementById("boot-skeleton");
    if (skeleton) {
      const timer = window.setTimeout(() => {
        skeleton.classList.add("hidden");
        window.setTimeout(() => skeleton.remove(), 500);
      }, 350);
      return () => window.clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    const cluster = clusterRef.current;
    if (!cluster) return undefined;
    const media = window.matchMedia("(pointer: fine)");
    if (!media.matches) return undefined;

    let frameId = 0;
    let resizeTimer = 0;
    let pointer = { x: window.innerWidth * 0.72, y: window.innerHeight * 0.42 };
    const getCards = () => [...cluster.querySelectorAll(".proximity-card")];
    let cardRects = getCards().map((card) => {
      const rect = card.getBoundingClientRect();
      return {
        card,
        centerX: rect.left + rect.width / 2,
        centerY: rect.top + rect.height / 2,
        radius: Math.max(rect.width, rect.height) * 3.05,
      };
    });

    const updateCardRects = () => {
      cardRects = getCards().map((card) => {
        const rect = card.getBoundingClientRect();
        return {
          card,
          centerX: rect.left + rect.width / 2,
          centerY: rect.top + rect.height / 2,
          radius: Math.max(rect.width, rect.height) * 3.05,
        };
      });
    };

    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(updateCardRects, 120);
    };

    const updateCards = () => {
      cardRects.forEach(({ card, centerX, centerY, radius }) => {
        const distance = Math.hypot(pointer.x - centerX, pointer.y - centerY);
        const clarity = Math.max(0.2, Math.min(1, 1 - distance / radius));
        const blur = Math.max(0, (1 - clarity) * 1.85);
        card.style.setProperty("--card-clarity", clarity.toFixed(3));
        card.style.setProperty("--card-blur", `${blur.toFixed(2)}px`);
      });
      frameId = window.requestAnimationFrame(updateCards);
    };

    const onMove = (event) => {
      pointer = { x: event.clientX, y: event.clientY };
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("resize", onResize);
    updateCards();

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(resizeTimer);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", onResize);
      getCards().forEach((card) => {
        card.style.removeProperty("--card-clarity");
        card.style.removeProperty("--card-blur");
      });
    };
  }, []);

  const gravity = useGravity({ sunRef: oRef });
  const [gravityContext, setGravityContext] = useState({
    locked: false,
    cardOrbits: [],
    sunX: 0,
    sunY: 0,
  });

  return (
    <GravityContext.Provider value={{ ...gravityContext, setContextState: setGravityContext }}>
      <main className={`app-shell ${konamiActive ? "konami-active" : ""}`}>
        <AmbientCanvas oRef={oRef} />
        <CustomCursor />
        <div className="grid-overlay" aria-hidden="true" />
        <div className="scanline" aria-hidden="true" />
        <div className="top-controls">
          <button
            type="button"
            className="icon-btn"
            onClick={toggleMode}
            aria-label={mode === "dark" ? "切换到浅色模式" : "切换到深色模式"}
          >
            {mode === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={cycleColor}
            aria-label="切换主题色"
          >
            <Palette size={16} />
          </button>
          <button
            type="button"
            className="icon-btn lang-toggle-btn"
            onClick={toggleLang}
            aria-label={lang === "zh-CN" ? "Switch to English" : "切换到中文"}
          >
            <Globe size={16} />
            <span>{lang === "zh-CN" ? "EN" : "中"}</span>
          </button>
        </div>
        <SectorInfoPanel
          quote={quote}
          onNextQuote={() => setQuoteIndex((value) => (value + 1) % profile.quotePool.length)}
        />
        <div className="homepage">
          <ProfilePanel oRef={oRef} gravity={gravity} />
          <GravityCards gravity={gravity} clusterRef={clusterRef}>
            <section className="control-cluster" aria-label="个人站控制区" ref={clusterRef}>
              <div className="top-widgets">
                <MusicCard />
                <ClockWeather />
              </div>
              <ModuleBoard />
            </section>
          </GravityCards>
        </div>
        <Terminal open={terminalOpen} onClose={() => setTerminalOpen(false)} />
      </main>
    </GravityContext.Provider>
  );
}
