import type { SiteAdapter } from "./types.js";
import { AmazonAdapter } from "./amazon.adapter.js";
import { CescAdapter } from "./cesc.adapter.js";
import { GenericFormAdapter } from "./generic-form.adapter.js";

export * from "./types.js";
export * from "./amazon.adapter.js";
export * from "./cesc.adapter.js";
export * from "./generic-form.adapter.js";

export const siteAdapters: SiteAdapter[] = [
  new AmazonAdapter(),
  new CescAdapter(),
  new GenericFormAdapter()
];

export function findMatchingAdapter(url: string): SiteAdapter | undefined {
  return siteAdapters.find((a) => a.matches(url));
}
