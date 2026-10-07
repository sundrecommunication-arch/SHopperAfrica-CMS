import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/marketing/reveal";
import { JsonLd } from "@/components/seo/json-ld";
import { COMPARISONS, REVIEWED_ON, getComparison } from "@/modules/marketing/comparisons";

export function generateStaticParams() {
  return COMPARISONS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const c = getComparison(slug);
  if (!c) return {};
  return {
    title: c.title,
    description: c.metaDescription,
    alternates: { canonical: `/compare/${c.slug}` },
    openGraph: { title: c.title, description: c.metaDescription },
  };
}

export default async function ComparisonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = getComparison(slug);
  if (!c) notFound();

  const others = COMPARISONS.filter((o) => o.slug !== c.slug);

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-24">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: c.faqs.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }}
      />

      <Reveal>
        <span className="text-sm font-semibold uppercase tracking-wide text-primary">Compare</span>
        <h1
          className="mt-2 text-3xl font-semibold tracking-tight sm:text-5xl"
          style={{ fontFamily: "var(--font-marketing-display)" }}
        >
          {c.title}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">{c.intro}</p>
      </Reveal>

      <Reveal className="mt-10 overflow-x-auto rounded-2xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="p-4 font-semibold"></th>
              <th className="p-4 font-semibold text-primary">Shopper</th>
              <th className="p-4 font-semibold capitalize">{c.competitor}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {c.rows.map((row) => (
              <tr key={row.label} className="align-top">
                <th scope="row" className="p-4 font-medium">{row.label}</th>
                <td className="p-4">{row.shopper}</td>
                <td className="p-4 text-muted-foreground">{row.other}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Reveal>

      <Reveal className="mt-10 grid gap-6 sm:grid-cols-2">
        <div className="rounded-2xl border border-primary/40 bg-primary/5 p-6">
          <h2 className="font-semibold">Choose Shopper if…</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {c.chooseShopper.map((item) => (
              <li key={item} className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-border p-6">
          <h2 className="font-semibold capitalize">{c.competitor} may suit you better if…</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {c.chooseOther.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>
      </Reveal>

      <Reveal className="mt-12">
        <h2 className="text-2xl font-semibold tracking-tight">Questions sellers ask</h2>
        <div className="mt-4 divide-y divide-border rounded-2xl border border-border">
          {c.faqs.map((f) => (
            <div key={f.q} className="p-5">
              <h3 className="font-medium">{f.q}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.a}</p>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal className="mt-12 rounded-3xl bg-primary px-6 py-12 text-center text-primary-foreground">
        <h2 className="text-2xl font-semibold sm:text-3xl" style={{ fontFamily: "var(--font-marketing-display)" }}>
          Try Shopper free — your store can be live in 10 minutes.
        </h2>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" variant="secondary">
            <Link href="/signup">Create your free store</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10">
            <Link href="/pricing">See pricing</Link>
          </Button>
        </div>
      </Reveal>

      <div className="mt-10 flex flex-wrap gap-x-4 gap-y-2 text-sm">
        <span className="text-muted-foreground">More comparisons:</span>
        {others.map((o) => (
          <Link key={o.slug} href={`/compare/${o.slug}`} className="text-primary hover:underline">
            Shopper vs <span className="capitalize">{o.competitor}</span>
          </Link>
        ))}
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Information about other products is based on their public websites as of {REVIEWED_ON} and
        may have changed. All trademarks belong to their respective owners.
      </p>
    </div>
  );
}
