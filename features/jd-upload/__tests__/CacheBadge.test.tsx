/**
 * CacheBadge tests — small indicator for whether an AI response came from
 * cache or was freshly generated.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CacheBadge } from "@/features/jd-upload/components/CacheBadge";
import type { CacheMeta } from "@/features/jd-upload/types";

describe("CacheBadge", () => {
  it("renders nothing when cache metadata is null", () => {
    const { container } = render(<CacheBadge cache={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when cache metadata is undefined", () => {
    const { container } = render(<CacheBadge cache={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the Cache Hit badge when hit is true", () => {
    const cache: CacheMeta = { hit: true, type: "extraction", tier: "file" };
    render(<CacheBadge cache={cache} />);
    expect(screen.getByText(/Cache Hit/)).toBeInTheDocument();
    expect(screen.queryByText(/Fresh AI Response/)).not.toBeInTheDocument();
  });

  it("shows the Fresh AI Response badge when hit is false", () => {
    const cache: CacheMeta = { hit: false, type: "pricing", tier: null };
    render(<CacheBadge cache={cache} />);
    expect(screen.getByText(/Fresh AI Response/)).toBeInTheDocument();
    expect(screen.queryByText(/Cache Hit/)).not.toBeInTheDocument();
  });

  it("never shows technical details like tier or type", () => {
    const cache: CacheMeta = { hit: true, type: "extraction", tier: "file" };
    render(<CacheBadge cache={cache} />);
    expect(screen.queryByText(/file/)).not.toBeInTheDocument();
    expect(screen.queryByText(/extraction/)).not.toBeInTheDocument();
  });
});
