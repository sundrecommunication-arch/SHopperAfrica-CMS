"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, ChevronUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PolicyType } from "@/modules/policies/validation/schemas";

export interface PolicyItem {
  type: PolicyType;
  title: string;
  content: string;
  isPublished: boolean;
}

const POLICY_LABELS: Record<PolicyType, string> = {
  PRIVACY_POLICY: "Privacy Policy",
  RETURN_POLICY: "Return Policy",
  SHIPPING_POLICY: "Shipping / Delivery Information",
  TERMS_OF_SERVICE: "Terms of Service",
};

export function PoliciesManager({ policies }: { policies: PolicyItem[] }) {
  return (
    <div className="flex flex-col gap-4">
      {policies.map((policy) => (
        <PolicyCard key={policy.type} policy={policy} />
      ))}
    </div>
  );
}

function PolicyCard({ policy }: { policy: PolicyItem }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState(policy.title);
  const [content, setContent] = useState(policy.content);
  const [isPublished, setIsPublished] = useState(policy.isPublished);

  async function handleSave(publish?: boolean) {
    setIsSaving(true);
    try {
      const nextPublished = publish ?? isPublished;
      const res = await fetch("/api/stores/policies", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: policy.type, title, content, isPublished: nextPublished }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "Could not save policy");
        return;
      }
      setIsPublished(nextPublished);
      toast.success(nextPublished ? `${title} published.` : `${title} saved.`);
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <div className="flex items-center gap-2">
            <CardTitle>{POLICY_LABELS[policy.type]}</CardTitle>
            <Badge variant={isPublished ? "success" : "secondary"}>
              {isPublished ? "Published" : "Draft"}
            </Badge>
          </div>
          {isOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </button>
      </CardHeader>
      {isOpen && (
        <CardContent className="flex flex-col gap-4 pb-6">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${policy.type}-title`}>Page title</Label>
            <Input id={`${policy.type}-title`} value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${policy.type}-content`}>Content</Label>
            <Textarea
              id={`${policy.type}-content`}
              rows={14}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">
              This is a starting template, not legal advice — edit the bracketed placeholders and
              anything else that does not match how your store actually operates before publishing.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" disabled={isSaving} onClick={() => handleSave(false)}>
              {isSaving ? "Saving…" : "Save draft"}
            </Button>
            <Button type="button" disabled={isSaving} onClick={() => handleSave(true)}>
              {isSaving ? "Saving…" : isPublished ? "Save & keep published" : "Save & publish"}
            </Button>
            {isPublished && (
              <Button type="button" variant="ghost" disabled={isSaving} onClick={() => handleSave(false)}>
                Unpublish
              </Button>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
