/**
 * MarkdownMessage Tests — XSS protection
 */

import { render } from "@testing-library/react";
import { screen } from "@testing-library/dom";
import { describe, it, expect } from "vitest";
import { MarkdownMessage } from "../MarkdownMessage";

describe("MarkdownMessage", () => {
  it("renders normal markdown links correctly", () => {
    render(<MarkdownMessage content="Visit [Google](https://google.com)" />);
    const link = screen.getByRole("link", { name: /Google/ });
    expect(link).toHaveAttribute("href", "https://google.com");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("neutralizes javascript: href (XSS)", () => {
    render(<MarkdownMessage content="[click me](javascript:alert(1))" />);
    const link = screen.getByRole("link", { name: /click me/ });
    expect(link).toHaveAttribute("href", "#");
  });

  it("neutralizes data: href", () => {
    render(<MarkdownMessage content="[payload](data:text/html,<script>alert(1)</script>)" />);
    const link = screen.getByRole("link", { name: /payload/ });
    expect(link).toHaveAttribute("href", "#");
  });

  it("neutralizes vbscript: href", () => {
    render(<MarkdownMessage content="[vb](vbscript:MsgBox)" />);
    const link = screen.getByRole("link", { name: /vb/ });
    expect(link).toHaveAttribute("href", "#");
  });

  it("neutralizes mixed-case JavaScript: href", () => {
    render(<MarkdownMessage content="[xss](JaVaScRiPt:void(0))" />);
    const link = screen.getByRole("link", { name: /xss/ });
    expect(link).toHaveAttribute("href", "#");
  });

  it("renders bold and code correctly", () => {
    render(<MarkdownMessage content="**bold** and `code`" />);
    expect(screen.getByText("bold")).toBeInTheDocument();
    expect(screen.getByText("code")).toBeInTheDocument();
  });

  it("renders lists correctly", () => {
    render(<MarkdownMessage content={"- item 1\n- item 2"} />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
  });

  it("strips <script> element via rehype-sanitize", () => {
    const { container } = render(
      <MarkdownMessage content='Hello <script>alert("xss")</script> world' />
    );
    // The <script> element must be stripped — text content may leak but is harmless
    expect(container.querySelector("script")).toBeNull();
  });

  it("strips <img onerror> injection via rehype-sanitize", () => {
    const { container } = render(
      <MarkdownMessage content='<img src="x" onerror="alert(1)">' />
    );
    const img = container.querySelector("img");
    // rehype-sanitize either strips the tag or removes the onerror attribute
    if (img) {
      expect(img.getAttribute("onerror")).toBeNull();
    }
  });

  it("strips <iframe> tags via rehype-sanitize", () => {
    const { container } = render(
      <MarkdownMessage content='<iframe src="https://evil.com"></iframe>' />
    );
    expect(container.querySelector("iframe")).toBeNull();
  });
});
