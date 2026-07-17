"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";
import { displayName, isMissingTable, recordHistory } from "@/utils/appData";

type CardState = "checking" | "anon" | "ready" | "no-tables";

export default function ProfileCard() {
  const [state, setState] = useState<CardState>("checking");
  const [user, setUser] = useState<User | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    let cancelled = false;
    async function init() {
      const { data } = await supabase.auth.getSession();
      const sessionUser = data.session?.user ?? null;
      if (cancelled) return;
      setUser(sessionUser);
      if (!sessionUser) {
        setState("anon");
        return;
      }
      // Prefill with the saved profile name, falling back to the GitHub name
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", sessionUser.id)
        .maybeSingle();
      if (cancelled) return;
      if (error && isMissingTable(error)) {
        setState("no-tables");
        return;
      }
      setDraft(profile?.display_name || displayName(sessionUser));
      setState("ready");
    }
    init();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const name = draft.trim();
    if (!user || busy) return;
    if (name.length < 2 || name.length > 40) {
      setFeedback("Name must be between 2 and 40 characters.");
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: user.id, display_name: name, updated_at: new Date().toISOString() });
      if (error) {
        setFeedback(isMissingTable(error) ? "Database setup pending — run supabase/setup.sql first." : "Could not save your name. Try again.");
        return;
      }
      // Also store it in auth metadata so new rows use it immediately
      await supabase.auth.updateUser({ data: { display_name: name } });
      await recordHistory(supabase, user, "updated_display_name", "profile", name);
      setFeedback("Saved! Your name is updated everywhere.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" data-testid="profile-card">
      <span aria-hidden="true" style={{ fontSize: "1.5rem", display: "block", marginBottom: "12px" }}>👤</span>
      <h2 className="card-title">Display Name</h2>

      {state === "checking" && <p className="card-desc">Loading profile...</p>}

      {state === "anon" && (
        <p className="card-desc">Log in to choose the name shown on your chats, tickets, and history entries.</p>
      )}

      {state === "no-tables" && (
        <p className="card-desc">Database setup pending — run <code>supabase/setup.sql</code> first.</p>
      )}

      {state === "ready" && (
        <>
          <p className="card-desc" style={{ marginBottom: "12px" }}>
            This name is shown on your chats, tickets, features, and history entries — changing it updates them everywhere.
          </p>
          <form onSubmit={save} style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <input
              className="input-field"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={40}
              style={{ flexGrow: 1, minWidth: "160px", width: "auto" }}
              data-testid="profile-name-input"
              aria-label="Display name"
            />
            <button
              type="submit"
              className="btn-primary"
              disabled={busy || draft.trim().length < 2}
              data-testid="profile-save-btn"
            >
              Save
            </button>
          </form>
          {feedback && (
            <p style={{ fontSize: "0.8rem", marginTop: "10px", color: feedback.startsWith("Saved") ? "#2e7d32" : "#d32f2f" }} data-testid="profile-feedback">
              {feedback}
            </p>
          )}
        </>
      )}
    </div>
  );
}
