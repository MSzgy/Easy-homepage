import { Fragment } from "react";
import { Cpu } from "lucide-react";
import { nodeById } from "../data/graph.js";
import { useI18n } from "../i18n.jsx";
import { pick, useInView } from "../lib/util.js";
import { SectionHead } from "./Constellation.jsx";

const STEP_PROJECTS = ["nw", "vs", "mm", "vf"];

export function Pipeline({ onFocus }) {
  const { t, lang } = useI18n();
  const [ref, inView] = useInView(0.25);
  const steps = t("pipeline.steps");

  return (
    <section id="pipeline" className={`section pipeline ${inView ? "in-view" : ""}`} ref={ref}>
      <SectionHead kicker={t("pipeline.kicker")} title={t("pipeline.title")} sub={t("pipeline.sub")} />
      <ol className="pipeline-track">
        {steps.map((step, index) => {
          const project = nodeById[STEP_PROJECTS[index]];
          return (
            <Fragment key={project.id}>
              <li className="pipeline-step glass-card" style={{ "--chip": `var(--c-${project.cluster})`, "--i": index }}>
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
                <li className="pipeline-link" aria-hidden="true" style={{ "--i": index }}>
                  <span className="link-line"><i /></span>
                  <small>{step.out}</small>
                </li>
              ) : (
                <li className="pipeline-out" aria-hidden="true">
                  <small>{step.out}</small>
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
    </section>
  );
}
