"use client";

import React, { useState, useEffect } from "react";
import Topbar from "./Topbar";
import Sidebar from "./Sidebar";

interface LayoutWrapperProps {
  children: React.ReactNode;
}

export default function LayoutWrapper({ children }: LayoutWrapperProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("sidebar-collapsed");
      if (stored === "true") {
        setIsCollapsed(true);
      }
    } catch (e) {
      console.error("Failed to read sidebar collapsed state", e);
    }
  }, []);

  const handleToggle = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    try {
      window.localStorage.setItem("sidebar-collapsed", String(nextState));
    } catch (e) {
      console.error("Failed to save sidebar collapsed state", e);
    }
  };

  return (
    <div className={`app-container ${isCollapsed ? "sidebar-collapsed" : ""}`} data-testid="app-container">
      <Topbar onMenuToggle={() => setMobileNavOpen((open) => !open)} />
      {mobileNavOpen && (
        <div
          className="sidebar-backdrop"
          data-testid="sidebar-backdrop"
          onClick={() => setMobileNavOpen(false)}
        />
      )}
      <Sidebar
        isCollapsed={isCollapsed}
        onToggle={handleToggle}
        mobileOpen={mobileNavOpen}
        onNavigate={() => setMobileNavOpen(false)}
      />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
