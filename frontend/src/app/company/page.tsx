"use client";

import React, { useState } from "react";
import AuthGuard from "@/components/AuthGuard";

type TabId = "overview" | "rules" | "meetings" | "notes";

// Fixed ownership structure — static, not editable from the UI.
const OWNERSHIP_STRUCTURE = [
  { name: "Adithya", role: "Founder", percent: 30 },
  { name: "Jai", role: "Founding Partner", percent: 30 },
  { name: "Harshit", role: "Collaborator — Marketing", percent: 10 },
  { name: "Company Bonus", role: "Reserved Pool", percent: 30 },
] as const;

// Fixed company rules — static, not editable from the UI.
const COMPANY_RULES = [
  "Company equity can only be changed when all shareholders are present.",
  "Company rules can only be changed when all shareholders are present.",
] as const;

export default function CompanyInfoPage() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  const tabs = [
    { id: "overview" as TabId, label: "Overview", testId: "tab-overview" },
    { id: "rules" as TabId, label: "Company Rules", testId: "tab-rules" },
    { id: "meetings" as TabId, label: "Meeting Records", testId: "tab-meetings" },
    { id: "notes" as TabId, label: "Notes", testId: "tab-notes" },
  ];

  return (
    <AuthGuard>
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
            <p style={{ color: "var(--text-secondary)", marginBottom: "24px" }}>
              Ownership structure of the company. This allocation is fixed.
            </p>

            <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "16px" }}>Ownership Structure</h3>

            {/* Allocation bar */}
            <div
              aria-hidden="true"
              style={{
                display: "flex",
                height: "12px",
                borderRadius: "6px",
                overflow: "hidden",
                border: "1px solid var(--border-color)",
                marginBottom: "20px",
              }}
            >
              {OWNERSHIP_STRUCTURE.map((owner, i) => (
                <div
                  key={owner.name}
                  style={{
                    width: `${owner.percent}%`,
                    background: "var(--accent-color)",
                    opacity: 1 - i * 0.22,
                  }}
                />
              ))}
            </div>

            {/* Stakeholder cards */}
            <div
              data-testid="ownership-structure"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "16px",
              }}
            >
              {OWNERSHIP_STRUCTURE.map((owner) => (
                <div
                  key={owner.name}
                  style={{
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "12px",
                    padding: "20px",
                    boxShadow: "var(--shadow)",
                  }}
                >
                  <div style={{ fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
                    {owner.percent}%
                  </div>
                  <div style={{ fontWeight: 700, marginTop: "8px" }}>{owner.name}</div>
                  <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "2px" }}>
                    {owner.role}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {activeTab === "rules" && (
          <div data-testid="content-rules">
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "8px" }}>Company Rules</h2>
            <p style={{ color: "var(--text-secondary)", marginBottom: "24px" }}>
              Governing rules of the company. These rules are fixed.
            </p>
            <ol style={{ paddingLeft: "20px", display: "grid", gap: "12px" }}>
              {COMPANY_RULES.map((rule) => (
                <li key={rule} style={{ lineHeight: 1.6 }}>
                  {rule}
                </li>
              ))}
            </ol>
          </div>
        )}
        {activeTab === "meetings" && (
          <div data-testid="content-meetings">
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "8px" }}>Meeting Records</h2>
            <p style={{ color: "var(--text-secondary)" }}>Meeting Records - WIP</p>
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
    </AuthGuard>
  );
}
