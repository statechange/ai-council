import React, { useState, useEffect } from "react";
import { Sidebar } from "./components/Sidebar";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { WelcomeWizard } from "./components/WelcomeWizard";
import { DiscussionPage } from "./pages/DiscussionPage";
import { CouncilorsPage } from "./pages/CouncilorsPage";
import { HistoryPage } from "./pages/HistoryPage";
import { SettingsPage } from "./pages/SettingsPage";

export type Page = "discussion" | "history" | "councilors" | "settings";

export function App() {
  const [page, setPage] = useState<Page>("discussion");
  const [showWizard, setShowWizard] = useState<boolean | null>(null); // null = loading

  useEffect(() => {
    window.councilAPI.getConfig().then((result) => {
      const cfg = result.config;
      // Existing users: if they have backends configured or councilors registered, skip onboarding
      if (cfg.onboardingComplete) {
        setShowWizard(false);
        return;
      }
      const hasBackends = Object.values(cfg.backends || {}).some(
        (b: any) => b?.apiKey,
      );
      const hasCouncilors = cfg.councilors && Object.keys(cfg.councilors).length > 0;
      const hasEnvKeys = Object.values(result.envStatus || {}).some(Boolean);
      if (hasBackends || hasCouncilors || hasEnvKeys) {
        setShowWizard(false);
      } else {
        setShowWizard(true);
      }
    });
  }, []);

  // Still loading config
  if (showWizard === null) {
    return <div className="h-screen bg-background" />;
  }

  if (showWizard) {
    return <WelcomeWizard onComplete={() => setShowWizard(false)} />;
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar currentPage={page} onNavigate={setPage} />
      <main className="flex-1 overflow-hidden">
        <ErrorBoundary key={page} onReset={() => setPage(page)}>
          {page === "discussion" && <DiscussionPage />}
          {page === "history" && <HistoryPage />}
          {page === "councilors" && <CouncilorsPage />}
          {page === "settings" && <SettingsPage />}
        </ErrorBoundary>
      </main>
    </div>
  );
}
