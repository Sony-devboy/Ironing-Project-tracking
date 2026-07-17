"use client";

import React, { useState } from "react";

type TabId = "overview" | "notes";

export default function CompanyInfoPage() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  const tabs = [
    { id: "overview" as TabId, label: "Overview", testId: "tab-overview" },
    { id: "notes" as TabId, label: "Notes", testId: "tab-notes" },
  ];

  return (
    <div style={{ animation: "fadeIn 0.5s ease-out" }}>
      <header style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "8px", letterSpacing: "-0.02em" }}>
          Company Info
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
          Overview of enterprise structure and documentation
        </p>
      </header>

      {/* Tabs Bar Selector */}
      <nav className="tabs-nav" aria-label="Company Info Subpages">
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
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "8px" }}>Company Overview</h2>
            <p style={{ color: "var(--text-secondary)" }}>Overview - WIP</p>
          </div>
        )}
        {activeTab === "notes" && (
          <div data-testid="content-notes">
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "8px" }}>Corporate Notes</h2>
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
  );
}
