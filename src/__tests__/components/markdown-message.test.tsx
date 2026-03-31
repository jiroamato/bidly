import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MarkdownMessage } from "@/components/markdown-message";

Object.assign(navigator, {
  clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
});

describe("MarkdownMessage", () => {
  it("renders plain text", () => {
    render(<MarkdownMessage content="Hello world" />);
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("renders bold text", () => {
    render(<MarkdownMessage content="This is **bold** text" />);
    const bold = screen.getByText("bold");
    expect(bold.tagName).toBe("STRONG");
  });

  it("renders headings as h2/h3", () => {
    render(<MarkdownMessage content="## Section Title" />);
    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading).toHaveTextContent("Section Title");
  });

  it("renders unordered lists", () => {
    render(<MarkdownMessage content={"- Item one\n- Item two\n- Item three"} />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
  });

  it("renders ordered lists", () => {
    render(<MarkdownMessage content="1. First\n2. Second\n3. Third" />);
    const list = screen.getByRole("list");
    expect(list.tagName).toBe("OL");
  });

  it("renders inline code with monospace styling", () => {
    render(<MarkdownMessage content="Use `npm install` to install" />);
    const code = screen.getByText("npm install");
    expect(code.tagName).toBe("CODE");
  });

  it("renders code blocks with copy button", () => {
    render(<MarkdownMessage content={'```\nconsole.log("hello")\n```'} />);
    const copyBtn = screen.getByRole("button", { name: /copy/i });
    expect(copyBtn).toBeInTheDocument();
  });

  it("copies code block content to clipboard on copy click", async () => {
    render(<MarkdownMessage content={'```\nconst x = 1\n```'} />);
    const copyBtn = screen.getByRole("button", { name: /copy/i });
    await fireEvent.click(copyBtn);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("const x = 1");
  });

  it("renders tables", () => {
    const table = "| Col A | Col B |\n|-------|-------|\n| 1 | 2 |";
    render(<MarkdownMessage content={table} />);
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("renders empty content without crashing", () => {
    render(<MarkdownMessage content="" />);
  });

  it("shows streaming cursor when isStreaming is true", () => {
    const { container } = render(
      <MarkdownMessage content="Partial response" isStreaming={true} />
    );
    const cursor = container.querySelector("[data-streaming-cursor]");
    expect(cursor).toBeInTheDocument();
  });

  it("hides streaming cursor when isStreaming is false", () => {
    const { container } = render(
      <MarkdownMessage content="Complete response" isStreaming={false} />
    );
    const cursor = container.querySelector("[data-streaming-cursor]");
    expect(cursor).not.toBeInTheDocument();
  });
});
