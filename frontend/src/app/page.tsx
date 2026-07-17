import React from "react";
import GitStatusCard from "@/components/GitStatusCard";

export default function Home() {
  return (
    <div style={{ animation: "fadeIn 0.5s ease-out" }}>
      <header style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "8px", letterSpacing: "-0.02em" }}>
          Welcome to IRON
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
          Ironing Project Tracking Dashboard
        </p>
      </header>

      <div className="dashboard-grid">
        {/* Dynamic Git Status Indicator */}
        <GitStatusCard />

        {/* WIP Main App Panel */}
        <div className="card" data-testid="wip-main-app-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <span style={{ fontSize: "1.5rem" }}>🚀</span>
            <span style={{ 
              fontSize: "0.75rem", 
              fontWeight: 600, 
              background: "rgba(100, 100, 100, 0.1)", 
              color: "var(--text-secondary)",
              padding: "2px 8px",
              borderRadius: "12px"
            }}>
              WIP
            </span>
          </div>
          <h2 className="card-title">Main Application</h2>
          <p className="card-desc">
            This module is currently under development. No data is active at this time.
          </p>
        </div>

        {/* WIP Company Info Panel */}
        <div className="card" data-testid="wip-company-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <span style={{ fontSize: "1.5rem" }}>🏢</span>
            <span style={{ 
              fontSize: "0.75rem", 
              fontWeight: 600, 
              background: "rgba(100, 100, 100, 0.1)", 
              color: "var(--text-secondary)",
              padding: "2px 8px",
              borderRadius: "12px"
            }}>
              WIP
            </span>
          </div>
          <h2 className="card-title">Company Info</h2>
          <p className="card-desc">
            This module is currently under development. No data is active at this time.
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
