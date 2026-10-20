import { Fragment, useCallback, useState } from "react";
import { Cpu } from "lucide-react";
import { nodeById } from "../data/graph.js";
import { useI18n } from "../i18n.jsx";
import { pick, useInView, usePinned, useScrollProgress } from "../lib/util.js";
import { SectionHead } from "./Constellation.jsx";

const STEP_PROJECTS = ["nw", "vs", "mm", "vf"];

// On wide screens the section pins while you scroll and plays the four steps
// like a short film; elsewhere it is a plain stacked layout.
export function Pipeline({ onFocus }) {
  const { t, lang } = useI18n();
  const [ref, inView] = useInView(0.15);
  const pinned = usePinned();
  const [active, setActive] = useState(pinned ? -1 : 3);
  const steps = t("pipeline.steps");

  const onProgress = useCallback((progress) => {
    setActive(Math.min(steps.length - 1, Math.floor((progress - 0.08) * (steps.length + 0.6))));
  }, [steps.length]);
  useScrollProgress(ref, pinned, onProgress);

  const stateOf = (index) => (!pinned ? "done" : index < active ? "done" : index === active ? "active" : "next");

  return (
    <section id="pipeline" className={`section pipeline ${inView ? "in-view" : ""} ${pinned ? "pinned" : ""}`} ref={ref}>
      <div className="pipeline-sticky">
        {pinned ? (
          <p className="pipeline-verb" aria-hidden="true">{steps[Math.max(0, active)]?.verb}</p>
        ) : null}
        <SectionHead kicker={t("pipeline.kicker")} title={t("pipeline.title")} sub={t("pipeline.sub")} />
        <ol className="pipeline-track">
          {pinned ? <li className="pipeline-token" aria-hidden="true" /> : null}
          {steps.map((step, index) => {
            const project = nodeById[STEP_PROJECTS[index]];
            return (
              <Fragment key={project.id}>
                <li
                  className="pipeline-step glass-card"
                  data-state={stateOf(index)}
                  style={{ "--chip": `var(--c-${project.cluster})`, "--i": index }}
                >
                  <div className="step-top">
                    <span className="step-index">0{index + 1}</span>
                    <span className="step-verb">{step.verb}</span>
                  </div>
                  <h3>{step.title}</h3>
                  <p className="step-project">{project.name}</p>
                  <p className="step-desc">{pick(project.desc, lang)}</p>
                  {project.id === "vs" ? (
                    <p className="step-note"><Cpu size={12} />{t("pipeline.gpu")}</p>
                  ) : null}
                  <button type="button" className="step-link" onClick={() => onFocus(project.id)}>
                    {t("pipeline.view")} →
                  </button>
                </li>
                {index < steps.length - 1 ? (
                  <li className="pipeline-link" aria-hidden="true" data-state={stateOf(index + 1) === "next" ? "next" : "done"} style={{ "--i": index }}>
                    <span className="link-line"><i /></span>
                    <small>{step.out}</small>
                  </li>
                ) : (
                  <li className="pipeline-out" aria-hidden="true" data-state={stateOf(index)}>
                    <small>{step.out}</small>
                  </li>
                )}
              </Fragment>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
