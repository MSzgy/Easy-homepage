import { useCallback, useEffect, useRef, useState } from "react";
import { AmbientCanvas } from "./components/AmbientCanvas.jsx";
import { Blog } from "./components/Blog.jsx";
import { Constellation } from "./components/Constellation.jsx";
import { CustomCursor } from "./components/CustomCursor.jsx";
import { Footer } from "./components/Footer.jsx";
import { Hero } from "./components/Hero.jsx";
import { Pipeline } from "./components/Pipeline.jsx";
import { Terminal } from "./components/Terminal.jsx";
import { Timeline } from "./components/Timeline.jsx";
import { TopBar } from "./components/TopBar.jsx";
import { StoryPage } from "./components/StoryPage.jsx";
import { useAudience } from "./audience.jsx";
import { useTheme } from "./theme.jsx";
import { scrollToId } from "./lib/util.js";

const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
const isTyping = (target) => target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA");

// --sy (scroll px) and --sp (0..1 page progress) on <html>, for CSS scroll effects.
function useScrollVars() {
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const root = document.documentElement;
      const max = Math.max(1, root.scrollHeight - window.innerHeight);
      root.style.setProperty("--sy", String(Math.round(window.scrollY)));
      root.style.setProperty("--sp", (window.scrollY / max).toFixed(4));
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);
}

function useKonami(onActivate) {
  const [active, setActive] = useState(false);
  const posRef = useRef(0);

  useEffect(() => {
    let timer = 0;
    const onKeyDown = (event) => {
      if (isTyping(event.target)) return;
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      if (key === KONAMI[posRef.current]) {
        posRef.current += 1;
        if (posRef.current === KONAMI.length) {
          posRef.current = 0;
          setActive(true);
          onActivate();
          window.clearTimeout(timer);
          timer = window.setTimeout(() => setActive(false), 3200);
        }
      } else {
        posRef.current = key === KONAMI[0] ? 1 : 0;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(timer);
    };
  }, [onActivate]);

  return active;
}

export function App() {
  const { audience, toggleAudience } = useAudience();
  useScrollVars();

  useEffect(() => {
    const skeleton = document.getElementById("boot-skeleton");
    if (!skeleton) return undefined;
    const timer = window.setTimeout(() => {
      skeleton.classList.add("hidden");
      window.setTimeout(() => skeleton.remove(), 500);
    }, 350);
    return () => window.clearTimeout(timer);
  }, []);

  return audience === "story" ? <StoryApp onOpenGeek={toggleAudience} /> : <GeekApp />;
}

function StoryApp({ onOpenGeek }) {
  return (
    <div className="app-shell story-shell">
      <CustomCursor />
      <TopBar />
      <main>
        <StoryPage onOpenGeek={onOpenGeek} />
      </main>
    </div>
  );
}

function GeekApp() {
  const { cycleColor } = useTheme();
  const konamiActive = useKonami(cycleColor);
  const oRef = useRef(null);
  const stageRef = useRef(null);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [cluster, setCluster] = useState(null);
  const [liveOnly, setLiveOnly] = useState(false);

  const select = useCallback((id) => setSelectedId(id), []);
  const focusNode = useCallback((id) => {
    setSelectedId(id);
    scrollToId("graph");
  }, []);
  const showLive = useCallback(() => {
    setSelectedId(null);
    setLiveOnly(true);
  }, []);
  const openTerminal = useCallback(() => setTerminalOpen(true), []);

  useEffect(() => {
    const onKey = (event) => {
      if ((event.key === "`" || event.key === "~") && !isTyping(event.target)) {
        event.preventDefault();
        setTerminalOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className={`app-shell ${konamiActive ? "konami-active" : ""}`}>
      <AmbientCanvas oRef={oRef} targetRef={stageRef} />
      <CustomCursor />
      <div className="grid-overlay" aria-hidden="true" />
      <div className="scroll-progress" aria-hidden="true" />
      <TopBar onOpenTerminal={openTerminal} />
      <main>
        <Hero oRef={oRef} onSelect={focusNode} onShowLive={showLive} />
        <Constellation
          stageRef={stageRef}
          selectedId={selectedId}
          onSelect={select}
          cluster={cluster}
          onCluster={setCluster}
          liveOnly={liveOnly}
          onLiveOnly={setLiveOnly}
        />
        <Pipeline onFocus={focusNode} />
        <Blog onFocus={focusNode} />
        <Timeline onFocus={focusNode} />
      </main>
      <Footer onOpenTerminal={openTerminal} onFocus={focusNode} />
      <Terminal open={terminalOpen} onClose={() => setTerminalOpen(false)} onFocus={focusNode} />
    </div>
  );
}
