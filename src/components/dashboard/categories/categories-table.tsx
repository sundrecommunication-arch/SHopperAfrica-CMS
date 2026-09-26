"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FolderTree, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CategoryFormDialog, type CategoryOption } from "./category-form-dialog";

export interface CategoryListItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  imageUrl: string | null;
  productCount: number;
}

export function CategoriesTable({ categories }: { categories: CategoryListItem[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const options: CategoryOption[] = categories.map((c) => ({ id: c.id, name: c.name }));

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Delete "${name}"? Products keep their other categories.`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "Could not delete category");
        return;
      }
      toast.success(`"${name}" deleted.`);
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-14" />
          <TableHead>Name</TableHead>
          <TableHead>Parent</TableHead>
          <TableHead>Products</TableHead>
          <TableHead className="w-9" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {categories.map((category) => (
          <TableRow key={category.id}>
            <TableCell>
              <div className="relative size-10 overflow-hidden rounded-md border bg-muted">
                {category.imageUrl ? (
                  <Image src={category.imageUrl} alt="" fill className="object-cover" sizes="40px" />
                ) : (
                  <div className="flex size-full items-center justify-center">
                    <FolderTree className="size-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            </TableCell>
            <TableCell className="font-medium">{category.name}</TableCell>
            <TableCell className="text-muted-foreground">
              {category.parentId ? (categories.find((c) => c.id === category.parentId)?.name ?? "—") : "—"}
            </TableCell>
            <TableCell>{category.productCount}</TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" disabled={deletingId === category.id}>
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <CategoryFormDialog
                    categoryOptions={options}
                    initial={{
                      id: category.id,
                      name: category.name,
                      slug: category.slug,
                      description: category.description ?? "",
                      parentId: category.parentId,
                      imageUrl: category.imageUrl ?? "",
                    }}
                    trigger={
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <Pencil className="size-4" /> Edit
                      </DropdownMenuItem>
                    }
                  />
                  <DropdownMenuItem variant="destructive" onClick={() => handleDelete(category.id, category.name)}>
                    <Trash2 className="size-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
