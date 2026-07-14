import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { FunnelSelect } from "@/components/ui/FunnelSelect";

describe("SegmentedTabs", () => {
  it("marks the active tab and reports clicks", () => {
    const onChange = vi.fn();
    render(
      <SegmentedTabs
        value="all"
        onChange={onChange}
        options={[{ value: "all", label: "All", count: 6 }, { value: "failed", label: "Failed", count: 1 }]}
      />,
    );
    expect(screen.getByRole("button", { name: /All/ }).getAttribute("aria-pressed")).toBe("true");
    screen.getByRole("button", { name: /Failed/ }).click();
    expect(onChange).toHaveBeenCalledWith("failed");
  });
});

describe("FunnelSelect", () => {
  it("opens and reports a selection", () => {
    const onChange = vi.fn();
    render(
      <FunnelSelect
        label="Sort"
        value="recent"
        onChange={onChange}
        options={[
          { value: "recent", label: "Recent activity" },
          { value: "name", label: "Name" },
        ]}
      />,
    );

    // Menu is closed: only the trigger shows the current label.
    expect(screen.getAllByText("Recent activity").length).toBe(1);

    // Open the menu via the trigger button.
    fireEvent.click(screen.getByRole("button", { name: /Sort/ }));

    // Now the option also appears in the open menu.
    expect(screen.getAllByText("Recent activity").length).toBe(2);

    fireEvent.click(screen.getByText("Name"));
    expect(onChange).toHaveBeenCalledWith("name");
  });
});
