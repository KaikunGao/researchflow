import { Brand } from "@/components/layout/brand";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { WorkspaceBadge } from "@/components/layout/workspace-badge";

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      <div className="flex h-14 items-center border-b border-sidebar-border px-4">
        <Brand />
      </div>
      <SidebarNav />
      <div className="border-t border-sidebar-border p-3">
        <WorkspaceBadge />
      </div>
    </aside>
  );
}
