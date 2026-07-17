"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";

type LoginState = "checking" | "logged-in" | "ready" | "failed";

export default function LoginStatusCard() {
  const [state, setState] = useState<LoginState>("checking");
  const [user, setUser] = useState<User | null>(null);
  const [detail, setDetail] = useState<string>("");
  const supabase = createClient();

  useEffect(() => {
    async function checkLogin() {
      try {
        // 1. Is someone already signed in?
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          setState("logged-in");
          return;
        }

        // 2. Nobody signed in — verify the GitHub OAuth provider is enabled
        // and reachable by probing the authorize endpoint without following
        // the redirect to GitHub.
        const authorizeUrl =
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/authorize` +
          `?provider=github&redirect_to=${encodeURIComponent(`${window.location.origin}${window.location.pathname}`)}`;
        const res = await fetch(authorizeUrl, { redirect: "manual" });

        if (res.type === "opaqueredirect") {
          // Redirect to GitHub means the provider is enabled
          setState("ready");
        } else if (!res.ok) {
          const body = await res.json().catch(() => null);
          setDetail(body?.msg || body?.error_description || `HTTP ${res.status}`);
          setState("failed");
        } else {
          setState("ready");
        }
      } catch (e) {
        console.error("Login status check failed", e);
        setDetail("Could not reach the Supabase auth endpoint.");
        setState("failed");
      }
    }

    checkLogin();

    // Reflect sign-in / sign-out that happens while the card is visible
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          setState("logged-in");
        } else {
          setState((prev) => (prev === "logged-in" ? "ready" : prev));
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const getDotStyles = () => {
    switch (state) {
      case "logged-in":
        return { backgroundColor: "#2e7d32" };
      case "ready":
        return { backgroundColor: "#f57c00" };
      case "failed":
        return { backgroundColor: "#d32f2f" };
      case "checking":
      default:
        return { backgroundColor: "#8e8e93" };
    }
  };

  const getStatusLabel = () => {
    switch (state) {
      case "checking":
        return "Checking Login";
      case "logged-in":
        return "Login Working";
      case "ready":
        return "Ready — Not Signed In";
      case "failed":
        return "Login Unavailable";
    }
  };

  const getStatusColor = () => {
    switch (state) {
      case "logged-in":
        return "#2e7d32";
      case "ready":
        return "#f57c00";
      case "failed":
        return "#d32f2f";
      default:
        return "var(--text-secondary)";
    }
  };

  return (
    <div className="card" data-testid="login-status-card" data-state={state}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <span aria-hidden="true" style={{ fontSize: "1.5rem" }}>🔐</span>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            className="status-dot"
            data-testid="login-status-dot"
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              display: "inline-block",
              ...getDotStyles()
            }}
          />
          <span style={{ fontSize: "0.85rem", fontWeight: 600, color: getStatusColor() }}>
            {getStatusLabel()}
          </span>
        </div>
      </div>

      <h2 className="card-title">GitHub Login Status</h2>

      {state === "checking" && (
        <p className="card-desc">Checking the current session and OAuth provider availability...</p>
      )}

      {state === "logged-in" && (
        <>
          <p className="card-desc">GitHub OAuth login is working.</p>
          <div style={{ marginTop: "12px", borderTop: "1px solid var(--border-color)", paddingTop: "12px" }}>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              Signed in as: <strong style={{ color: "var(--text-primary)" }}>
                {user?.user_metadata?.user_name || user?.email || "Unknown"}
              </strong>
            </p>
          </div>
        </>
      )}

      {state === "ready" && (
        <p className="card-desc">
          The GitHub provider is enabled and reachable, but nobody is signed in.
          Click <strong>Log In</strong> in the top bar to complete a full login test.
        </p>
      )}

      {state === "failed" && (
        <>
          <p className="card-desc" style={{ color: "#d32f2f" }}>
            The GitHub OAuth provider is not available. Check that it is enabled under
            Authentication → Sign In / Providers in your Supabase dashboard.
          </p>
          {detail && (
            <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "8px" }} data-testid="login-status-detail">
              Detail: {detail}
            </p>
          )}
        </>
      )}
    </div>
  );
}
