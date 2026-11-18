import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { assessExhibit, cases, checks, vendorEvidence, type CaseId, type Stage } from "@/lib/briefingCases";
import "./briefing-rehearsal.css";

const labels = ["Public evidence", "Add open commitment", "Review incoming exhibit"] as const;

function SourceList({ items }: { items: readonly (typeof vendorEvidence)[number][] }) {
  return <ul className="br-sources">{items.map(source =>
    <li key={source.url}><small>{source.date}</small><a href={source.url} target="_blank" rel="noreferrer">{source.title} <ArrowUpRight size={14} /></a><p>{source.detail}</p></li>
  )}</ul>;
}

export default function BriefingRehearsal() {
  const [id, setId] = useState<CaseId>("holger");
  const [stages, setStages] = useState<Record<CaseId, Stage>>({ holger: 0, phil: 0 });
  const [attributes, setAttributes] = useState<Record<CaseId, string[]>>({ holger: [checks.holger[0]], phil: [checks.phil[0]] });
  const profile = cases[id];
  const stage = stages[id];
  const next = profile.stages[stage];
  const assessment = assessExhibit(id, attributes[id]);
  const review = stage === 2;
  const complete = review && assessment.readyForReview;
  const amended = attributes[id].length !== 1 || attributes[id][0] !== checks[id][0];
  const toggle = (item: string) => setAttributes(prev => ({
    ...prev, [id]: prev[id].includes(item) ? prev[id].filter(i => i !== item) : [...prev[id], item],
  }));

  return <article className="br-wrap">
    <Link href="/succeed" className="br-back"><ArrowLeft size={15} /> Succeed</Link>
    <header className="br-header"><div><span className="br-label">Accenture · Executive preparation</span>
      <h1>Briefing rehearsal</h1><p>Prepare Julie Sweet to discuss AI-enabled services. Choose the analyst and see which claims the evidence can support.</p></div>
      <span className="br-date">Public evidence sample<br/>18 November 2026</span>
    </header>
    <div aria-label="Choose an analyst" role="group" className="br-switch">
      {(Object.keys(cases) as CaseId[]).map(key => <button key={key} aria-pressed={id === key} onClick={() => setId(key)}>
        <span className="br-initials" aria-hidden="true">{cases[key].initials}</span><span><strong>{cases[key].name}</strong><small>{cases[key].lens} · {cases[key].firm}</small></span>
      </button>)}
    </div>
    <section className="br-panel br-lead" aria-label="Executive brief">
      <div><span className="br-label">Recommended opening</span><h2>{profile.headline}</h2><p>{profile.rationale}</p></div>
      <aside><span className="br-label">Question to rehearse</span><p>{profile.question}</p><small>AR SuperHero’s suggested question</small></aside>
    </section>
    <div className="br-columns">
      <section className="br-panel"><span className="br-label">In the room</span><h3>How to brief {profile.name.split(" ")[0]}</h3><p>{profile.opening}</p>
        <details key={id}><summary>See the analyst’s published evidence ({profile.sources.length})</summary><SourceList items={profile.sources}/><p className="br-note">{profile.boundary}</p></details>
      </section>
      <section className="br-panel"><span className="br-label">Claim check</span><h3>Where the evidence stops</h3><p>{profile.gap}</p>
        <details key={id}><summary>Trace the executive commitment</summary><SourceList items={vendorEvidence}/></details>
      </section>
    </div>
    <section className="br-panel br-context"><span className="br-label">Relationship context · Simulation</span><h2>What changes after the meeting?</h2>
      <p>Replay an illustrative AR commitment. Each analyst has a separate record for this rehearsal.</p>
      <div className="br-stages" role="group" aria-label="Relationship context">{labels.map((label, i) =>
        <button key={label} aria-pressed={stage === i} onClick={() => setStages(prev => ({ ...prev, [id]: i as Stage }))}>{label}</button>)}</div>
      <div className="br-columns br-actions">
        <div><span className="br-label">{stage === 0 ? "Evidence available" : "Illustrative record"}</span>
          <p>{stage === 0 ? "Starting point: published research and Accenture’s announcements." : profile.request}</p>
          {review && <><p>{profile.reply}</p><fieldset><legend>Model a revised exhibit by changing its contents</legend>{checks[id].map(item =>
            <label key={item}><input type="checkbox" checked={attributes[id].includes(item)} onChange={() => toggle(item)} /> {item}</label>)}</fieldset></>}
        </div>
        <div className="br-next" aria-live="polite"><span className="br-label">Recommended next action</span>
          <h3>{complete ? "Send for factual verification" : review && amended ? "Request the remaining evidence" : next.action}</h3>
          <strong>Owner · {complete ? "AR lead and evidence owner" : next.owner}</strong>
          <p>{complete ? "The exhibit now covers every requested field in this simulation. Confirm the underlying values and obtain clearance before sharing it." : review && amended ? "Ask the owner to supply the items below before marking the commitment complete." : next.body}</p>
          {review && <div className="br-review"><strong>{assessment.covered} of {checks[id].length} fields supplied</strong>{assessment.missing.length > 0 && <p>Still needed: {assessment.missing.join(", ")}.</p>}</div>}
        </div>
      </div>
    </section>
  </article>;
}
