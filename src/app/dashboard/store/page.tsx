import { getCurrentStore } from "@/lib/tenant";
import { StoreGeneralForm } from "@/components/dashboard/store-general-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default async function StoreSettingsPage() {
  const { store } = await getCurrentStore();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Store</h1>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>General</CardTitle>
              <CardDescription className="mt-1">
                Your store link: <a href={`/store/${store.slug}`} target="_blank" rel="noopener noreferrer" className="font-mono text-primary underline">/store/{store.slug}</a>
              </CardDescription>
            </div>
            <a
              href={`/store/${store.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors shadow-2xs"
            >
              Visit Store ↗
            </a>
          </div>
        </CardHeader>
        <CardContent>
          <StoreGeneralForm
            defaultValues={{
              name: store.name,
              description: store.description ?? "",
              contactEmail: store.contactEmail ?? "",
              contactPhone: store.contactPhone ?? "",
              whatsappNumber: store.whatsappNumber ?? "",
              whatsappEnabled: store.whatsappEnabled,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
