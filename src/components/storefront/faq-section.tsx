"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

interface FaqSectionProps {
  faqs: FaqItem[];
  /** Defaults to "Frequently Asked Questions". */
  title?: string;
}

// A plain accordion, not a component library — this project has no
// @radix-ui/react-accordion dependency, so a small piece of local state per
// row keeps this to zero new packages.
export function FaqSection({ faqs, title = "Frequently Asked Questions" }: FaqSectionProps) {
  const [openId, setOpenId] = useState<string | null>(faqs[0]?.id ?? null);

  if (faqs.length === 0) return null;

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-2">
        <HelpCircle className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold tracking-tight text-foreground">{title}</h2>
      </div>

      <div className="divide-y rounded-xl border bg-background">
        {faqs.map((faq) => {
          const isOpen = openId === faq.id;
          return (
            <div key={faq.id}>
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : faq.id)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left sm:px-6"
              >
                <span className="text-sm font-semibold text-foreground">{faq.question}</span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {isOpen && (
                <div className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed whitespace-pre-line sm:px-6">
                  {faq.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
