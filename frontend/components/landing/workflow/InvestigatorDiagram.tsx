"use client";

/* Agent 3, the Investigator: the real agent. A ReAct loop that works each
 * hypothesis with real tool calls under a hard 15-call budget, then rules
 * accept, reject, or inconclusive with citations. */

import {
  DiagramSvg,
  Deliverable,
  Diamond,
  Edge,
  EdgeLabel,
  GroupBox,
  Node,
  StoreNode,
  SubRow,
} from "@/components/landing/workflow/primitives";

export function InvestigatorDiagram({ animated, shown }: { animated: boolean; shown: boolean }) {
  return (
    <DiagramSvg
      viewBox="0 0 860 530"
      label="Investigator workflow: a ReAct loop where the LLM calls search, diff and metric tools under a hard budget, then rules on each hypothesis"
      animated={animated}
      shown={shown}
    >
      <StoreNode
        x={60}
        y={52}
        w={200}
        title="hypotheses[]"
        sub="+ context_pack · BeaconState"
        order={0}
        animated={animated}
      />

      <Node
        x={330}
        y={50}
        w={210}
        h={56}
        kind="dark"
        kicker="ReAct core"
        title="LLM.invoke()"
        sub="reads the evidence so far"
        order={1}
        animated={animated}
      />

      <Diamond cx={435} cy={200} title="tool_call?" order={2} animated={animated} />

      <GroupBox x={640} y={120} w={170} h={122} label="tools" order={3} animated={animated}>
        <SubRow x={656} y={148} w={138} text="search_logs()" />
        <SubRow x={656} y={178} w={138} text="read_diff()" />
        <SubRow x={656} y={208} w={138} text="get_metric()" />
      </GroupBox>

      <Node
        x={330}
        y={280}
        w={210}
        h={56}
        kicker="rule on it"
        title="verdict_llm.invoke()"
        sub="accept · reject · inconclusive"
        order={4}
        animated={animated}
      />

      <Node
        x={330}
        y={380}
        w={210}
        h={56}
        kicker="collect"
        title="stamp hypothesis_id"
        sub="citations · confidence · reasoning"
        order={5}
        animated={animated}
      />

      <Deliverable
        x={330}
        y={472}
        w={210}
        label="verdicts[]"
        note="+ tool_calls_used"
        order={6}
        animated={animated}
      />

      {/* wiring */}
      <Edge d="M 260 82 L 330 82" order={0} beamPhase={0} animated={animated} />
      <Edge d="M 435 106 L 435 172" order={1} beamDur={1.8} beamPhase={0.5} animated={animated} />
      <Edge d="M 505 200 L 640 200" order={2} beamDur={1.8} beamPhase={1} animated={animated} />
      <EdgeLabel x={570} y={192} text="yes" order={2} animated={animated} />
      {/* ToolMessage rides back into the loop */}
      <Edge d="M 725 120 L 725 78 L 540 78" order={3} beamDur={2.4} beamPhase={1.4} animated={animated} />
      <EdgeLabel x={640} y={70} text="ToolMessage" order={3} animated={animated} />
      <Edge d="M 435 228 L 435 280" order={4} beamDur={1.6} beamPhase={1.9} animated={animated} />
      <EdgeLabel x={452} y={252} text="no" order={4} animated={animated} />
      <Edge d="M 435 336 L 435 380" order={5} beamDur={1.6} beamPhase={0.7} animated={animated} />
      <Edge d="M 435 436 L 435 472" order={6} beamDur={1.5} beamPhase={2.2} animated={animated} />
      {/* next hypothesis loops back to the top on the same shared budget */}
      <Edge
        d="M 330 408 L 292 408 L 292 64 L 330 64"
        dashed
        order={7}
        beamDur={3.4}
        beamPhase={0.3}
        animated={animated}
      />
      <EdgeLabel x={292} y={250} text="next hypothesis" order={7} animated={animated} />
    </DiagramSvg>
  );
}
