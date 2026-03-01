import React, { useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { DiscussionPage } from "./pages/DiscussionPage";
import { CouncilorsPage } from "./pages/CouncilorsPage";
import { HistoryPage } from "./pages/HistoryPage";
import { SettingsPage } from "./pages/SettingsPage";

export type Page = "discussion" | "history" | "councilors" | "settings";

export function App() {
  const [page, setPage] = useState<Page>("discussion");

  return (
    <div className="flex h-screen bg-background">
      <Sidebar currentPage={page} onNavigate={setPage} />
      <main className="flex-1 overflow-hidden">
        {page === "discussion" && <DiscussionPage />}
        {page === "history" && <HistoryPage />}
        {page === "councilors" && <CouncilorsPage />}
        {page === "settings" && <SettingsPage />}
      </main>
    </div>
  );
}
