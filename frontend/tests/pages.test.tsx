import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

import { ToastProvider } from "@/components/Toast";
import type { ActivitySeries, IncidentFeedPage, ProjectHealth, StatsOverview } from "@/lib/types";

const STATS: StatsOverview = {
  total_incidents: 4,
  done: 3,
  failed: 1,
  active: 0,
  accuracy: { evaluated: 3, top1_rate: 1, top3_rate: 1 },
  avg_tokens: 24710.3,
  avg_tool_calls: 9.7,
};

const ACTIVITY: ActivitySeries = {
  days: Array.from({ length: 14 }, (_, i) => ({
    date: new Date(Date.now() - (13 - i) * 86_400_000).toISOString(),
    total: i >= 7 ? 1 : 0,
    failed: 0,
  })),
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

const PROJECTS: ProjectHealth[] = [
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
    last_runs: ["done", "done", "failed", "done"],
    incident_counts: { total: 4, done: 3, failed: 1 },
    last_incident_at: new Date(Date.now() - 3_600_000).toISOString(),
  },
];

vi.mock("@/lib/useApi", () => ({
  useBackendToken: () => "test-token",
  useApi: (path: string | null) => {
    let data: unknown = null;
    if (path?.startsWith("/stats/overview")) data = STATS;
    else if (path?.startsWith("/stats/activity")) data = ACTIVITY;
    else if (path?.startsWith("/incidents")) data = FEED;
    else if (path?.startsWith("/projects")) data = PROJECTS;
    return { data, error: null, loading: false, refresh: () => {}, token: "test-token" };
  },
}));

vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { user: { name: "Ada Lovelace" }, backendToken: "test-token" },
    status: "authenticated",
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => {} }),
}));

import HomePage from "@/app/(app)/home/page";
import IncidentsPage from "@/app/(app)/incidents/page";

describe("home page", () => {
  it("renders the greeting, stat row, project health, and recent-incidents feed", () => {
    render(
      <ToastProvider>
        <HomePage />
      </ToastProvider>,
    );
    expect(screen.getByText(/welcome back, ada/i)).toBeDefined();
    expect(screen.getByText("Top-1 accuracy")).toBeDefined();
    expect(screen.getByText("100%")).toBeDefined(); // top-1 accuracy value
    expect(screen.getByText("24.7k")).toBeDefined(); // avg tokens
    expect(screen.getByText(/recent incidents/i)).toBeDefined();
    expect(screen.getByText(/project health/i)).toBeDefined();
    expect(screen.getAllByText("meetpilot-api (demo)")).toHaveLength(3); // 2 in feed + 1 in health panel
    expect(screen.getByText("Done")).toBeDefined();
    expect(screen.getByText("Failed")).toBeDefined();
  });
});

describe("incidents page", () => {
  it("renders the console table with status tabs and a project filter", () => {
    render(
      <ToastProvider>
        <IncidentsPage />
      </ToastProvider>,
    );
    expect(screen.getByRole("button", { name: /running/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /failed/i })).toBeDefined();
    expect(screen.getByText(/project:/i)).toBeDefined();
    const rows = screen.getAllByRole("link");
    expect(rows.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("abc12345")).toBeDefined();
  });
});
