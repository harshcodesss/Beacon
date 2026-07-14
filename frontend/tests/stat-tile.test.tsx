import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Histogram, StatTile } from "@/components/app/StatTile";

describe("StatTile", () => {
  it("renders label, value, and links to its href", () => {
    render(<StatTile variant="orange" href="/incidents" label="Triages" value="6" trend="Increased from last week" />);
    expect(screen.getByText("Triages")).toBeTruthy();
    expect(screen.getByText("6")).toBeTruthy();
    expect(screen.getByRole("link").getAttribute("href")).toBe("/incidents");
  });

  it("Histogram renders one bar per data point", () => {
    const { container } = render(<Histogram data={[1, 2, 3, 0]} />);
    expect(container.firstElementChild?.childElementCount).toBe(4);
  });
});
