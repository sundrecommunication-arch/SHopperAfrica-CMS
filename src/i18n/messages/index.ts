import type { Locale } from "../config";
import { en, type Messages } from "./en";
import { fr } from "./fr";
import { pt } from "./pt";
import { sw } from "./sw";
import { ha } from "./ha";
import { yo } from "./yo";
import { ig } from "./ig";
import { ar } from "./ar";

export const MESSAGES: Record<Locale, Messages> = { en, fr, pt, sw, ha, yo, ig, ar };
export type { Messages };
