import { Globe, Moon, Palette, Sun, SquareTerminal } from "lucide-react";
import { useI18n } from "../i18n.jsx";
import { useTheme } from "../theme.jsx";

const SECTIONS = ["graph", "pipeline", "blog", "timeline"];

export function TopBar({ onOpenTerminal }) {
  const { t, lang, toggleLang } = useI18n();
  const { mode, toggleMode, cycleColor } = useTheme();

  return (
    <header className="top-bar">
      <a className="brand-mark" href="#top" aria-label={t("controls.home")}>
        <span className="brand-bracket">{"{"}</span>
        <span className="brand-slash">/</span>
        <span className="brand-bracket">{"}"}</span>
        <span>mosu</span>
      </a>
      <nav className="section-nav" aria-label="sections">
        {SECTIONS.map((id, index) => (
          <a href={`#${id}`} key={id}>
            <small>0{index + 1}</small>
            {t(`nav.${id}`)}
          </a>
        ))}
      </nav>
      <div className="top-controls">
        <button type="button" className="icon-btn" onClick={onOpenTerminal} aria-label={t("controls.terminal")}>
          <SquareTerminal size={16} />
        </button>
        <button
          type="button"
          className="icon-btn"
          onClick={toggleMode}
          aria-label={mode === "dark" ? t("controls.toLight") : t("controls.toDark")}
        >
          {mode === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button type="button" className="icon-btn" onClick={cycleColor} aria-label={t("controls.color")}>
          <Palette size={16} />
        </button>
        <button type="button" className="icon-btn lang-toggle-btn" onClick={toggleLang} aria-label={t("controls.lang")}>
          <Globe size={16} />
          <span>{lang === "zh-CN" ? "EN" : "中"}</span>
        </button>
      </div>
    </header>
  );
}
