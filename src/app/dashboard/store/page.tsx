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
          <CardTitle>General</CardTitle>
          <CardDescription>
            Your store link: <span className="font-mono">shopper.app/store/{store.slug}</span>
          </CardDescription>
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
