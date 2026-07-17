import React from "react";
import BackendStatusCard from "@/components/BackendStatusCard";
import LoginStatusCard from "@/components/LoginStatusCard";
import ProfileCard from "@/components/ProfileCard";

export default function SettingsPage() {
  return (
    <div style={{ animation: "fadeIn 0.5s ease-out" }}>
      <header style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "8px", letterSpacing: "-0.02em" }}>
          Settings
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
          Configure application variables and project defaults
        </p>
      </header>

      <div className="dashboard-grid">
        {/* Backend Connectivity Status Indicator */}
        <BackendStatusCard />

        {/* GitHub OAuth Login Status Indicator */}
        <LoginStatusCard />

        {/* Display name editor */}
        <ProfileCard />

        {/* WIP Settings Panel */}
        <div className="card" data-testid="settings-wip-card">
          <h2 className="card-title">System Settings</h2>
          <p className="card-desc">
            Settings - WIP
          </p>
        </div>
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
