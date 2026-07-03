import { fireEvent, render, screen } from "@testing-library/react";

import { HypothesesSection } from "@/components/HypothesesSection";
import { ReportView } from "@/components/ReportView";
import { StatusChip } from "@/components/StatusChip";
import { VerdictsSection } from "@/components/VerdictsSection";
import { EXAMPLE_HYPOTHESES, EXAMPLE_REPORT_MD, EXAMPLE_VERDICTS } from "@/lib/fixtures";

describe("incident report rendering", () => {
  it("renders the markdown report with root cause and evidence citations", () => {
    render(<ReportView markdown={EXAMPLE_REPORT_MD} />);
    expect(
      screen.getByRole("heading", { name: /incident report — api crash-loop after deploy/i }),
    ).toBeDefined();
    expect(screen.getByText(/root cause \(one line\)/i)).toBeDefined();
    expect(screen.getByText("app.log:1042")).toBeDefined();
    expect(screen.getByRole("heading", { name: /ruled out/i })).toBeDefined();
  });

  it("renders verdict cards with badges, confidence and evidence chips", () => {
    render(<VerdictsSection verdicts={EXAMPLE_VERDICTS} />);
    const cards = screen.getAllByTestId("verdict-card");
    expect(cards).toHaveLength(2);
    expect(screen.getByText("accept")).toBeDefined();
    expect(screen.getByText("reject")).toBeDefined();
    expect(screen.getByTitle("Confidence 93%")).toBeDefined();
    expect(screen.getByText("commit 9f3c2e1 api/config.py:18")).toBeDefined();
  });

  it("renders hypotheses with prior confidence and confirm/refute evidence", () => {
    render(<HypothesesSection hypotheses={EXAMPLE_HYPOTHESES} />);
    // Collapsible defaults closed for hypotheses — open it.
    fireEvent.click(screen.getByRole("button", { name: /hypotheses/i }));
    expect(screen.getByText(/dropped the DB_URL fallback/i)).toBeDefined();
    expect(screen.getByText("api/config.py")).toBeDefined();
  });

  it("renders status chips for every incident state", () => {
    render(
      <>
        <StatusChip status="queued" />
        <StatusChip status="running" />
        <StatusChip status="done" />
        <StatusChip status="failed" />
      </>,
    );
    for (const label of ["Queued", "Running", "Done", "Failed"]) {
      expect(screen.getByText(label)).toBeDefined();
    }
  });
});
