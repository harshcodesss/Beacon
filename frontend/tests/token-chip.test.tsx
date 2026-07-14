import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TokenChip, CiteChip } from "@/components/ui/TokenChip";

describe("token chips", () => {
  it("renders an identifier as non-interactive mono text", () => {
    render(<TokenChip>DB_URL</TokenChip>);
    const el = screen.getByText("DB_URL");
    expect(el.tagName).toBe("CODE");
  });

  it("calls onJump when a citation is clicked", () => {
    const onJump = vi.fn();
    render(<CiteChip target="ev-1" onJump={onJump}>app.log:1042</CiteChip>);
    screen.getByText("app.log:1042").click();
    expect(onJump).toHaveBeenCalledWith("ev-1");
  });
});
