import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProjectCard } from "@/components/app/ProjectCard";

const project = {
  id: "p1", name: "e2e-check", repo_full_name: "", log_source_type: "file",
  settings: {}, created_at: "2026-07-04T00:00:00Z", incident_count: 3,
  recent_incidents: [], accuracy: null,
  last_runs: ["done", "failed", "done"], incident_counts: { total: 3, done: 2, failed: 1 },
  last_incident_at: "2026-07-04T00:00:00Z",
} as const;

describe("ProjectCard", () => {
  it("shows the failing badge when a recent run failed", () => {
    render(<ProjectCard project={project as never} />);
    expect(screen.getByText(/failing/i)).toBeTruthy();
    const link = screen.getByRole("link", { name: /open project/i });
    expect(link.getAttribute("href")).toBe("/projects/p1");
  });
});
