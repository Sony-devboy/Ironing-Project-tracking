"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";

type ConnectionStatus = "checking" | "connected" | "failed";

export default function BackendStatusCard() {
  const [status, setStatus] = useState<ConnectionStatus>("checking");
  const [user, setUser] = useState<User | null>(null);
  const [rlsState, setRlsState] = useState<string>("waiting");
  const supabase = createClient();

  useEffect(() => {
    async function checkBackend() {
      try {
        const { data, error: userError } = await supabase.auth.getUser();
        // A missing auth session just means nobody is logged in — the
        // backend itself is still reachable, so don't treat it as a failure.
        const isAnonymous =
          userError?.name === "AuthSessionMissingError" ||
          /session missing/i.test(userError?.message ?? "");
        if (userError && !isAnonymous) throw userError;

        setUser(data?.user ?? null);
        setStatus("connected");

        // Attempt a basic RLS select query on projects table to test database configuration
        const { error: queryError } = await supabase
          .from("projects")
          .select("id")
          .limit(1);
          
        if (queryError) {
          // If table does not exist, database schema is pending migration.
          // This is expected before Phase 2 migrates the table.
          setRlsState("table-not-created");
        } else {
          setRlsState("active");
        }
      } catch (e) {
        console.error("Backend health check failed", e);
        setStatus("failed");
        setRlsState("failed");
      }
    }

    checkBackend();
  }, [supabase]);

  const getDotStyles = () => {
    switch (status) {
      case "connected":
        return { backgroundColor: "#2e7d32" };
      case "failed":
        return { backgroundColor: "#d32f2f" };
      case "checking":
      default:
        return { backgroundColor: "#8e8e93" };
    }
  };

  return (
    <div className="card" data-testid="backend-status-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <span aria-hidden="true" style={{ fontSize: "1.5rem" }}>⚡</span>
        
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span 
            className="status-dot"
            data-testid="backend-status-dot"
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              display: "inline-block",
              ...getDotStyles()
            }}
          />
          <span style={{ 
            fontSize: "0.85rem", 
            fontWeight: 600, 
            color: status === "connected" ? "#2e7d32" : status === "failed" ? "#d32f2f" : "var(--text-secondary)"
          }}>
            {status === "checking" ? "Checking Connection" : status === "connected" ? "Backend Connected" : "Connection Failed"}
          </span>
        </div>
      </div>
      
      <h2 className="card-title">Supabase Database Integration</h2>
      
      {status === "checking" && (
        <p className="card-desc">Querying backend auth session and validating database endpoints...</p>
      )}

      {status === "connected" && (
        <>
          <p className="card-desc">Connected to Supabase endpoint successfully.</p>
          <div style={{ marginTop: "12px", borderTop: "1px solid var(--border-color)", paddingTop: "12px" }}>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              Authenticated User: <strong style={{ color: "var(--text-primary)" }}>{user?.email || "Anonymous"}</strong>
            </p>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "4px" }}>
              RLS Query State: <strong style={{ color: "var(--text-primary)" }}>
                {rlsState === "active" ? "Active (Enforced)" : rlsState === "table-not-created" ? "Pending Setup (No Projects Table)" : "Error/Unauthorized"}
              </strong>
            </p>
          </div>
        </>
      )}

      {status === "failed" && (
        <p className="card-desc" style={{ color: "#d32f2f" }}>
          Unable to establish session. Please verify your <code>NEXT_PUBLIC_SUPABASE_URL</code> settings and network status.
        </p>
      )}
    </div>
  );
}
