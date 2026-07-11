"use client";

/* Agent 2, the Hypothesis Generator: exactly one structured LLM call that
 * turns the context pack into 3 to 5 ranked, testable hypotheses. */

import {
  DiagramSvg,
  Deliverable,
  Edge,
  EdgeLabel,
  Node,
  StoreNode,
} from "@/components/landing/workflow/primitives";

export function GeneratorDiagram({ animated, shown }: { animated: boolean; shown: boolean }) {
  return (
    <DiagramSvg
      viewBox="0 0 860 430"
      label="Hypothesis Generator workflow: read the context pack, build the prompt, one structured LLM call, post-process into ranked hypotheses"
      animated={animated}
      shown={shown}
    >
      <StoreNode
        x={60}
        y={40}
        w={190}
        title="BeaconState"
        sub="written by the Collector"
        order={0}
        animated={animated}
      />
      <Node
        x={330}
        y={48}
        w={170}
        h={42}
        kicker="read"
        title="context_pack"
        order={1}
        animated={animated}
      />
      <Node
        x={630}
        y={48}
        w={170}
        h={42}
        kind="source"
        kicker="prompt"
        title="system prompt"
        order={2}
        animated={animated}
      />

      <Node
        x={330}
        y={152}
        w={220}
        h={56}
        kicker="build"
        title="build_prompt()"
        sub="system prompt + context_pack(JSON)"
        order={3}
        animated={animated}
      />

      <Node
        x={330}
        y={252}
        w={220}
        h={56}
        kind="dark"
        kicker="the one LLM call"
        title="structured_output()"
        sub="schema: HypothesisList"
        order={4}
        animated={animated}
      />

      <Node
        x={330}
        y={352}
        w={220}
        h={56}
        kicker="post-process"
        title="rank by prior_confidence"
        sub="backfill blank ids · cap at 5"
        order={5}
        animated={animated}
      />

      <Deliverable
        x={630}
        y={362}
        w={170}
        label="hypotheses[]"
        note="3 to 5"
        order={6}
        animated={animated}
      />

      <Edge d="M 250 70 L 330 70" order={0} beamPhase={0} animated={animated} />
      <EdgeLabel x={290} y={62} text="read" order={0} animated={animated} />
      <Edge d="M 415 90 L 415 152" order={1} beamDur={1.8} beamPhase={0.5} animated={animated} />
      <Edge d="M 715 90 L 715 122 L 470 122 L 470 152" order={2} beamDur={2.6} beamPhase={1.1} animated={animated} />
      <Edge d="M 440 208 L 440 252" order={3} beamDur={1.6} beamPhase={1.6} animated={animated} />
      <Edge d="M 440 308 L 440 352" order={4} beamDur={1.6} beamPhase={0.8} animated={animated} />
      <Edge d="M 550 380 L 630 380" order={5} beamDur={1.5} beamPhase={2.1} animated={animated} />
    </DiagramSvg>
  );
}
