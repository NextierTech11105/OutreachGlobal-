import type React from "react";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-zinc-950">
      <AdminSidebar />
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
