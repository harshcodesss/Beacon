import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

import { ToastProvider } from "@/components/Toast";
import type { IncidentFeedPage, ProjectWithStats, StatsOverview } from "@/lib/types";

const STATS: StatsOverview = {
  total_incidents: 4,
  done: 3,
  failed: 1,
  active: 0,
  accuracy: { evaluated: 3, top1_rate: 1, top3_rate: 1 },
  avg_tokens: 24710.3,
  avg_tool_calls: 9.7,
};

const FEED: IncidentFeedPage = {
  items: [
    {
      id: "abc12345-0000-0000-0000-000000000000",
      project_id: "p1",
      project_name: "meetpilot-api (demo)",
      status: "done",
      trigger: "action",
      created_at: new Date(Date.now() - 3_600_000).toISOString(),
      finished_at: new Date().toISOString(),
    },
    {
      id: "def67890-0000-0000-0000-000000000000",
      project_id: "p1",
      project_name: "meetpilot-api (demo)",
      status: "failed",
      trigger: "api",
      created_at: new Date(Date.now() - 7_200_000).toISOString(),
      finished_at: new Date().toISOString(),
    },
  ],
  total: 2,
  page: 1,
  page_size: 20,
};

const PROJECTS: ProjectWithStats[] = [
  {
    id: "p1",
    name: "meetpilot-api (demo)",
    repo_full_name: "acme/meetpilot",
    log_source_type: "file",
    settings: { demo: true },
    created_at: new Date().toISOString(),
    incident_count: 4,
    recent_incidents: [],
    accuracy: { evaluated: 3, top1_rate: 1, top3_rate: 1 },
  },
];

vi.mock("@/lib/useApi", () => ({
  useBackendToken: () => "test-token",
  useApi: (path: string | null) => {
    let data: unknown = null;
    if (path?.startsWith("/stats/overview")) data = STATS;
    else if (path?.startsWith("/incidents")) data = FEED;
    else if (path?.startsWith("/projects")) data = PROJECTS;
    return { data, error: null, loading: false, refresh: () => {}, token: "test-token" };
  },
}));

import HomePage from "@/app/(app)/home/page";
import IncidentsPage from "@/app/(app)/incidents/page";

describe("home page", () => {
  it("renders aggregate stats and the recent-incidents feed", () => {
    render(
      <ToastProvider>
        <HomePage />
      </ToastProvider>,
    );
    expect(screen.getByText("4")).toBeDefined(); // total triages
    expect(screen.getAllByText("100%")).toHaveLength(2); // top-1 and top-3
    expect(screen.getByText("24,710")).toBeDefined(); // avg tokens
    expect(screen.getByText(/recent incidents/i)).toBeDefined();
    expect(screen.getAllByText("meetpilot-api (demo)")).toHaveLength(2);
    expect(screen.getByText("Done")).toBeDefined();
    expect(screen.getByText("Failed")).toBeDefined();
  });
});

describe("incidents page", () => {
  it("renders the flat list with project and status filters", () => {
    render(
      <ToastProvider>
        <IncidentsPage />
      </ToastProvider>,
    );
    expect(screen.getByLabelText(/filter by project/i)).toBeDefined();
    expect(screen.getByLabelText(/filter by status/i)).toBeDefined();
    expect(screen.getByText("2 incidents")).toBeDefined();
    const rows = screen.getAllByRole("link");
    expect(rows.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("abc12345")).toBeDefined();
  });
});
