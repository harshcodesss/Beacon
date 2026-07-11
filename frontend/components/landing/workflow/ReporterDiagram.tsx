"use client";

/* Agent 4, the Reporter: one LLM call writes the report, then a pure-code
 * citation gate verifies every cite against gathered evidence. The report
 * cannot cite what was not gathered. */

import {
  DiagramSvg,
  Deliverable,
  Edge,
  EdgeLabel,
  GroupBox,
  Node,
  StoreNode,
} from "@/components/landing/workflow/primitives";

export function ReporterDiagram({ animated, shown }: { animated: boolean; shown: boolean }) {
  return (
    <DiagramSvg
      viewBox="0 0 860 530"
      label="Reporter workflow: build the report prompt, one LLM call writes markdown, then a pure-code citation gate verifies every citation against the evidence pool"
      animated={animated}
      shown={shown}
    >
      <StoreNode
        x={60}
        y={42}
        w={210}
        title="verdicts[] + hypotheses[]"
        sub="+ context_pack · BeaconState"
        order={0}
        animated={animated}
      />
      <Node
        x={630}
        y={50}
        w={170}
        h={42}
        kind="source"
        kicker="prompt"
        title="report prompt"
        order={1}
        animated={animated}
      />

      <Node
        x={330}
        y={50}
        w={210}
        h={44}
        kicker="build"
        title="generate_report_prompt()"
        order={2}
        animated={animated}
      />

      <Node
        x={330}
        y={152}
        w={210}
        h={44}
        kicker="LLM call"
        title="write the markdown report"
        order={3}
        animated={animated}
      />

      <Node
        x={330}
        y={248}
        w={210}
        h={42}
        kicker="normalize"
        title="normalize_content()"
        order={4}
        animated={animated}
      />

      {/* the anti-hallucination gate: deterministic code, no LLM */}
      <GroupBox x={100} y={332} w={650} h={116} label="anti-hallucination gate · pure code" tone="beacon" order={5} animated={animated} />
      <Node
        x={120}
        y={364}
        w={240}
        h={56}
        kind="dark"
        kicker="citation gate"
        title="verify_citations()"
        sub="every app.log:N and commit hash"
        order={6}
        animated={animated}
      />
      <Node
        x={420}
        y={364}
        w={160}
        h={56}
        kind="source"
        kicker="reference pool"
        title="real citations only"
        sub="verdict evidence · deploys"
        order={7}
        animated={animated}
      />
      <Node
        x={610}
        y={364}
        w={124}
        h={56}
        kicker="not in pool?"
        title="[unverified]"
        sub="audit footer N/M"
        order={8}
        animated={animated}
      />

      <Deliverable
        x={120}
        y={478}
        w={280}
        label="beacon-report.md"
        note="PR · dashboard · inbox"
        order={9}
        animated={animated}
      />

      {/* wiring */}
      <Edge d="M 270 72 L 330 72" order={0} beamPhase={0} animated={animated} />
      <Edge d="M 630 71 L 540 71" order={1} beamDur={1.6} beamPhase={0.5} animated={animated} />
      <Edge d="M 435 94 L 435 152" order={2} beamDur={1.8} beamPhase={1} animated={animated} />
      <Edge d="M 435 196 L 435 248" order={3} beamDur={1.6} beamPhase={1.5} animated={animated} />
      <Edge d="M 435 290 L 435 312 L 240 312 L 240 364" order={4} beamDur={2.2} beamPhase={0.7} animated={animated} />
      <Edge d="M 360 392 L 420 392" order={5} beamDur={1.5} beamPhase={1.9} animated={animated} />
      <EdgeLabel x={390} y={384} text="in pool?" order={5} animated={animated} />
      <Edge d="M 580 392 L 610 392" order={6} beamDur={1.3} beamPhase={2.4} animated={animated} />
      {/* the report leaves the gate only after every cite is checked */}
      <Edge d="M 240 420 L 240 478" order={7} beamDur={1.6} beamPhase={1.2} animated={animated} />
    </DiagramSvg>
  );
}
