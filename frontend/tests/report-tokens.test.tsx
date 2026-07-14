import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderInlineTokens } from "@/lib/reportTokens";

describe("renderInlineTokens", () => {
  it("wraps backtick spans as identifier chips and file:line as citations", () => {
    render(<p>{renderInlineTokens("removed `DB_URL` fallback, see app.log:1042", vi.fn())}</p>);
    expect(screen.getByText("DB_URL").tagName).toBe("CODE");
    expect(screen.getByText("app.log:1042").tagName).toBe("BUTTON");
  });

  it("passes the citation target to onJump", () => {
    const onJump = vi.fn();
    render(<p>{renderInlineTokens("see app.log:1042 now", onJump)}</p>);
    screen.getByText("app.log:1042").click();
    expect(onJump).toHaveBeenCalledWith("app.log:1042");
  });
});
