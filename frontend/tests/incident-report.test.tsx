import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";

import { ToastProvider } from "@/components/Toast";
import { StatusChip } from "@/components/StatusChip";
import { EXAMPLE_HYPOTHESES, EXAMPLE_REPORT_MD, EXAMPLE_VERDICTS } from "@/lib/fixtures";
import type { IncidentDetail } from "@/lib/types";

const state = vi.hoisted(() => ({ incident: null as IncidentDetail | null }));

vi.mock("@/lib/useApi", () => ({
  useBackendToken: () => "test-token",
  useApi: (path: string | null) => ({
    data: path?.startsWith("/incidents/") ? state.incident : null,
    error: null,
    loading: false,
    refresh: () => {},
    token: "test-token",
  }),
}));

vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { user: { name: "Ada Lovelace" }, backendToken: "test-token" },
    status: "authenticated",
  }),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "abc12345-0000-0000-0000-000000000000" }),
  useRouter: () => ({ push: () => {} }),
}));

import IncidentPage from "@/app/(app)/incidents/[id]/page";

const BASE: Omit<IncidentDetail, "status" | "report" | "finished_at"> = {
  id: "abc12345-0000-0000-0000-000000000000",
  project_id: "p1",
  project_name: "meetpilot-api (demo)",
  trigger: "action",
  created_at: new Date(Date.now() - 120_000).toISOString(),
};

const DONE_INCIDENT: IncidentDetail = {
  ...BASE,
  status: "done",
  finished_at: new Date().toISOString(),
  report: {
    report_md: EXAMPLE_REPORT_MD,
    verdicts: EXAMPLE_VERDICTS,
    hypotheses: EXAMPLE_HYPOTHESES,
    accuracy_meta: null,
    tokens_used: 18342,
    tool_calls_used: 7,
    created_at: new Date().toISOString(),
  },
};

const MARKDOWN_ONLY_INCIDENT: IncidentDetail = {
  ...BASE,
  status: "done",
  finished_at: new Date().toISOString(),
  report: {
    report_md: EXAMPLE_REPORT_MD,
    verdicts: null,
    hypotheses: null,
    accuracy_meta: null,
    tokens_used: 12000,
    tool_calls_used: 5,
    created_at: new Date().toISOString(),
  },
};

const RUNNING_INCIDENT: IncidentDetail = {
  ...BASE,
  status: "running",
  finished_at: null,
  report: null,
};

function renderPage() {
  return render(
    <ToastProvider>
      <IncidentPage />
    </ToastProvider>,
  );
}

describe("incident report page", () => {
  it("renders a completed report as a document with root cause, evidence, and hypotheses", () => {
    state.incident = DONE_INCIDENT;
    renderPage();

    // Verdict header: kicker + headline (best accepted verdict's reasoning).
    // The same reasoning also appears as the confirmed hypothesis's reason
    // text below, so allow more than one match.
    expect(screen.getByText(/root cause · verified/i)).toBeDefined();
    expect(screen.getAllByText(/pydantic validationerror/i).length).toBeGreaterThan(0);

    // Evidence: first two citations render as EvidenceQuote blocks (the same
    // citation text also appears inline in the markdown body, so allow more
    // than one match), the remaining two collapse behind a "+ N more" toggle.
    expect(screen.getAllByText("app.log:1042").length).toBeGreaterThan(0);
    expect(screen.getAllByText("app.log:1044").length).toBeGreaterThan(0);
    const more = screen.getByRole("button", { name: /\+ 2 more/i });
    fireEvent.click(more);
    expect(screen.getAllByText("commit 9f3c2e1 api/config.py:18").length).toBeGreaterThan(0);

    // Hypotheses checked: accepted hypothesis is expanded by default.
    expect(screen.getByText(/dropped the DB_URL fallback/i)).toBeDefined();
    expect(screen.getByText(/down or unreachable/i)).toBeDefined();

    // Status chip reflects incident status.
    expect(screen.getByText("Done")).toBeDefined();
  });

  it("falls back to markdown when verdicts and hypotheses are null", () => {
    state.incident = MARKDOWN_ONLY_INCIDENT;
    renderPage();

    // Headline derives from the first non-heading markdown line; the same
    // sentence also renders in the markdown body below, so both may match.
    expect(screen.getAllByText(/crash-loops on startup/i).length).toBeGreaterThan(0);
    // The report body still renders as readable prose.
    expect(
      screen.getByRole("heading", { name: /incident report — api crash-loop after deploy/i }),
    ).toBeDefined();
    // No structured hypotheses section without hypothesis data.
    expect(screen.queryByText(/hypotheses checked/i)).toBeNull();
  });

  it("shows a live investigating state while the incident is running", () => {
    state.incident = RUNNING_INCIDENT;
    renderPage();

    expect(screen.getByText("INVESTIGATING")).toBeDefined();
    expect(screen.getByText(/beacon is investigating this incident/i)).toBeDefined();
    expect(screen.getByText(/0 tool calls used/i)).toBeDefined();
    expect(screen.getByText("Running")).toBeDefined();
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
