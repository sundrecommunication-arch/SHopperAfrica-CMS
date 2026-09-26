"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Save, Loader2 } from "lucide-react";

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface CustomerNotesEditorProps {
  customerId: string;
  initialNotes: string | null;
}

export function CustomerNotesEditor({ customerId, initialNotes }: CustomerNotesEditorProps) {
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch(`/api/customers/${customerId}/notes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notes.trim() || null }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save customer notes");

      toast.success("Customer notes saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error saving notes");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-3">
      <Textarea
        rows={4}
        placeholder="Add private merchant notes about this customer (preferences, VIP status, etc.)..."
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="text-xs"
      />
      <div className="flex justify-end">
        <Button type="submit" disabled={isSaving} size="sm" variant="outline" className="h-8 text-xs">
          {isSaving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
          ) : (
            <Save className="h-3.5 w-3.5 mr-1" />
          )}
          Save Notes
        </Button>
      </div>
    </form>
  );
}
