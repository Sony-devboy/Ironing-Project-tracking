"use client";

import React, { useEffect, useState } from "react";

type GitState = "checking" | "connected" | "disconnected" | "invalid-path" | "unconfigured";

export default function GitStatusCard() {
  const [status, setStatus] = useState<GitState>("checking");
  const [path, setPath] = useState<string>("");

  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch("/api/git-status");
        if (res.ok) {
          const data = await res.json();
          setStatus(data.state);
          if (data.path) {
            setPath(data.path);
          }
        } else {
          // If server returns a non-200 HTTP status, fall back to disconnected
          setStatus("disconnected");
        }
      } catch (e) {
        // If fetch rejects (e.g. network failure, server offline), fall back to disconnected
        setStatus("disconnected");
      }
    }
    checkStatus();
  }, []);

  // Determine dot color and animation based on status
  const getDotStyles = () => {
    switch (status) {
      case "connected":
        return {
          backgroundColor: "#2e7d32",
          animation: "pulse-green 2s infinite"
        };
      case "disconnected":
        return {
          backgroundColor: "#d32f2f",
          animation: "pulse-red 2s infinite"
        };
      case "invalid-path":
        return {
          backgroundColor: "#f57c00", // Amber/Orange
          animation: "none"
        };
      case "unconfigured":
      default:
        return {
          backgroundColor: "#8e8e93", // Muted Gray
          animation: "none"
        };
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case "checking":
        return "Checking...";
      case "connected":
        return "Connected";
      case "disconnected":
        return "Not Connected";
      case "invalid-path":
        return "Path Not Found";
      case "unconfigured":
        return "Not Configured";
    }
  };

  return (
    <div className="card" data-testid="git-status-card" data-state={status}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <span aria-hidden="true" style={{ fontSize: "1.5rem" }}>🐙</span>
        
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {status !== "checking" && (
            <span 
              className="status-dot"
              data-testid="git-status-dot"
              data-state={status}
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                display: "inline-block",
                ...getDotStyles()
              }}
            />
          )}
          <span style={{ 
            fontSize: "0.85rem", 
            fontWeight: 600, 
            color: status === "connected" ? "#2e7d32" : status === "disconnected" ? "#d32f2f" : status === "invalid-path" ? "#f57c00" : "var(--text-secondary)"
          }}>
            {getStatusLabel()}
          </span>
        </div>
      </div>
      
      <h2 className="card-title">Git Repository Status</h2>
      
      {status === "checking" && (
        <p className="card-desc">Querying target repository version control parameters...</p>
      )}
      
      {status === "connected" && (
        <>
          <p className="card-desc">The target project is initialized with Git and active.</p>
          <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "8px", overflowWrap: "anywhere" }}>
            Path: {path}
          </p>
        </>
      )}
      
      {status === "disconnected" && (
        <>
          <p className="card-desc">No Git repository is active at the target project path.</p>
          <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "8px", overflowWrap: "anywhere" }}>
            Path: {path}
          </p>
        </>
      )}
      
      {status === "invalid-path" && (
        <>
          <p className="card-desc">The configured target path does not exist on disk.</p>
          <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "8px", overflowWrap: "anywhere" }}>
            Path: {path}
          </p>
        </>
      )}
      
      {status === "unconfigured" && (
        <p className="card-desc">
          No project configured. Please set the <code>TRACKED_PROJECT_PATH</code> environment variable in your local config.
        </p>
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes pulse-red {
            0% { box-shadow: 0 0 0 0 rgba(211, 47, 47, 0.4); }
            70% { box-shadow: 0 0 0 6px rgba(211, 47, 47, 0); }
            100% { box-shadow: 0 0 0 0 rgba(211, 47, 47, 0); }
          }
          @keyframes pulse-green {
            0% { box-shadow: 0 0 0 0 rgba(46, 125, 50, 0.4); }
            70% { box-shadow: 0 0 0 6px rgba(46, 125, 50, 0); }
            100% { box-shadow: 0 0 0 0 rgba(46, 125, 50, 0); }
          }
        `
      }} />
    </div>
  );
}
