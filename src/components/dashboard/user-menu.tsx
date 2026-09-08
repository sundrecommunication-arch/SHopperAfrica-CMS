"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu({ name, email }: { name?: string | null; email?: string | null }) {
  const initials = (name ?? email ?? "?").slice(0, 2).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-md p-1.5 text-sm hover:bg-sidebar-accent">
        <Avatar className="size-7">
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <span className="hidden truncate text-left lg:block">
          <span className="block font-medium leading-tight">{name ?? "Store owner"}</span>
          <span className="block text-xs text-muted-foreground leading-tight">{email}</span>
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem disabled className="opacity-100">
          <span className="flex flex-col">
            <span className="font-medium">{name ?? "Store owner"}</span>
            <span className="text-muted-foreground text-xs">{email}</span>
          </span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => signOut({ callbackUrl: "/login" })}>
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
