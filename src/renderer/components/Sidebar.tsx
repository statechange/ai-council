import React, { useState, useEffect } from "react";
import { MessageSquare, Clock, Users, Settings, Folder } from "lucide-react";
import { cn } from "../lib/utils";
import { Separator } from "../ui/separator";
import type { Page } from "../App";

const navItems: { page: Page; label: string; icon: React.ElementType }[] = [
  { page: "discussion", label: "Discussion", icon: MessageSquare },
  { page: "history", label: "History", icon: Clock },
  { page: "councilors", label: "Councilors", icon: Users },
  { page: "settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const [councilDir, setCouncilDir] = useState<string>("");

  useEffect(() => {
    window.councilAPI.getCouncilDir().then((dir) => {
      // Show the parent directory (the CWD), not the council/ subdirectory
      const parent = dir.replace(/\/council\/?$/, "");
      setCouncilDir(parent);
    });
  }, []);

  return (
    <nav className="w-56 flex flex-col border-r bg-card">
      <div className="flex items-center gap-2.5 px-4 py-5">
        <img src="./icon.png" alt="State Change" className="h-7 w-7 rounded" />
        <div>
          <h1 className="text-lg font-bold tracking-tight text-primary leading-tight">Council</h1>
          <p className="text-xs text-muted-foreground">Discussion orchestrator</p>
          {councilDir && (
            <p className="text-[10px] text-muted-foreground/60 truncate mt-0.5 flex items-center gap-1" title={councilDir}>
              <Folder className="h-2.5 w-2.5 shrink-0" />
              {councilDir.replace(/^\/Users\/[^/]+/, "~")}
            </p>
          )}
        </div>
      </div>
      <Separator />
      <div className="flex flex-col gap-1 p-2 mt-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = currentPage === item.page;
          return (
            <button
              key={item.page}
              onClick={() => onNavigate(item.page)}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
