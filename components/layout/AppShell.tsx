/**
 * AppShell — shared layout for all authenticated pages.
 *
 * Replaces the repeated `<WorkshopSidebar /> + <main>` boilerplate in each view.
 * Every protected view renders its own content as children; the shell provides
 * the sidebar, the global top navigation bar, and the page scroll container.
 *
 *  ┌─────────────┬──────────────────────────────────────┐
 *  │             │  TopBar (user name, avatar, menu)    │
 *  │  Sidebar    ├──────────────────────────────────────┤
 *  │             │  <children> (page-specific content)  │
 *  └─────────────┴──────────────────────────────────────┘
 */

import { WorkshopSidebar } from "@/features/jd-upload/components/WorkshopSidebar";
import { TopBar } from "@/components/layout/TopBar";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps): React.ReactElement {
  return (
    <div className="flex h-screen overflow-hidden bg-surface-subtle">
      <WorkshopSidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />

        <main className="flex-1 overflow-auto px-6 py-8 lg:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}
