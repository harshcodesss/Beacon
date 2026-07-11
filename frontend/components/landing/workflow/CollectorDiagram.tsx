"use client";

/* Agent 1, the Collector: pure Python, no LLM. Reads the incident + baseline
 * log windows and recent commits, clusters the noise, flags what is NEW, and
 * hands a hard-capped context pack to the rest of the pipeline. */

import {
  DiagramSvg,
  Deliverable,
  Edge,
  GroupBox,
  Node,
  SubRow,
} from "@/components/landing/workflow/primitives";

export function CollectorDiagram({ animated, shown }: { animated: boolean; shown: boolean }) {
  return (
    <DiagramSvg
      viewBox="0 0 860 490"
      label="Collector workflow: read log windows and commits, cluster, flag new templates, assemble and cap the context pack"
      animated={animated}
      shown={shown}
    >
      {/* sources */}
      <GroupBox x={60} y={30} w={390} h={76} label="read logs" order={0} animated={animated}>
        <Node
          x={76}
          y={48}
          w={175}
          h={44}
          kind="source"
          kicker="incident window"
          title="last 30 mins"
          animated={animated}
          order={0}
        />
        <Node
          x={262}
          y={48}
          w={175}
          h={44}
          kind="source"
          kicker="baseline window"
          title="the 120 mins before"
          animated={animated}
          order={1}
        />
      </GroupBox>
      <Node
        x={620}
        y={42}
        w={180}
        h={56}
        kind="source"
        kicker="git history"
        title="recent_commits(n=5)"
        sub="diffs capped at 4K chars"
        order={2}
        animated={animated}
      />

      {/* pipeline */}
      <Node
        x={170}
        y={152}
        w={170}
        h={42}
        kicker="normalize"
        title="Join_Multiline()"
        order={3}
        animated={animated}
      />

      <Node
        x={60}
        y={244}
        w={200}
        h={92}
        kicker="cluster"
        title=""
        order={4}
        animated={animated}
      >
        {/* rows ride the card's cascade */}
        <SubRow x={78} y={272} w={164} text="drain3 TemplateMiner" />
        <SubRow x={78} y={300} w={164} text={`"NEW" flag · gold signal`} tone="beacon" />
      </Node>

      <Node
        x={340}
        y={256}
        w={130}
        h={42}
        kicker="measure"
        title="Error_rate()"
        order={5}
        animated={animated}
      />

      <Node
        x={330}
        y={366}
        w={170}
        h={56}
        kind="dark"
        kicker="assemble"
        title="context pack"
        sub="{clusters, deploys}"
        order={6}
        animated={animated}
      />

      <Node
        x={560}
        y={368}
        w={190}
        h={42}
        kicker="hard cap"
        title="truncate_to_budget(~8K)"
        order={7}
        animated={animated}
      />

      <Deliverable
        x={560}
        y={440}
        w={190}
        label="context_pack"
        note="to BeaconState"
        order={8}
        animated={animated}
      />

      {/* wiring */}
      <Edge d="M 163 92 L 163 126 L 215 126 L 215 152" order={0} beamPhase={0} animated={animated} />
      <Edge d="M 349 92 L 349 126 L 295 126 L 295 152" order={1} beamPhase={0.4} animated={animated} />
      <Edge d="M 215 194 L 215 219 L 160 219 L 160 244" order={2} beamDur={2} beamPhase={0.9} animated={animated} />
      <Edge d="M 295 194 L 295 219 L 405 219 L 405 256" order={3} beamDur={2} beamPhase={1.2} animated={animated} />
      <Edge d="M 160 336 L 160 389 L 330 389" order={4} beamDur={2.4} beamPhase={1.7} animated={animated} />
      <Edge d="M 405 298 L 405 366" order={5} beamDur={1.6} beamPhase={1.9} animated={animated} />
      {/* routed through the clear lane between Error_rate and truncate */}
      <Edge d="M 710 98 L 710 232 L 480 232 L 480 366" order={6} beamDur={3.2} beamPhase={0.6} animated={animated} />
      <Edge d="M 500 389 L 560 389" order={7} beamDur={1.4} beamPhase={2.3} animated={animated} />
      <Edge d="M 655 410 L 655 440" order={8} beamDur={1.4} beamPhase={2.6} animated={animated} />
    </DiagramSvg>
  );
}
