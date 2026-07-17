"use client";

import React, { useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import OverviewPanel from "@/components/OverviewPanel";
import FeaturesBoard from "@/components/FeaturesBoard";
import TicketsPanel from "@/components/TicketsPanel";

type TabId = "overview" | "features" | "tickets" | "notes";

export default function MainAppPage() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  const tabs = [
    { id: "overview" as TabId, label: "Overview", testId: "tab-overview" },
    { id: "features" as TabId, label: "Features", testId: "tab-features" },
    { id: "tickets" as TabId, label: "Tickets", testId: "tab-tickets" },
    { id: "notes" as TabId, label: "Notes", testId: "tab-notes" },
  ];

  return (
    <AuthGuard>
    <div style={{ animation: "fadeIn 0.5s ease-out" }}>
      <header style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "8px", letterSpacing: "-0.02em" }}>
          Main Application
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
          Core product functionality and tracking boards
        </p>
      </header>

      {/* Tabs Bar Selector */}
      <nav className="tabs-nav" aria-label="Main App Subpages">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`tab-btn ${activeTab === tab.id ? "active" : ""}`}
            data-testid={tab.testId}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Tabs Content Area */}
      <div className="tab-content" data-testid="tab-content-panel">
        {activeTab === "overview" && (
          <div data-testid="content-overview">
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "16px" }}>Project Overview</h2>
            <OverviewPanel />
          </div>
        )}
        {activeTab === "features" && (
          <div data-testid="content-features">
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "16px" }}>Features Tracking</h2>
            <FeaturesBoard />
          </div>
        )}
        {activeTab === "tickets" && (
          <div data-testid="content-tickets">
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "16px" }}>Ticket Dashboard</h2>
            <TicketsPanel />
          </div>
        )}
        {activeTab === "notes" && (
          <div data-testid="content-notes">
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "8px" }}>App Notes</h2>
            <p style={{ color: "var(--text-secondary)" }}>Notes - WIP</p>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `
      }} />
    </div>
    </AuthGuard>
  );
}
