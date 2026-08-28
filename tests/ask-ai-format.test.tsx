import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FormattedAnswer } from "@/components/ask-ai";

afterEach(cleanup);

describe("formatted AI answers", () => {
  it("renders headings, emphasis, bullets, and numbered steps semantically", () => {
    render(<FormattedAnswer text={"## Direct answer\n\nThis needs **clinical follow-up**.\n\n- Review the laboratory result\n- Discuss the timeline\n\n1. Prepare questions\n2. Contact the clinician"} />);
    expect(screen.getByRole("heading", { name: "Direct answer" })).toBeInTheDocument();
    expect(screen.getByText("clinical follow-up").tagName).toBe("STRONG");
    expect(screen.getAllByRole("list")).toHaveLength(2);
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
  });
});
