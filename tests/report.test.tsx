import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ReportView, sourceLabel } from "@/components/report-view";
import { demoRecords, demoReport } from "@/lib/demo";
import { LanguageProvider } from "@/components/language-provider";

describe("source reference rendering",()=>{
  it("renders a real page when available and a section otherwise",()=>{
    expect(sourceLabel(demoReport.evidenceAgainst[0].sources[0])).toContain("p. 1");
    expect(sourceLabel(demoReport.evidenceFor[0].sources[0])).toContain("History");
  });
  it("renders every report section and selects the referenced record",()=>{
    const scrollIntoView=vi.fn();Object.defineProperty(HTMLElement.prototype,"scrollIntoView",{configurable:true,value:scrollIntoView});
    render(<LanguageProvider><ReportView report={demoReport} records={demoRecords} readOnly/></LanguageProvider>);
    expect(screen.getByText("Bottom line")).toBeInTheDocument();
    expect(screen.getByText("Evidence that does not fully fit")).toBeInTheDocument();
    expect(screen.getByText("Questions to ask the treating clinician")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button",{name:/Fictional_Sunrise_Lab_Report/})[0]);
    expect(scrollIntoView).toHaveBeenCalled();
  });
});
