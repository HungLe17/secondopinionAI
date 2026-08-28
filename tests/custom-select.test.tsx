import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { CustomSelect } from "@/components/custom-select";

const options = [
  { value: "en", label: "English" },
  { value: "vi", label: "Tiếng Việt" },
];

afterEach(cleanup);

function Harness() {
  const [value, setValue] = useState("en");
  return <CustomSelect id="language" value={value} placeholder="Language" options={options} onChange={setValue} />;
}

describe("custom select", () => {
  it("selects an option with pointer input", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByRole("option", { name: "Tiếng Việt" }));
    expect(screen.getByRole("combobox")).toHaveTextContent("Tiếng Việt");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("supports arrow keys, Enter, and Escape", () => {
    render(<Harness />);
    const trigger = screen.getByRole("combobox");
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    fireEvent.keyDown(trigger, { key: "Enter" });
    expect(trigger).toHaveTextContent("Tiếng Việt");
    fireEvent.click(trigger);
    fireEvent.keyDown(trigger, { key: "Escape" });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
