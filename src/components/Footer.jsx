import { useState } from "react";
import { RotateCcw, SquareTerminal } from "lucide-react";
import { PROJECTS } from "../data/graph.js";
import { contacts, profile } from "../data/site.js";
import { useI18n } from "../i18n.jsx";
import { pick } from "../lib/util.js";

const newest = [...PROJECTS].sort((a, b) => b.created.localeCompare(a.created))[0];

export function Footer({ onOpenTerminal, onFocus }) {
  const { t, lang } = useI18n();
  const [quoteIndex, setQuoteIndex] = useState(0);
  const quotes = pick(profile.quotes, lang);

  return (
    <footer className="site-footer">
      <div className="footer-quote">
        <span className="quote-mark" aria-hidden="true">"</span>
        <p>{quotes[quoteIndex % quotes.length]}</p>
        <button type="button" onClick={() => setQuoteIndex((value) => value + 1)}>
          <RotateCcw size={12} />
          {t("footer.quote")}
        </button>
      </div>
      <div className="footer-grid">
        <div>
          <p className="panel-kicker">{t("footer.now")}</p>
          <button type="button" className="footer-now" onClick={() => onFocus(newest.id)}>
            {newest.name}
            <small>{pick(newest.desc, lang)}</small>
          </button>
        </div>
        <div className="footer-contacts">
          {contacts.map(({ id, label, value, href, icon: Icon }) => (
            <a href={href} key={id} target={id === "email" ? undefined : "_blank"} rel="noreferrer">
              <Icon size={15} />
              <span>{label}</span>
              <small>{value}</small>
            </a>
          ))}
        </div>
        <div>
          <button type="button" className="action" onClick={onOpenTerminal}>
            <SquareTerminal size={14} />
            {t("footer.terminal")}
          </button>
          <p className="fine-print">{t("footer.terminalHint")}</p>
        </div>
      </div>
      <p className="fine-print footer-built">© {new Date().getFullYear()} Mosu · {t("footer.built")}</p>
    </footer>
  );
}
