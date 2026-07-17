"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "./ThemeProvider";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";

export default function Topbar() {
  const { theme, toggleTheme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function getUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
      } catch (e) {
        console.error("Failed to fetch user session", e);
      } finally {
        setLoading(false);
      }
    }
    getUser();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleSignIn = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (e) {
      console.error("Failed to sign in", e);
      alert("Failed to initiate sign in with GitHub.");
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (e) {
      console.error("Failed to sign out", e);
      setLoading(false);
    }
  };

  return (
    <header className="topbar">
      <div className="topbar-logo" data-testid="topbar-logo">
        <span style={{ 
          background: "var(--text-primary)", 
          color: "var(--bg-secondary)", 
          padding: "2px 8px", 
          borderRadius: "4px",
          fontWeight: 900
        }}>
          IRON
        </span>
        <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 500 }}>
          Project Tracking
        </span>
      </div>
      
      <div className="theme-toggle-container" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <button 
          className="theme-toggle-btn" 
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          data-testid="theme-toggle-btn"
        >
          <span>{theme === "light" ? "🌙 Dark" : "☀️ Light"}</span>
        </button>

        {loading ? (
          <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }} data-testid="auth-loading">
            Loading...
          </span>
        ) : user ? (
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }} data-testid="user-profile">
            {user.user_metadata?.avatar_url && (
              <img 
                src={user.user_metadata.avatar_url} 
                alt="Avatar" 
                style={{ width: "32px", height: "32px", borderRadius: "50%", border: "1px solid var(--border-color)" }}
                data-testid="user-avatar"
              />
            )}
            <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)" }}>
              {user.user_metadata?.user_name || user.email}
            </span>
            <button 
              className="login-btn" 
              data-testid="logout-btn"
              onClick={handleSignOut}
              style={{
                background: "transparent",
                color: "var(--text-primary)",
                border: "1px solid var(--border-color)",
                cursor: "pointer",
                padding: "8px 16px",
                fontSize: "0.875rem",
                fontWeight: 600,
                borderRadius: "20px",
                transition: "all var(--transition-speed) var(--transition-bezier)"
              }}
            >
              Sign Out
            </button>
          </div>
        ) : (
          <button 
            className="login-btn" 
            data-testid="login-btn"
            onClick={handleSignIn}
            style={{
              background: "var(--text-primary)",
              color: "var(--bg-secondary)",
              border: "none",
              cursor: "pointer",
              padding: "8px 20px",
              fontSize: "0.875rem",
              fontWeight: 600,
              borderRadius: "20px",
              boxShadow: "var(--shadow)",
              transition: "all var(--transition-speed) var(--transition-bezier)"
            }}
          >
            Log In
          </button>
        )}
      </div>
    </header>
  );
}
