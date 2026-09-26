import { getCurrentStore } from "@/lib/tenant";
import { listFaqs } from "@/modules/faqs/services/faq-service";
import { listProducts } from "@/modules/products/services/product-service";
import { FaqManager } from "@/components/dashboard/faqs/faq-manager";

export default async function FaqsPage() {
  const { store } = await getCurrentStore();
  const [defaultFaqs, products] = await Promise.all([
    listFaqs(store.id, null),
    listProducts(store.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">FAQs</h1>
        <p className="text-muted-foreground text-sm">
          Answer the questions customers ask most. The store default list below shows on your home
          page, and on any product that doesn&apos;t have its own FAQs. Give a specific product its
          own list to show that instead — pick it from the dropdown.
        </p>
      </div>
      <FaqManager
        products={products
          .filter((p) => p.status === "ACTIVE")
          .map((p) => ({ id: p.id, name: p.name }))}
        initialDefaultFaqs={defaultFaqs.map((f) => ({ question: f.question, answer: f.answer }))}
      />
    </div>
  );
}
