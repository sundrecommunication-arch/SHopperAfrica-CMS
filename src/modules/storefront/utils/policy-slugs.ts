import type { PolicyType } from "@/modules/policies/validation/schemas";

/**
 * Friendly URL slugs for each policy type, used across the storefront
 * (footer links, contact page, the policy page route itself) so store URLs
 * read as /store/acme/policies/privacy-policy rather than exposing the raw
 * PRIVACY_POLICY enum name.
 */
export const POLICY_TYPE_TO_SLUG: Record<PolicyType, string> = {
  PRIVACY_POLICY: "privacy-policy",
  RETURN_POLICY: "return-policy",
  SHIPPING_POLICY: "shipping-policy",
  TERMS_OF_SERVICE: "terms-of-service",
};

export const POLICY_SLUG_TO_TYPE: Record<string, PolicyType> = {
  "privacy-policy": "PRIVACY_POLICY",
  "return-policy": "RETURN_POLICY",
  "shipping-policy": "SHIPPING_POLICY",
  "terms-of-service": "TERMS_OF_SERVICE",
};
