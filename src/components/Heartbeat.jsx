import { PROJECTS } from "../data/graph.js";
import { upCount, useStatus } from "../data/status.js";
import { useI18n } from "../i18n.jsx";
import { fmt, pick } from "../lib/util.js";

const WIDTH = 220;
const HEIGHT = 30;
const CAP_MS = 3000;
const SLOTS = 72; // matches the 6-hour history kept by the server

// Oscilloscope-style: each check has a fixed slot and new ones enter from the
// right, so the line reads correctly even with only a few checks. Failed checks
// show as red bars.
function Sparkline({ history }) {
  const slot = WIDTH / (SLOTS - 1);
  const x = (i) => WIDTH - (history.length - 1 - i) * slot;
  const y = (check) => (check.ok && check.ms != null ? HEIGHT - 3 - (Math.min(check.ms, CAP_MS) / CAP_MS) * (HEIGHT - 8) : HEIGHT - 1);
  const points = history.map((check, i) => `${x(i).toFixed(1)},${y(check).toFixed(1)}`);
  const last = history[history.length - 1];
  return (
    <svg className="spark" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" aria-hidden="true">
      <line className="spark-base" x1="0" x2={WIDTH} y1={HEIGHT - 0.5} y2={HEIGHT - 0.5} />
      {history.length > 1 ? (
        <>
          <polygon className="spark-fill" points={`${x(0).toFixed(1)},${HEIGHT} ${points.join(" ")} ${WIDTH},${HEIGHT}`} />
          <polyline className="spark-line" points={points.join(" ")} />
        </>
      ) : null}
      {history.map((check, i) => (check.ok ? null : <rect key={check.t} className="spark-fail" x={x(i) - 1.5} y="0" width="3" height={HEIGHT} />))}
      {last ? <circle className="spark-head" cx={WIDTH} cy={y(last)} r="2.4" /> : null}
    </svg>
  );
}

const minutesAgo = (iso) => Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));

export function Heartbeat({ onSelect }) {
  const { t, lang } = useI18n();
  const status = useStatus();
  const projects = PROJECTS.filter((project) => status?.services?.[project.id]);
  const { up, total } = upCount(status);

  return (
    <div className="heartbeat glass-card" aria-label={t("pulse.title")}>
      <div className="log-head">
        <span className={`beat-dot ${status && up < total ? "warn" : ""}`} aria-hidden="true" />
        <code>$ watch -n 300 status</code>
        {status ? <small>{fmt(t("pulse.summary"), { up, total, min: minutesAgo(status.checkedAt) })}</small> : null}
      </div>
      {status ? (
        <ul>
          {projects.map((project) => {
            const service = status.services[project.id];
            const checks = service.history ?? [];
            const uptime = checks.length ? Math.round((checks.filter((c) => c.ok).length / checks.length) * 100) : 0;
            return (
              <li key={project.id} style={{ "--chip": `var(--c-${project.cluster})` }}>
                <button type="button" onClick={() => onSelect(project.id)} title={fmt(t("pulse.uptime"), { n: uptime })}>
                  <i className={service.ok ? "state up" : "state down"} aria-label={service.ok ? t("term.up") : t("term.down")} />
                  <span className="beat-name">
                    {pick(project.nick, lang)}
                    <small>{project.name}</small>
                  </span>
                  <Sparkline history={checks} />
                  <span className="beat-ms">{service.ok && service.ms != null ? `${service.ms} ms` : t("term.down")}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="beat-wait">{t("pulse.waiting")}</p>
      )}
    </div>
  );
}
