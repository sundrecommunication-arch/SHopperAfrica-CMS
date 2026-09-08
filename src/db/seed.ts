/**
 * Seeds system data that should exist before the app is used for real —
 * currently just the built-in storefront themes (docs section 17).
 *
 * Run with: npm run db:seed
 */
import { db } from "./index";
import { themes } from "./schema";

const builtInThemes = [
  { key: "minimal", name: "Minimal", description: "Clean, neutral, works for almost any product." },
  { key: "modern", name: "Modern", description: "Bold type and generous spacing." },
  { key: "fashion", name: "Fashion", description: "Image-forward layout for apparel and accessories." },
  { key: "beauty", name: "Beauty", description: "Soft palette suited to beauty and cosmetics brands." },
  { key: "storefront", name: "Storefront", description: "A classic general-purpose retail layout." },
  { key: "restaurant", name: "Restaurant", description: "Menu-style layout for food and beverage sellers." },
  { key: "electronics", name: "Electronics", description: "Spec-forward layout for tech and gadgets." },
];

async function main() {
  for (const theme of builtInThemes) {
    await db.insert(themes).values(theme).onConflictDoNothing({ target: themes.key });
  }
  console.log(`Seeded ${builtInThemes.length} themes.`);
  process.exit(0);
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
