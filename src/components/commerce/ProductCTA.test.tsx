import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ProductCTA from "./ProductCTA";

vi.mock("@/components/commerce/BuyNowButton", () => ({
  default: () => <span>Buy now</span>,
}));

describe("public offer call to action", () => {
  it("never displays author setup instructions when an offer has no price", () => {
    render(
      <ProductCTA
        authorNodeId="test-node"
        authorId="test-author"
        effectivePrice={null}
        stripeReady={false}
        productTitle="Workbook"
      />,
    );
    expect(screen.getByRole("button", { name: /coming soon: notify me/i })).toBeInTheDocument();
    expect(screen.queryByText(/set a price|price not set|payments not set up/i)).not.toBeInTheDocument();
  });
});