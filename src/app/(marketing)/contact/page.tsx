import type { Metadata } from "next";
import { Mail, MapPin } from "lucide-react";

import { ContactForm } from "@/components/marketing/contact-form";
import { Reveal } from "@/components/marketing/reveal";

export const metadata: Metadata = { title: "Contact us" };

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
      <Reveal className="mx-auto max-w-2xl text-center">
        <h1
          className="text-4xl font-semibold tracking-tight sm:text-5xl"
          style={{ fontFamily: "var(--font-marketing-display)" }}
        >
          Talk to us.
        </h1>
        <p className="mt-4 text-muted-foreground">
          Questions about setting up your store, ads, or anything else — we read every message.
        </p>
      </Reveal>

      <Reveal className="mt-14 grid gap-10 md:grid-cols-2 md:gap-16">
        <div>
          <ContactForm />
        </div>
        <div className="flex flex-col gap-6">
          <div className="flex items-start gap-3">
            <Mail className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="font-semibold">Email</p>
              <a href="mailto:sundrecommunication@gmail.com" className="text-sm text-muted-foreground hover:text-foreground">
                sundrecommunication@gmail.com
              </a>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="font-semibold">Sundre Communications</p>
              <p className="text-sm text-muted-foreground">Lagos, Nigeria</p>
            </div>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
