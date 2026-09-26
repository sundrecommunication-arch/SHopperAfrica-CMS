import { getCurrentStore } from "@/lib/tenant";
import { listPolicies } from "@/modules/policies/services/policy-service";
import { PoliciesManager } from "@/components/dashboard/policies/policies-manager";

export default async function PoliciesPage() {
  const { store } = await getCurrentStore();
  const policies = await listPolicies(store.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Policies</h1>
        <p className="text-muted-foreground text-sm">
          Privacy, returns, shipping, and terms — start from the template, edit it to match how
          your store actually works, then publish when you are ready. Nothing here is visible to
          customers until you publish it.
        </p>
      </div>
      <PoliciesManager
        policies={policies.map((p) => ({
          type: p.type,
          title: p.title,
          content: p.content,
          isPublished: p.isPublished,
        }))}
      />
    </div>
  );
}
