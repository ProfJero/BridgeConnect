import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { BarChartCard } from "@/components/charts/bar-chart-card";
import { controlProps, Field } from "@/components/forms/field";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { SeverityBadge, StatusBadge } from "@/components/shared/status-badge";
import { Input } from "@/components/ui/input";

describe("StatusBadge", () => {
  it("never relies on colour alone: renders text and an icon", () => {
    const { container } = render(<StatusBadge status="info_requested" />);
    expect(screen.getByText("Information requested")).toBeInTheDocument();
    expect(container.querySelector("svg")).not.toBeNull();
  });
  it("humanises unknown statuses", () => {
    render(<StatusBadge status="some_new_state" />);
    expect(screen.getByText("Some new state")).toBeInTheDocument();
  });
  it("labels severities", () => {
    render(<SeverityBadge severity="critical" />);
    expect(screen.getByText("Critical")).toBeInTheDocument();
  });
});

describe("Field", () => {
  it("associates label, hint and error with the control", () => {
    render(
      <Field id="email" label="Email" required hint="We never share it." error="Enter a valid email address.">
        <Input {...controlProps("email", "Enter a valid email address.", true)} />
      </Field>,
    );
    const input = screen.getByLabelText(/Email/);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("We never share it. Enter a valid email address.");
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a valid email address.");
  });
  it("marks optional fields in text", () => {
    render(<Field id="bio" label="Bio"><Input id="bio" /></Field>);
    expect(screen.getByText("(optional)")).toBeInTheDocument();
  });
});

describe("EmptyState", () => {
  it("renders a heading, description and action", () => {
    render(<EmptyState title="No posts yet" description="Be the first." action={<button>Create</button>} />);
    expect(screen.getByRole("heading", { name: "No posts yet" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create" })).toBeInTheDocument();
  });
});

describe("Pagination", () => {
  it("preserves filters and exposes prev/next links", () => {
    render(<Pagination page={2} pageSize={10} total={35} basePath="/jobs" searchParams={{ q: "farm", community: "abc" }} />);
    const nav = screen.getByRole("navigation", { name: "Pagination" });
    expect(within(nav).getByText("Page 2 of 4")).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: /Previous/ })).toHaveAttribute("href", "/jobs?q=farm&community=abc");
    expect(within(nav).getByRole("link", { name: /Next/ })).toHaveAttribute("href", "/jobs?q=farm&community=abc&page=3");
  });
  it("renders nothing for a single page", () => {
    const { container } = render(<Pagination page={1} pageSize={10} total={5} basePath="/jobs" />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("BarChartCard", () => {
  it("offers a data table so values never depend on hover", async () => {
    render(<BarChartCard title="Orders per day" data={[{ label: "1 Oct", value: 3 }, { label: "2 Oct", value: 5 }]} valueLabel="Orders" />);
    await userEvent.click(screen.getByText("View data table"));
    const table = screen.getByRole("table", { name: "Orders per day" });
    expect(within(table).getByText("5")).toBeInTheDocument();
  });
  it("shows an empty state instead of an empty chart", () => {
    render(<BarChartCard title="Orders" data={[{ label: "1 Oct", value: 0 }]} />);
    expect(screen.getByText("No data for this period yet.")).toBeInTheDocument();
  });
});
