import type { BaseBuilderStepProps } from "../shared/builder-types";

export interface UpsellStepProps extends BaseBuilderStepProps {}

export type FunnelType = "post-purchase-upsell" | "exit-intent-downsell" | "order-bump" | "bundle-offer";

export const FUNNEL_TYPE_LABELS: Record<FunnelType, string> = {
  "post-purchase-upsell": "Post-Purchase Upsell",
  "exit-intent-downsell": "Exit-Intent Downsell",
  "order-bump": "Order Bump",
  "bundle-offer": "Bundle Offer",
};

export const FUNNEL_TYPE_DESCRIPTIONS: Record<FunnelType, string> = {
  "post-purchase-upsell": "Shown immediately after purchase — 'Add this for a special price'",
  "exit-intent-downsell": "Triggered when customer tries to leave — 'Wait! Here's a better deal'",
  "order-bump": "Checkbox on checkout page — 'Add this for just $X more'",
  "bundle-offer": "Combine multiple products at a discount — 'Get everything for one price'",
};

export interface UpsellOffer {
  id: string;
  headline: string;
  productName: string;
  originalPrice: number;
  specialPrice: number;
  urgencyType: "countdown" | "limited-spots" | "one-time" | "none";
  description: string;
  includes: string[];
  edited?: boolean;
}

export interface FunnelNode {
  id: string;
  type: "purchase" | "upsell" | "downsell" | "thank-you" | "order-bump";
  label: string;
  offerId?: string;
  yesTarget?: string;
  noTarget?: string;
}
