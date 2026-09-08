import { Settings } from "lucide-react";
import { EmptyState } from "@/components/dashboard/empty-state";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <EmptyState icon={Settings} title="Store settings." description="General, WhatsApp, payments, shipping and SEO settings will live here." />
    </div>
  );
}
